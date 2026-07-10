// Conversational question prompts for the ChatInterview UI. Static for now —
// these are just nicer framings of the existing DEFAULT_FACTS entries, so
// the data flow remains identical (facts get stored under the same keys).
//
// Each prompt is delivered as a one-line chat bubble from the AI host. Tone:
// warm, casual, family-friendly. Don't be cringe.

export interface InterviewQuestion {
  key: string;
  label: string;
  emoji: string;
  prompt: string;
}

// Curated order — easier questions first, awkward/personal ones in the middle.
export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    key: "favorite_movie",
    label: "favorite movie",
    emoji: "🎬",
    prompt: "What's your favorite movie — the one you can watch over and over?",
  },
  {
    key: "favorite_food",
    label: "favorite food",
    emoji: "🍕",
    prompt: "If you could only eat one food for a week, what would it be?",
  },
  {
    key: "favorite_musical_artist",
    label: "favorite artist",
    emoji: "🎵",
    prompt: "Who do you listen to on repeat right now?",
  },
  {
    key: "favorite_season",
    label: "favorite season",
    emoji: "🍂",
    prompt: "Summer, fall, winter, or spring — pick your fighter.",
  },
  {
    key: "dream_vacation",
    label: "dream vacation",
    emoji: "🏝️",
    prompt: "Where would you go tomorrow if money and time didn't matter?",
  },
  {
    key: "kid_dream_job",
    label: "kid dream job",
    emoji: "🚀",
    prompt: "What did you want to be when you were little?",
  },
  {
    key: "hidden_talent",
    label: "hidden talent",
    emoji: "✨",
    prompt: "What's a weird skill you have that nobody knows about?",
  },
  {
    key: "greatest_fear",
    label: "greatest fear",
    emoji: "😱",
    prompt: "What's something that genuinely scares you? (No judgment.)",
  },
  {
    key: "guilty_pleasure",
    label: "guilty pleasure",
    emoji: "😏",
    prompt: "Confess something — what's your guilty pleasure?",
  },
  {
    key: "which_beatle",
    label: "which Beatle",
    emoji: "🎸",
    prompt: "Quick one — which Beatle are you, and why?",
  },
];
