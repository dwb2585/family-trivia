import type { Player, PlayerFact, Question, SharedQuestion } from "./supabase";
import { DEFAULT_FACTS, QUESTIONS_PER_FACT, buildQuestionText, pickDistractors } from "./facts";
import { shuffle } from "./utils";
import { extractShortLabel } from "./sharedQuestions";

export interface GenerateInput {
  gameId: string;
  players: Player[];
  facts: PlayerFact[];
  /**
   * Shared community questions and (optionally) a flat list of all answers.
   * Each (question, answer) pair whose submitter is a current player
   * becomes a multiple-choice round: "What is [name]'s [short label]?"
   * with the answer as the correct option and answers from other current
   * players (or generic distractors) filling out the choice list.
   */
  sharedQuestions?: SharedQuestion[];
  sharedAnswers?: { question_id: string; submitted_by: string; value: string }[];
}

export type QuestionMode = "multiple-choice" | "who-said-it";

/**
 * Pick the question format based on player count.
 *
 * - 4+ players → "who-said-it": "Whose [fact] is [value]?" with a dropdown of
 *   every player in the game. Way harder and more interesting once you have
 *   enough people to actually confuse.
 * - 2-3 players → "multiple-choice": "What's X's [fact]?" with 4 fact-value
 *   options. Still works fine with a small pool.
 */
export function chooseQuestionMode(players: Player[]): QuestionMode {
  return players.length >= 4 ? "who-said-it" : "multiple-choice";
}

/**
 * Resolve the human-readable label for a default fact_key. Custom fact_keys
 * (UUIDs) carry their own context and aren't routed through here.
 */
function getLabel(factKey: string): string {
  const def = DEFAULT_FACTS.find((d) => d.key === factKey);
  return def ? def.label : factKey.replace(/_/g, " ");
}

/** Universal fallback distractors when the answer pool runs thin. */
const FALLBACK_DISTRACTORS = [
  "Yes", "No", "Maybe", "It depends",
  "Pizza", "Tacos", "Sushi", "Pancakes",
  "Beach", "Mountains", "City", "Forest",
];

/**
 * Build multiple-choice trivia questions from the players' self-reported facts
 * plus the shared community question bank.
 *
 * Variety levers per game:
 *   1. Random subject ordering (final shuffle)
 *   2. Random fact_key selection per subject (QUESTIONS_PER_FACT of 8)
 *   3. Randomized question prompt via buildQuestionText (4-5 phrasings per
 *      default key)
 *   4. Shuffled answer-option order
 *
 * For 4+ players the format flips to "who-said-it": question names the
 * fact_value ("Whose favorite movie is Jurassic Park?") and the player
 * picks from a dropdown of everyone in the game.
 *
 * Shared community questions are emitted as multiple-choice rounds (since
 * they have no inherent label) regardless of player count. They only fire
 * when the answerer is currently playing; truncated at MAX_SHARED_ROUNDS
 * to keep the overall game length bounded.
 */
const MAX_SHARED_ROUNDS = 8;

export function generateQuestions({
  gameId,
  players,
  facts,
  sharedQuestions,
  sharedAnswers,
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

  // Shuffle players first so subject ordering varies each game
  const shuffledPlayers = shuffle(players);

  for (const subject of shuffledPlayers) {
    const subjectFacts = factsByPlayer.get(subject.id) ?? [];
    // Pick QUESTIONS_PER_FACT random facts per player
    const picked = shuffle(subjectFacts).slice(0, QUESTIONS_PER_FACT);

    for (const fact of picked) {
      const label = getLabel(fact.fact_key);

      if (mode === "who-said-it") {
        // Question names the value, dropdown of player names is the answer set.
        // options[] = shuffled player names. correct_option_index = subject.
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
        // Same-category distractors: real movies for movie questions,
        // real places for vacation questions, etc. Never crosses categories
        // into the subject's other facts.
        const otherPlayersSameKey = facts
          .filter((f) => f.fact_key === fact.fact_key && f.player_id !== subject.id)
          .map((f) => f.fact_value);
        const distractors = pickDistractors(fact.fact_value, fact.fact_key, otherPlayersSameKey);

        const options = shuffle([fact.fact_value, ...distractors]);
        const correctIndex = options.indexOf(fact.fact_value);

        questions.push({
          game_id: gameId,
          question_index: idx++,
          subject_player_id: subject.id,
          fact_key: fact.fact_key,
          mode: "multiple-choice",
          question_text: buildQuestionText(subject.name, fact.fact_key),
          options,
          correct_option_index: correctIndex,
          points: 100,
        });
      }
    }
  }

  // ---- Shared community questions ----
  // For each (question, answer) where the answerer is in this game, emit
  // a multiple-choice round. Cap at MAX_SHARED_ROUNDS so a chonky Q&A bank
  // doesn't dominate the game.
  if (
    sharedQuestions &&
    sharedQuestions.length > 0 &&
    sharedAnswers &&
    sharedAnswers.length > 0
  ) {
    const nameToPlayer = new Map(players.map((p) => [p.name, p]));
    const playerNames = players.map((p) => p.name);

    // All "other" answer values from current players, across every question.
    // Used as the distractor pool once we exhaust same-question answers.
    const crossPool: string[] = [];
    for (const a of sharedAnswers) {
      if (nameToPlayer.has(a.submitted_by) && a.value.trim()) {
        crossPool.push(a.value.trim());
      }
    }

    const candidates: Omit<Question, "id">[] = [];
    for (const q of shuffle(sharedQuestions)) {
      // Subjects = everyone whose submitted an answer to THIS question AND is in the game
      const answersForQ = sharedAnswers.filter(
        (a) => a.question_id === q.id && nameToPlayer.has(a.submitted_by) && a.value.trim(),
      );
      for (const a of answersForQ) {
        const subject = nameToPlayer.get(a.submitted_by)!;
        const shortLabel = extractShortLabel(q.prompt);
        const questionText = shortLabel
          ? `What is ${subject.name}'s ${shortLabel}?`
          : `What is ${subject.name}'s answer to "${q.prompt}"?`;

        // Distractors: same-question other-answers first, then cross-question
        // answers from current players, then universal fallbacks.
        const sameQ = answersForQ
          .filter((x) => x.submitted_by !== a.submitted_by)
          .map((x) => x.value.trim());
        const crossQ = crossPool.filter(
          (v) => v.toLowerCase() !== a.value.trim().toLowerCase() && !sameQ.includes(v),
        );
        const fallbacks = FALLBACK_DISTRACTORS.filter(
          (f) => f.toLowerCase() !== a.value.trim().toLowerCase() && !sameQ.includes(f) && !crossQ.includes(f),
        );
        const distractors = shuffle([...shuffle(sameQ), ...shuffle(crossQ), ...fallbacks]).slice(0, 3);
        const options = shuffle([a.value.trim(), ...distractors]);
        const correctIndex = options.indexOf(a.value.trim());

        candidates.push({
          game_id: gameId,
          question_index: idx++,
          subject_player_id: subject.id,
          fact_key: q.id,
          mode: "multiple-choice",
          question_text: questionText,
          options,
          correct_option_index: correctIndex,
          points: 100,
        });
      }
    }
    questions.push(...shuffle(candidates).slice(0, MAX_SHARED_ROUNDS));
  }

  // Shuffle so it doesn't go player-by-player
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