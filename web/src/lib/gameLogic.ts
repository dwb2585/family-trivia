import type { Player, PlayerFact, Question, CustomQuestion } from "./supabase";
import { DEFAULT_FACTS, QUESTIONS_PER_FACT, buildQuestionText, pickDistractors } from "./facts";
import { shuffle } from "./utils";

export interface GenerateInput {
  gameId: string;
  players: Player[];
  facts: PlayerFact[];
  /**
   * Shared custom questions whose `subject_full_name` is in this game.
   * Each one becomes a who-said-it question ("Whose [label] is [value]?")
   * with the dropdown of players as the answer set.
   *
   * Pre-filtered by App.handleStart to only questions whose subject is
   * currently playing, so we can safely look up subject by name.
   */
  sharedCustomQuestions?: CustomQuestion[];
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
 * (UUIDs from the shared custom-question pool) carry their own label and
 * aren't routed through here.
 */
function getLabel(factKey: string): string {
  const def = DEFAULT_FACTS.find((d) => d.key === factKey);
  return def ? def.label : factKey.replace(/_/g, " ");
}

/**
 * Build multiple-choice trivia questions from the players' self-reported facts.
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
 * Shared custom questions (from the global pool) are appended as
 * who-said-it rounds regardless of player count, since the dropdown
 * IS the answer set and we don't have distractor banks for open-ended
 * custom labels.
 */
export function generateQuestions({
  gameId,
  players,
  facts,
  sharedCustomQuestions,
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
        // into the subject's other facts (which used to give nonsense
        // like "Popcorn" as a distractor for "favorite movie").
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

  // ---- Shared custom questions ----
  // Filter to those whose subject is currently in the game (App.handleStart
  // pre-filters, but defend in case of empty values). Always who-said-it
  // because we don't have a distractor bank for open-ended custom labels.
  if (sharedCustomQuestions && sharedCustomQuestions.length > 0) {
    const nameToPlayer = new Map(players.map((p) => [p.name, p]));
    for (const cq of sharedCustomQuestions) {
      if (!cq.value.trim()) continue; // incomplete questions don't generate
      const subject = nameToPlayer.get(cq.subject_full_name);
      if (!subject) continue; // subject isn't in this game
      const options = shuffle(players.map((p) => p.name));
      const correctIndex = options.indexOf(subject.name);
      questions.push({
        game_id: gameId,
        question_index: idx++,
        subject_player_id: subject.id,
        fact_key: cq.id,
        mode: "who-said-it",
        question_text: `Whose ${cq.label} is ${cq.value}?`,
        options,
        correct_option_index: correctIndex,
        points: 100,
      });
    }
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