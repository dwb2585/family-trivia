// AI-generated distractor fallback for the trivia game.
//
// Called by the frontend when generateQuestions runs out of plausible
// bank entries (or when the bank is empty / cross-category junk would
// otherwise leak through). Replaces the hand-curated FACT_DISTRACTORS
// path with a per-question live call to MiniMax.
//
// Auth: server-side MINIMAX_API_KEY (set via `supabase secrets set`).
// Never exposed to the client. Costs ~$0.001 per call.
//
// Request:
//   POST /functions/v1/ai-distractors
//   { subjectName: string, factKey: string, factLabel?: string,
//     factValue: string, count?: number, theme?: string }
//
// Response:
//   { distractors: string[], source: "ai" }

import { corsHeaders } from "../_shared/cors.ts";

const MINIMAX_BASE = Deno.env.get("MINIMAX_BASE_URL") || "https://api.minimax.io/v1";
const MINIMAX_API_KEY = Deno.env.get("MINIMAX_API_KEY");
const MINIMAX_MODEL = Deno.env.get("MINIMAX_MODEL") || "MiniMax-M3";

interface RequestBody {
  subjectName?: string;
  factKey?: string;
  factLabel?: string;
  factValue?: string;
  count?: number;
  theme?: string;
}

interface ChatResp {
  choices?: { message?: { content?: string } }[];
}

function buildPrompt(body: RequestBody): string {
  const label = body.factLabel || body.factKey || "this fact";
  const correct = body.factValue || "";
  const count = Math.min(Math.max(body.count ?? 3, 1), 5);
  const subject = body.subjectName ? ` (about ${body.subjectName})` : "";
  return [
    `Generate ${count} plausible wrong answers for a multiple-choice trivia question${subject}.`,
    ``,
    `Question category: ${label}`,
    `Correct answer: "${correct}"`,
    body.theme ? `Game theme/context: ${body.theme}` : ``,
    ``,
    `Constraints:`,
    `- All distractors must be in the same category as the correct answer (e.g. if it's about favorite food, all distractors must be foods).`,
    `- Distractors must be different from each other.`,
    `- Distractors must be different from the correct answer "${correct}".`,
    `- Distractors should sound natural and plausibly wrong — like a real person might pick if they didn't know.`,
    `- Keep each distractor short (1-4 words).`,
    ``,
    `Reply ONLY with a JSON array of ${count} strings. No markdown, no explanation, no preamble.`,
  ].filter(Boolean).join("\n");
}

function parseDistractors(text: string): string[] {
  const trimmed = text.trim();
  // Strip markdown fences if the model adds them anyway.
  const stripped = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "");

  // Try to find the first JSON array anywhere in the response. Helps
  // when the model adds preamble like "Sure, here you go:" before the
  // actual JSON.
  const arrayMatch = stripped.match(/\[[\s\S]*?\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((s) => typeof s === "string" && s.trim())
          .map((s) => String(s).trim());
      }
    } catch {
      // JSON-extract regex matched but parse failed — fall through.
    }
  }

  // Try the whole response as JSON (in case it's a bare array already).
  try {
    const parsed = JSON.parse(stripped);
    if (Array.isArray(parsed)) {
      return parsed.filter((s) => typeof s === "string" && s.trim()).map((s) => String(s).trim());
    }
  } catch {
    // fall through to line-splitting
  }

  // Last resort: split on newlines, strip bullets/numbers/quotes.
  return trimmed
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\-\*\d\.\)\s]+/, "").replace(/^["']|["']$/g, "").trim())
    .filter((l) => l.length > 0 && l.length < 80);
}

Deno.serve(async (req: Request) => {
  // CORS preflight — same pattern as supabase functions default.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!MINIMAX_API_KEY) {
    return new Response(
      JSON.stringify({ error: "MINIMAX_API_KEY not set on server" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!body.factKey || !body.factValue) {
    return new Response(
      JSON.stringify({ error: "factKey and factValue are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const prompt = buildPrompt(body);

  try {
    const res = await fetch(`${MINIMAX_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MINIMAX_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MINIMAX_MODEL,
        max_tokens: 200,
        temperature: 0.9,
        messages: [
          {
            role: "system",
            content: "You generate plausible wrong answers for trivia multiple-choice questions. Output is JSON only.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("MiniMax error:", res.status, errText.slice(0, 500));
      return new Response(
        JSON.stringify({ error: `MiniMax ${res.status}`, details: errText.slice(0, 200) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = (await res.json()) as ChatResp;
    const text = data.choices?.[0]?.message?.content || "";
    const distractors = parseDistractors(text);

    return new Response(
      JSON.stringify({ distractors, source: "ai" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("Edge function error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
