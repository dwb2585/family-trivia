import type { Player, PlayerFact, Question } from "./supabase";
import { DEFAULT_FACTS, QUESTIONS_PER_FACT, buildQuestionText } from "./facts";
import { shuffle } from "./utils";

export interface GenerateInput {
  gameId: string;
  players: Player[];
  facts: PlayerFact[];
}

/**
 * Build multiple-choice trivia questions from the players' self-reported facts.
 *
 * Variety levers per game:
 *   1. Random subject ordering (final shuffle)
 *   2. Random fact_key selection per subject (QUESTIONS_PER_FACT of 8)
 *   3. Randomized question prompt via buildQuestionText (4-5 phrasings per key)
 *   4. Shuffled answer-option order
 *
 * With 14 players × QUESTIONS_PER_FACT=2 = 28 questions, and ~5 prompt
 * variants per fact_key, the chance of seeing the exact same question twice
 * across two games is very low — even with identical facts.
 *
 * Distractors come from OTHER players' same-key facts (so the wrong answers
 * are people you know). Pads with the subject's other facts if there aren't
 * enough other players to fill 3 distractors.
 */
export function generateQuestions({ gameId, players, facts }: GenerateInput): Omit<Question, "id">[] {
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
      // Distractors = same fact_key from OTHER players
      const distractors: string[] = [];
      const otherFacts = facts.filter(
        (f) => f.fact_key === fact.fact_key && f.player_id !== subject.id,
      );
      for (const f of shuffle(otherFacts)) {
        if (distractors.length >= 3) break;
        if (!distractors.includes(f.fact_value)) {
          distractors.push(f.fact_value);
        }
      }
      // Pad with subject's other facts if not enough distractors
      let padIdx = 0;
      while (distractors.length < 3 && subjectFacts.length > 0) {
        const candidate = subjectFacts[padIdx % subjectFacts.length];
        padIdx++;
        if (
          candidate.fact_value !== fact.fact_value &&
          !distractors.includes(candidate.fact_value)
        ) {
          distractors.push(candidate.fact_value);
        }
        if (padIdx > 20) break; // safety
      }

      const options = shuffle([fact.fact_value, ...distractors]);
      const correctIndex = options.indexOf(fact.fact_value);

      questions.push({
        game_id: gameId,
        question_index: idx++,
        subject_player_id: subject.id,
        fact_key: fact.fact_key,
        question_text: buildQuestionText(subject.name, fact.fact_key),
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