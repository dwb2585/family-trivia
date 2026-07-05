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

// How many questions to generate per fact for each player.
// Lower = shorter game. Higher = more about each player.
export const QUESTIONS_PER_FACT = 1;