// Default fact keys that each player fills in about themselves.
// Used both for the entry form and for question generation.

export interface FactDef {
  key: string;
  label: string;       // "Favorite movie"
  prompt: string;      // "What's your favorite movie?"
  emoji: string;
}

export const DEFAULT_FACTS: FactDef[] = [
  { key: "favorite_movie", label: "favorite movie", prompt: "What's your all-time favorite movie?", emoji: "🎬" },
  { key: "dream_vacation", label: "dream vacation", prompt: "Where's your dream vacation?", emoji: "🏝️" },
  { key: "go_to_snack", label: "go-to snack", prompt: "What's your go-to snack?", emoji: "🍿" },
  { key: "hidden_talent", label: "hidden talent", prompt: "What's a hidden talent you have?", emoji: "✨" },
  { key: "first_concert", label: "first concert", prompt: "What was your first concert?", emoji: "🎤" },
  { key: "guilty_pleasure_song", label: "guilty pleasure song", prompt: "What's your most embarrassing song you love?", emoji: "🎵" },
  { key: "kid_dream_job", label: "kid dream job", prompt: "What did you want to be when you grew up?", emoji: "🚀" },
  { key: "unpopular_opinion", label: "unpopular opinion", prompt: "What's an unpopular opinion you hold?", emoji: "🤔" },
];

/**
 * How many questions to generate per player per game.
 *
 * With 14 family members that's 14 × QUESTIONS_PER_FACT questions per game.
 * - 1 = ~14 questions, short & punchy (~3 min)
 * - 2 = ~28 questions, covers more facts per player, more variety across games (~7 min)
 * - 3 = ~42 questions, thorough (~10 min)
 *
 * Bumped to 2 so each game covers a different subset of each player's 8 facts
 * — over multiple plays, every fact_key gets asked, but rarely the same one twice.
 */
export const QUESTIONS_PER_FACT = 2;

/**
 * Multiple ways to ask about each fact key. One is picked at random per
 * question so the same fact doesn't always produce the same prompt.
 * {name} is replaced with the subject player's name.
 *
 * Goal: even when the same fact gets picked twice across games, the wording
 * is different — keeps the game from feeling memorized.
 */
export const FACT_PROMPTS: Record<string, string[]> = {
  favorite_movie: [
    "What's {name}'s favorite movie?",
    "Which movie would {name} watch first?",
    "{name}'s #1 movie of all time?",
    "If {name} could only watch one movie forever, it'd be?",
    "What's the movie {name} could quote by heart?",
  ],
  dream_vacation: [
    "Where's {name}'s dream vacation?",
    "Where would {name} go for the trip of a lifetime?",
    "{name}'s ultimate vacation destination?",
    "If money was no object, where would {name} travel?",
    "{name} is daydreaming about which destination?",
  ],
  go_to_snack: [
    "What's {name}'s go-to snack?",
    "If {name} could only eat one snack forever, it'd be?",
    "{name}'s favorite late-night snack?",
    "What does {name} grab from the pantry first?",
    "What's {name}'s comfort food?",
  ],
  hidden_talent: [
    "What's {name}'s hidden talent?",
    "What can {name} secretly do that nobody expects?",
    "What's a skill {name} has that most people don't know about?",
    "If {name} went on a talent show, what would surprise everyone?",
  ],
  first_concert: [
    "What was {name}'s first concert?",
    "Who did {name} see first in concert?",
    "{name}'s first live show?",
    "What band did {name} lose their voice screaming at?",
  ],
  guilty_pleasure_song: [
    "What's {name}'s most embarrassing song?",
    "What song does {name} secretly love?",
    "{name}'s guilty-pleasure jam?",
    "Which song would {name} belt out if no one was listening?",
    "What's {name}'s secret shower anthem?",
  ],
  kid_dream_job: [
    "What did {name} want to be when they grew up?",
    "What was {name}'s childhood dream job?",
    "Little {name} wanted to be a what?",
    "What did 8-year-old {name} say they wanted to be?",
  ],
  unpopular_opinion: [
    "What's an unpopular opinion {name} holds?",
    "{name}'s most controversial take?",
    "What does {name} believe that most people don't?",
    "What's {name}'s hot take that starts arguments?",
  ],
};

/**
 * Build a randomized question text for a fact about a subject player.
 * Picks one of the FACT_PROMPTS variants for that fact_key at random.
 * Falls back to a generic template if the key isn't in the bank.
 */
export function buildQuestionText(name: string, factKey: string): string {
  const prompts = FACT_PROMPTS[factKey];
  if (!prompts || prompts.length === 0) {
    return `What is ${name}'s ${factKey.replace(/_/g, " ")}?`;
  }
  const prompt = prompts[Math.floor(Math.random() * prompts.length)];
  return prompt.replace(/\{name\}/g, name);
}