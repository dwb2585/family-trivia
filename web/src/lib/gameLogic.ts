import type { Player, PlayerFact, Question } from "./supabase";
import type { DefaultFact } from "./supabase";
import { shuffle } from "./utils";
import { pickDistractors as pickDistractorsRich } from "./facts";
import { fetchAIDistractorsBatch } from "./aiDistractors";

export interface GenerateInput {
  gameId: string;
  players: Player[];
  facts: PlayerFact[];
  /**
   * Current default-question pool (label, prompt, emoji, sort_order). Loaded
   * fresh at game-start by App.tsx so deletions/additions are picked up.
   * The function falls back to fact_key for unknown labels.
   */
  defaultFacts?: DefaultFact[];
}

export type QuestionMode = "multiple-choice" | "who-said-it";

/**
 * Pick the question format based on player count.
 *
 * - 4+ players -> "who-said-it": "Whose [fact] is [value]?" with a dropdown of
 *   every player in the game.
 * - 2-3 players -> "multiple-choice": "What's X's [fact]?" with 4 fact-value
 *   options.
 */
export function chooseQuestionMode(players: Player[]): QuestionMode {
  return players.length >= 4 ? "who-said-it" : "multiple-choice";
}

/** Pick a sensible subject pronoun/label for a fact_key (defaults to key if unknown). */
function labelFor(factKey: string, defaultFacts?: DefaultFact[]): string {
  const fromPool = defaultFacts?.find((f) => f.key === factKey);
  return fromPool?.label ?? factKey.replace(/_/g, " ");
}

/** Pick a sensible prompt for a (subject, fact_key) pair.
 *  Falls back to "What's [name]'s [label]?" if the row's prompt is missing.
 */
function promptFor(
  subjectName: string,
  factKey: string,
  defaultFacts?: DefaultFact[],
): string {
  const fromPool = defaultFacts?.find((f) => f.key === factKey);
  if (fromPool?.prompt) {
    return fromPool.prompt.replace(/\?$/, "").replace(/\byou(r)?\b/gi, `${subjectName}'s`);
  }
  return `What's ${subjectName}'s ${labelFor(factKey, defaultFacts)}?`;
}

/** Same-category distractor fallback bank when answer pool is thin. */
// `pickDistractors` is imported from `./facts` and uses the rich
// FACT_DISTRACTORS bank there. The thin in-file FALLBACK_DISTRACTORS
// below is retained only as a *last* resort for fact_keys that don't
// have an entry in FACT_DISTRACTORS and have no same-key answers from
// other players in the game — we want every multiple-choice question
// to render with 3 distractors whenever possible.

/**
 * Build trivia questions from players' facts against the current
 * default-fact pool. Variety levers:
 *   1. Random subject ordering (final shuffle)
 *   2. Random fact_key selection per subject
 *   3. Prompt comes from the pool entry (or a generic template if missing)
 *   4. Shuffled answer-option order
 *
 * For 4+ players the format flips to "who-said-it": the value is the
 * question ("Whose favorite movie is Jurassic Park?") and the player
 * picks from a dropdown of everyone in the game.
 */
const QUESTIONS_PER_FACT = 2;

export async function generateQuestions({
  gameId,
  players,
  facts,
  defaultFacts,
}: GenerateInput): Promise<Omit<Question, "id">[]> {
  const mode = chooseQuestionMode(players);

  // Map player_id -> facts[]
  const factsByPlayer = new Map<string, PlayerFact[]>();
  for (const p of players) factsByPlayer.set(p.id, []);
  for (const f of facts) {
    const list = factsByPlayer.get(f.player_id);
    if (list) list.push(f);
  }

  // ── AI distractor prefetch ───────────────────────────────────────
  // For multiple-choice games, batch-call the Supabase Edge Function
  // once per unique (factKey, factValue) tuple. The static FACT_DISTRACTORS
  // bank stays as a fallback if the AI call fails or returns nothing.
  // who-said-it mode uses player names directly — no distractors needed.
  const aiDistractorsByKeyValue = new Map<string, string[]>();
  if (mode === "multiple-choice") {
    const seen = new Set<string>();
    const requests: { factKey: string; factLabel: string; factValue: string }[] = [];
    for (const f of facts) {
      const k = `${f.fact_key}::${f.fact_value}`;
      if (seen.has(k)) continue;
      seen.add(k);
      requests.push({
        factKey: f.fact_key,
        factLabel: labelFor(f.fact_key, defaultFacts),
        factValue: f.fact_value,
      });
    }
    if (requests.length > 0) {
      try {
        const ai = await fetchAIDistractorsBatch(requests);
        for (const [k, v] of ai) aiDistractorsByKeyValue.set(k, v);
      } catch (e) {
        console.warn("AI distractor prefetch failed, using static banks:", e);
      }
    }
  }

  const questions: Omit<Question, "id">[] = [];
  let idx = 0;

  const shuffledPlayers = shuffle(players);

  for (const subject of shuffledPlayers) {
    const subjectFacts = factsByPlayer.get(subject.id) ?? [];
    const picked = shuffle(subjectFacts).slice(0, QUESTIONS_PER_FACT);

    for (const fact of picked) {
      const label = labelFor(fact.fact_key, defaultFacts);

      if (mode === "who-said-it") {
        const options = shuffle(players.map((p) => p.name));
        const correctIndex = options.indexOf(subject.name);

        questions.push({
          game_id: gameId,
          question_index: idx++,
          subject_player_id: subject.id,
          fact_key: fact.fact_key,
          mode: "who-said-it",
          question_text: `Whose ${label} is ${fact.fact_value}?`,
          options,
          correct_option_index: correctIndex,
          points: 100,
        });
      } else {
        const otherPlayersSameKey = facts
          .filter((f) => f.fact_key === fact.fact_key && f.player_id !== subject.id)
          .map((f) => f.fact_value);
        // Cross-category fallback pool: every other fact value across
        // every player in the game (excluding the correct answer). Used
        // by the rich picker if the FACT_DISTRACTORS bank is empty AND
        // no other players answered this key — guarantees the question
        // still renders with 3+ plausible-ish options.
        const otherFactValuesAcrossGame = facts
          .filter((f) => f.player_id !== subject.id)
          .map((f) => f.fact_value);
        const aiBank = aiDistractorsByKeyValue.get(`${fact.fact_key}::${fact.fact_value}`);
        const distractors = pickDistractorsRich(
          fact.fact_value,
          fact.fact_key,
          otherPlayersSameKey,
          otherFactValuesAcrossGame,
          aiBank,
        );

        const options = shuffle([fact.fact_value, ...distractors]);
        const correctIndex = options.indexOf(fact.fact_value);

        questions.push({
          game_id: gameId,
          question_index: idx++,
          subject_player_id: subject.id,
          fact_key: fact.fact_key,
          mode: "multiple-choice",
          question_text: promptFor(subject.name, fact.fact_key, defaultFacts),
          options,
          correct_option_index: correctIndex,
          points: 100,
        });
      }
    }
  }

  return shuffle(questions).map((q, i) => ({ ...q, question_index: i }));
}

/**
 * Award points for a question based on speed + correctness.
 * Correct: 100 base. First correct: bonus 50. Each second late: -5 (capped at 50).
 * Wrong: 0.
 */
export function scoreAnswer(
  isCorrect: boolean,
  msTaken: number,
  isFirstCorrect: boolean,
): number {
  if (!isCorrect) return 0;
  const base = 100;
  const firstBonus = isFirstCorrect ? 50 : 0;
  const speedBonus = Math.max(0, Math.floor((15000 - msTaken) / 100));
  return base + firstBonus + Math.min(speedBonus, 50);
}