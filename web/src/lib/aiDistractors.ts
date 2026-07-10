// Thin client wrapper around the Supabase Edge Function `ai-distractors`.
// Used by the question generator to fetch live AI distractors when the
// hand-curated FACT_DISTRACTORS bank is empty, thin, or cross-category
// would leak through.
//
// Falls back gracefully — if the call fails for any reason (network,
// missing secret, model 404), it returns `{ distractors: [], source:
// "fallback" }` and the caller uses static banks or other players'
// answers instead.

export type DistractorSource = "ai" | "fallback" | "static-only";

export interface AIDistractorResult {
  distractors: string[];
  source: DistractorSource;
  error?: string;
}

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

interface AIDistractorRequest {
  subjectName?: string;
  factKey: string;
  factLabel?: string;
  factValue: string;
  count?: number;
}

/**
 * Fetch AI-generated distractors for one (factKey, factValue) pair.
 * Best-effort: never throws — returns an empty array on failure.
 *
 * Time-budget: ~2-5s. Caller should batch with Promise.all and a
 * timeout to avoid one slow call blocking question generation.
 */
export async function fetchAIDistractors(
  req: AIDistractorRequest,
  timeoutMs = 8000,
): Promise<AIDistractorResult> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { distractors: [], source: "fallback", error: "Supabase not configured" };
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);

    const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-distractors`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ ...req, count: req.count ?? 3 }),
      signal: ctrl.signal,
    });
    clearTimeout(t);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`AI distractors returned ${res.status}:`, errText.slice(0, 200));
      return { distractors: [], source: "fallback", error: `HTTP ${res.status}` };
    }

    const data = (await res.json()) as { distractors?: string[]; source?: string; error?: string };
    if (data.error) {
      return { distractors: [], source: "fallback", error: data.error };
    }
    const distractors = (data.distractors ?? [])
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      .slice(0, 6); // safety cap
    return { distractors, source: "ai" };
  } catch (e) {
    const err = (e as Error)?.message ?? "unknown";
    console.warn("AI distractors fetch failed:", err);
    return { distractors: [], source: "fallback", error: err };
  }
}

/**
 * Batch version — call once per unique (factKey, factValue) tuple.
 * Used by `generateQuestions` to fill in AI distractors for every
 * question that needs them. Each call is independent and best-effort.
 */
export async function fetchAIDistractorsBatch(
  items: AIDistractorRequest[],
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  if (items.length === 0) return out;
  const results = await Promise.all(
    items.map(async (item) => {
      const key = `${item.factKey}::${item.factValue}`;
      const r = await fetchAIDistractors(item, 8000);
      return [key, r] as const;
    }),
  );
  for (const [key, r] of results) {
    if (r.distractors.length > 0) out.set(key, r.distractors);
  }
  return out;
}
