// Default fact keys that each player fills in about themselves.
// Used both for the entry form and for question generation.

import { shuffle } from "./utils";

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

/**
 * Plausible wrong-answer bank per fact_key. Used for multiple-choice
 * distractors so options stay relevant to the question category
 * (e.g., real movies for "favorite movie", real vacation spots for
 * "dream vacation") instead of crossing categories into other facts.
 *
 * The correct answer is excluded at runtime if it's already in the bank.
 * For open-ended keys (unpopular_opinion) the bank is intentionally
 * empty — we fall back to other players' same-key answers, which are
 * also real opinions and thus plausible distractors.
 *
 * Edit freely — these are just wrong-answer pools, no game logic.
 */
export const FACT_DISTRACTORS: Record<string, string[]> = {
  favorite_movie: [
    "The Matrix", "Inception", "Titanic", "The Godfather", "Pulp Fiction",
    "Forrest Gump", "Star Wars", "Jurassic Park", "The Dark Knight",
    "Back to the Future", "The Lion King", "E.T.", "Avatar", "Frozen",
    "Toy Story", "The Avengers", "Spider-Man", "Shrek", "Finding Nemo",
    "Up", "WALL-E", "Gladiator", "Braveheart", "Rocky", "Top Gun",
    "The Princess Bride", "Casablanca", "Raiders of the Lost Ark",
    "Ghostbusters", "Jaws", "Grease", "Dirty Dancing", "Pretty Woman",
  ],
  dream_vacation: [
    "Hawaii", "Paris", "Tokyo", "Bali", "the Maldives", "Iceland",
    "New Zealand", "Italy", "Greece", "the Swiss Alps", "Maui",
    "the Bahamas", "Costa Rica", "Thailand", "Egypt", "Australia",
    "the Norwegian fjords", "an African safari", "Machu Picchu",
    "the Galápagos", "Croatia", "Portugal", "Ireland", "Scotland",
    "Japan", "Vietnam", "Morocco", "Argentina", "Patagonia",
  ],
  go_to_snack: [
    "Popcorn", "Chips", "Ice cream", "Chocolate", "Cookies",
    "Pretzels", "Trail mix", "Cheese & crackers", "Fresh fruit",
    "A granola bar", "Pizza", "Nachos", "Candy", "Donuts",
    "Brownies", "Chex mix", "Goldfish crackers", "Cheese puffs",
    "Mixed nuts", "Dried mango", "Banana bread", "Yogurt",
    "String cheese", "Apples with peanut butter", "Rice cakes",
  ],
  hidden_talent: [
    "Whistling really loudly", "Juggling", "Touch typing", "Yodeling",
    "Speed-solving a Rubik's cube", "Impressions", "Cartoon voices",
    "Doing a backflip", "Tongue roll", "Wiggling my ears",
    "Beatboxing", "Moonwalking", "Card tricks", "Coin tricks",
    "Pen spinning", "Knife throwing (safely)", "Whistling through a blade of grass",
    "Solving a Sudoku fast", "Pinky pull-ups", "Eyebrow wiggles",
  ],
  first_concert: [
    "Taylor Swift", "Beyoncé", "Coldplay", "Ed Sheeran", "The Beatles",
    "Bruce Springsteen", "U2", "Foo Fighters", "Pink Floyd",
    "Led Zeppelin", "The Rolling Stones", "Guns N' Roses",
    "Metallica", "AC/DC", "the Eagles", "Fleetwood Mac",
    "Billy Joel", "Elton John", "Adele", "Bruno Mars",
    "Justin Bieber", "One Direction", "Drake", "Kendrick Lamar",
    "Bon Jovi", "Journey", "Queen", "Def Leppard", "Aerosmith",
  ],
  guilty_pleasure_song: [
    "Mambo No. 5", "Baby Shark", "Ice Ice Baby", "Macarena",
    "Who Let the Dogs Out", "Barbie Girl", "MMMBop", "Livin' La Vida Loca",
    "Genie in a Bottle", "Bye Bye Bye", "It's Gonna Be Me",
    "Yeah!", "Hot in Herre", "Gangnam Style", "Harlem Shake",
    "What Does the Fox Say?", "Let It Go", "All Star",
    "Fancy", "Wrecking Ball", "Friday", "Photograph",
    "Call Me Maybe", "Don't Stop Believin'", "Africa",
  ],
  kid_dream_job: [
    "Astronaut", "Firefighter", "Doctor", "Teacher", "Veterinarian",
    "Pilot", "Police officer", "Chef", "Actor", "Singer",
    "Professional athlete", "Truck driver", "Race car driver",
    "President", "Lawyer", "Scientist", "Inventor",
    "Marine biologist", "Architect", "Fashion designer",
    "YouTuber", "Video game designer", "Rock star", "Ballerina",
    "Astronaut", "Judge", "Diplomat", "Magician", "Farmer",
  ],
  // Open-ended — use other players' answers as the distractor source.
  unpopular_opinion: [],
};

/**
 * Pick plausible same-category distractors for a multiple-choice question.
 *
 * Strategy (in priority order):
 *   1. Random entries from the FACT_DISTRACTORS bank for this fact_key
 *      (real movies, real places, etc. — most natural-sounding wrong answers)
 *   2. Other players' same-key answers (also same-category, real)
 *   3. Stop if we hit 3, no fallback across categories
 *
 * If we can't get 3, the caller gets fewer distractors — that's fine,
 * the question still renders with however many we have.
 */
export function pickDistractors(
  correctValue: string,
  factKey: string,
  otherPlayersSameKey: string[],
): string[] {
  const distractors: string[] = [];
  const seen = new Set<string>([correctValue.trim().toLowerCase()]);

  function tryAdd(candidate: string) {
    const key = candidate.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      distractors.push(candidate);
    }
  }

  // 1. Bank — primary source of plausible wrong answers
  const bank = FACT_DISTRACTORS[factKey] ?? [];
  for (const b of shuffle(bank)) {
    if (distractors.length >= 3) break;
    tryAdd(b);
  }

  // 2. Other players' same-key answers — same category, also plausible
  for (const o of shuffle(otherPlayersSameKey)) {
    if (distractors.length >= 3) break;
    tryAdd(o);
  }

  return distractors;
}