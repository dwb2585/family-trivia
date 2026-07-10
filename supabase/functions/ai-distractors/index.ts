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
  let trimmed = text.trim();
  // Strip any ```{lang} ... ``` markdown code fences from the model output.
  trimmed = trimmed.replace(/```(?:json)?\s*\n?/gi, "").replace(/\n?```/g, "");
  // Strip MiniMax chain-of-thought blocks (some models leak reasoning).
  trimmed = trimmed.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // Prefer fenced code blocks first — they're the most reliable signal of
  // "this is the answer".
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    const inner = fenceMatch[1].trim();
    try {
      const parsed = JSON.parse(inner);
      if (Array.isArray(parsed)) {
        return sanitizeArray(parsed);
      }
    } catch {
      // fall through
    }
  }

  // Try the whole response as JSON (bare array).
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return sanitizeArray(parsed);
    }
  } catch {
    // fall through
  }

  // Try the first JSON array. If the rest of the text is short (a brief
  // preamble like "Sure, here:") treat it as the answer; if there's lots of
  // surrounding prose, the model is reasoning aloud — refuse and use fallback.
  const arrayMatch = trimmed.match(/\[[\s\S]*?\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed)) {
        const withoutArray = trimmed.replace(arrayMatch[0], "").trim();
        const wordsRemaining = withoutArray.split(/\s+/).filter(Boolean).length;
        if (wordsRemaining <= 8) {
          return sanitizeArray(parsed);
        }
      }
    } catch {
      // fall through
    }
  }

  // No usable JSON found — return empty so the caller uses its static fallback.
  return [];
}

function sanitizeArray(parsed: unknown[]): string[] {
  return parsed
    .filter((s) => typeof s === "string" && s.trim().length > 0 && s.trim().length < 80)
    .map((s) => String(s).trim());
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
        max_tokens: 400,
        temperature: 0.7,
        // Force JSON-output mode if the upstream supports it. MiniMax
        // OpenAI-compatible endpoint understands response_format with
        // {"type":"json_object"} (some configurations). Use it as a
        // best-effort hint.
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You generate plausible wrong answers for trivia multiple-choice questions. " +
              "Reply ONLY with a JSON array wrapped in a fenced code block (```json\\n[\\n  \"A\",\\n  \"B\",\\n  \"C\"\\n]\\n```). " +
              "Never include explanation, reasoning, or commentary — JSON array only.",
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
    if (distractors.length === 0) {
      console.log("EMPTY PARSE. Raw text:", JSON.stringify(text).slice(0, 600));
    }

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
