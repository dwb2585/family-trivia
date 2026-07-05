import type { Player, PlayerFact, Question } from "./supabase";
import { DEFAULT_FACTS, QUESTIONS_PER_FACT } from "./facts";
import { shuffle } from "./utils";

export interface GenerateInput {
  gameId: string;
  players: Player[];
  facts: PlayerFact[];
}

/**
 * Build multiple-choice trivia questions from the players' self-reported facts.
 * For each player, pick a few of their facts and create questions asking the
 * other players to guess. The subject player is excluded from answering.
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

  for (const subject of players) {
    const subjectFacts = factsByPlayer.get(subject.id) ?? [];
    // Pick QUESTIONS_PER_FACT random facts per player
    const picked = shuffle(subjectFacts).slice(0, QUESTIONS_PER_FACT);

    for (const fact of picked) {
      const def = DEFAULT_FACTS.find((d) => d.key === fact.fact_key);
      const label = def?.label ?? fact.fact_key.replace(/_/g, " ");

      // Distractors = same fact_key from OTHER players (or fallback to other facts)
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
        question_text: `What is ${subject.name}'s ${label}?`,
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
 * Correct: 100 base. First correct: bonus 50. Each second late: -5.
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