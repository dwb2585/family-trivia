import type { Player, PlayerFact, Question } from "./supabase";
import type { DefaultFact } from "./supabase";
import { shuffle } from "./utils";

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
const FALLBACK_DISTRACTORS: Record<string, string[]> = {
  favorite_movie: [
    "Jurassic Park", "The Lion King", "Spirited Away", "Mad Max: Fury Road",
    "Inception", "The Princess Bride", "Back to the Future", "Up",
  ],
  favorite_season: ["Spring", "Summer", "Autumn", "Winter"],
  favorite_food: ["Pizza", "Tacos", "Sushi", "Pasta", "Burgers", "Curry", "Salad", "Ramen"],
  favorite_song: ["Bohemian Rhapsody", "Don't Stop Believin'", "Imagine", "Hey Jude"],
  motto: ["Be kind", "Carpe diem", "Stay curious", "Live and let live"],
};

function pickDistractors(
  factKey: string,
  correctValue: string,
  otherAnswersSameKey: string[],
): string[] {
  const lowerCorrect = correctValue.trim().toLowerCase();
  const bank = FALLBACK_DISTRACTORS[factKey] ?? [];
  const pool = [
    ...otherAnswersSameKey.filter((v) => v.trim().toLowerCase() !== lowerCorrect),
    ...bank.filter((v) => v.toLowerCase() !== lowerCorrect),
  ];
  return shuffle(pool).slice(0, 3);
}

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

export function generateQuestions({
  gameId,
  players,
  facts,
  defaultFacts,
}: GenerateInput): Omit<Question, "id">[] {
  const mode = chooseQuestionMode(players);

  // Map player_id -> facts[]
  const factsByPlayer = new Map<string, PlayerFact[]>();
  for (const p of players) factsByPlayer.set(p.id, []);
  for (const f of facts) {
    const list = factsByPlayer.get(f.player_id);
    if (list) list.push(f);
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
        const distractors = pickDistractors(fact.fact_key, fact.fact_value, otherPlayersSameKey);

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