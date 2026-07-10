// Curated trivia question banks for tailored questions.
//
// Each entry is a self-contained "multiple-choice" question with 4 options.
// The `correct_option_index` is the answer (used by the gameplay scoring).
// `fact_key` here is just a stable label so the question generator can
// avoid placing the same bank twice in a row.
//
// Banks are intentionally hand-curated — short, factual, family-safe. The
// AI distractor pipeline (ai-distractors) is reserved for personal-fact
// questions and is NOT used here; these banks ship their own hardcoded
// distractors because topic trivia has canonical "common-mistake" answers
// (e.g., "How many points is a touchdown?" — most people guess 7 because
// of the extra point).
//
// When a question has `subject_aware: true`, the gameplay screen swaps
// the question text to one that names the current subject — the
// `question_text` field should include "{subject}" as a placeholder.

export interface TaggedQuestion {
  id: string;
  /** Set true if we want to substitute {subject} into the question text. */
  subject_aware?: boolean;
  /** Question text. May include `{subject}` placeholder when subject_aware. */
  question_text: string;
  /** Four options. The index marked `correct_option_index` is the right answer. */
  options: string[];
  correct_option_index: number;
  /** Topic tag for re-bucketing and analytics. */
  tag: string;
  /** Difficulty: 'easy' = any household should know, 'medium' = general knowledge, 'hard' = niche. */
  difficulty: "easy" | "medium" | "hard";
}

// ---------------------------------------------------------------------------
// Tag banks
// ---------------------------------------------------------------------------

const SPORTS_EASY: TaggedQuestion[] = [
  {
    id: "sports-easy-1",
    question_text: "How many points does a touchdown score in American football (not counting extra points)?",
    options: ["6", "7", "3", "10"],
    correct_option_index: 0,
    tag: "sports",
    difficulty: "easy",
  },
  {
    id: "sports-easy-2",
    question_text: "Which sport is played at Wimbledon?",
    options: ["Tennis", "Cricket", "Golf", "Rugby"],
    correct_option_index: 0,
    tag: "sports",
    difficulty: "easy",
  },
  {
    id: "sports-easy-3",
    question_text: "In basketball, how many points is a free throw worth?",
    options: ["1", "2", "3", "0"],
    correct_option_index: 0,
    tag: "sports",
    difficulty: "easy",
  },
  {
    id: "sports-easy-4",
    question_text: "What color is the card a soccer referee holds up to send a player off the field?",
    options: ["Red", "Yellow", "Blue", "Green"],
    correct_option_index: 0,
    tag: "sports",
    difficulty: "easy",
  },
  {
    id: "sports-easy-5",
    question_text: "How many players are on the field for one soccer team at the start of a match?",
    options: ["11", "9", "15", "7"],
    correct_option_index: 0,
    tag: "sports",
    difficulty: "easy",
  },
  {
    id: "sports-easy-6",
    question_text: "Which sport uses a 'birdie'?",
    options: ["Badminton", "Tennis", "Squash", "Table tennis"],
    correct_option_index: 0,
    tag: "sports",
    difficulty: "easy",
  },
  {
    id: "sports-easy-7",
    question_text: "In golf, what is one stroke under par on a hole called?",
    options: ["Birdie", "Eagle", "Bogey", "Albatross"],
    correct_option_index: 0,
    tag: "sports",
    difficulty: "easy",
  },
];

const SPORTS_MEDIUM: TaggedQuestion[] = [
  {
    id: "sports-med-1",
    question_text: "Which country has won the most FIFA World Cups?",
    options: ["Brazil", "Germany", "Argentina", "Italy"],
    correct_option_index: 0,
    tag: "sports",
    difficulty: "medium",
  },
  {
    id: "sports-med-2",
    question_text: "How many players are on a baseball team's active roster on opening day (MLB)?",
    options: ["26", "25", "30", "22"],
    correct_option_index: 0,
    tag: "sports",
    difficulty: "medium",
  },
  {
    id: "sports-med-3",
    question_text: "In what year were the modern Olympic Games first held?",
    options: ["1896", "1900", "1912", "1888"],
    correct_option_index: 0,
    tag: "sports",
    difficulty: "medium",
  },
  {
    id: "sports-med-4",
    question_text: "Which NBA team has won the most championships?",
    options: ["Boston Celtics", "Los Angeles Lakers", "Chicago Bulls", "Golden State Warriors"],
    correct_option_index: 0,
    tag: "sports",
    difficulty: "medium",
  },
  {
    id: "sports-med-5",
    question_text: "What does 'AFC' stand for in NFL?",
    options: ["American Football Conference", "Athletic Football Committee", "American Fielding Corps", "Association of Football Clubs"],
    correct_option_index: 0,
    tag: "sports",
    difficulty: "medium",
  },
];

const MUSIC_EASY: TaggedQuestion[] = [
  {
    id: "music-easy-1",
    question_text: "How many keys are on a standard piano?",
    options: ["88", "76", "61", "100"],
    correct_option_index: 0,
    tag: "music",
    difficulty: "easy",
  },
  {
    id: "music-easy-2",
    question_text: "Which instrument has 88 keys, 36 black keys, and 52 white keys?",
    options: ["Piano", "Organ", "Harpsichord", "Accordion"],
    correct_option_index: 0,
    tag: "music",
    difficulty: "easy",
  },
  {
    id: "music-easy-3",
    question_text: "How many strings does a standard guitar have?",
    options: ["6", "4", "7", "12"],
    correct_option_index: 0,
    tag: "music",
    difficulty: "easy",
  },
  {
    id: "music-easy-4",
    question_text: "What family does the trumpet belong to?",
    options: ["Brass", "Woodwind", "Strings", "Percussion"],
    correct_option_index: 0,
    tag: "music",
    difficulty: "easy",
  },
  {
    id: "music-easy-5",
    question_text: "How many lines does a musical staff have (the set of 5 horizontal lines music is written on)?",
    options: ["5", "4", "6", "7"],
    correct_option_index: 0,
    tag: "music",
    difficulty: "easy",
  },
];

const MUSIC_MEDIUM: TaggedQuestion[] = [
  {
    id: "music-med-1",
    question_text: "Which Beatles member was known as 'The Quiet One'?",
    options: ["George Harrison", "John Lennon", "Paul McCartney", "Ringo Starr"],
    correct_option_index: 0,
    tag: "music",
    difficulty: "medium",
  },
  {
    id: "music-med-2",
    question_text: "What does the musical term 'forte' mean?",
    options: ["Loud", "Soft", "Fast", "Slow"],
    correct_option_index: 0,
    tag: "music",
    difficulty: "medium",
  },
  {
    id: "music-med-3",
    question_text: "Who composed 'Für Elise'?",
    options: ["Beethoven", "Mozart", "Bach", "Chopin"],
    correct_option_index: 0,
    tag: "music",
    difficulty: "medium",
  },
  {
    id: "music-med-4",
    question_text: "What is the highest female singing voice?",
    options: ["Soprano", "Alto", "Mezzo-soprano", "Tenor"],
    correct_option_index: 0,
    tag: "music",
    difficulty: "medium",
  },
];

const MOVIES_EASY: TaggedQuestion[] = [
  {
    id: "movies-easy-1",
    question_text: "Which animated film features a clownfish named Marlin searching for his son?",
    options: ["Finding Nemo", "Shark Tale", "Moana", "The Little Mermaid"],
    correct_option_index: 0,
    tag: "movies",
    difficulty: "easy",
  },
  {
    id: "movies-easy-2",
    question_text: "Who plays Iron Man in the Marvel Cinematic Universe?",
    options: ["Robert Downey Jr.", "Chris Evans", "Mark Ruffalo", "Chris Hemsworth"],
    correct_option_index: 0,
    tag: "movies",
    difficulty: "easy",
  },
  {
    id: "movies-easy-3",
    question_text: "What 1994 movie features a lion cub named Simba?",
    options: ["The Lion King", "Jungle Book", "Tarzan", "Bambi"],
    correct_option_index: 0,
    tag: "movies",
    difficulty: "easy",
  },
  {
    id: "movies-easy-4",
    question_text: "In Star Wars, what color is Yoda?",
    options: ["Green", "Blue", "Brown", "Purple"],
    correct_option_index: 0,
    tag: "movies",
    difficulty: "easy",
  },
];

const SCIENCE_EASY: TaggedQuestion[] = [
  {
    id: "science-easy-1",
    question_text: "What planet is known as the Red Planet?",
    options: ["Mars", "Venus", "Jupiter", "Mercury"],
    correct_option_index: 0,
    tag: "science",
    difficulty: "easy",
  },
  {
    id: "science-easy-2",
    question_text: "What is H2O more commonly known as?",
    options: ["Water", "Salt", "Oxygen", "Hydrogen peroxide"],
    correct_option_index: 0,
    tag: "science",
    difficulty: "easy",
  },
  {
    id: "science-easy-3",
    question_text: "What do bees make?",
    options: ["Honey", "Milk", "Silk", "Cheese"],
    correct_option_index: 0,
    tag: "science",
    difficulty: "easy",
  },
  {
    id: "science-easy-4",
    question_text: "How many legs does an octopus have?",
    options: ["8", "6", "10", "4"],
    correct_option_index: 0,
    tag: "science",
    difficulty: "easy",
  },
];

const HISTORY_EASY: TaggedQuestion[] = [
  {
    id: "history-easy-1",
    question_text: "Who was the first President of the United States?",
    options: ["George Washington", "Thomas Jefferson", "John Adams", "Abraham Lincoln"],
    correct_option_index: 0,
    tag: "history",
    difficulty: "easy",
  },
  {
    id: "history-easy-2",
    question_text: "In what year did humans first land on the moon?",
    options: ["1969", "1972", "1965", "1981"],
    correct_option_index: 0,
    tag: "history",
    difficulty: "easy",
  },
  {
    id: "history-easy-3",
    question_text: "Which ancient civilization built the pyramids at Giza?",
    options: ["Egyptians", "Romans", "Greeks", "Mayans"],
    correct_option_index: 0,
    tag: "history",
    difficulty: "easy",
  },
];

const GEOGRAPHY_EASY: TaggedQuestion[] = [
  {
    id: "geography-easy-1",
    question_text: "What is the longest river in the world?",
    options: ["Nile", "Amazon", "Mississippi", "Yangtze"],
    correct_option_index: 0,
    tag: "geography",
    difficulty: "easy",
  },
  {
    id: "geography-easy-2",
    question_text: "Which country has the most native English speakers?",
    options: ["United States", "United Kingdom", "Canada", "Australia"],
    correct_option_index: 0,
    tag: "geography",
    difficulty: "easy",
  },
  {
    id: "geography-easy-3",
    question_text: "What is the capital of Australia?",
    options: ["Canberra", "Sydney", "Melbourne", "Brisbane"],
    correct_option_index: 0,
    tag: "geography",
    difficulty: "easy",
  },
];

const FOOD_EASY: TaggedQuestion[] = [
  {
    id: "food-easy-1",
    question_text: "What is the main ingredient in guacamole?",
    options: ["Avocado", "Tomato", "Lime", "Onion"],
    correct_option_index: 0,
    tag: "food",
    difficulty: "easy",
  },
  {
    id: "food-easy-2",
    question_text: "Which country is famous for inventing pizza?",
    options: ["Italy", "France", "Greece", "Spain"],
    correct_option_index: 0,
    tag: "food",
    difficulty: "easy",
  },
  {
    id: "food-easy-3",
    question_text: "What kind of pastry is used to make a classic croissant?",
    options: ["Puff pastry", "Shortcrust", "Filo", "Choux"],
    correct_option_index: 0,
    tag: "food",
    difficulty: "easy",
  },
];

// ---------------------------------------------------------------------------
// Subject-aware questions — these reference the subject by name. The
// question generator substitutes {subject} when it builds the round.
// ---------------------------------------------------------------------------

const OCCUPATION_QUESTIONS: TaggedQuestion[] = [
  // Used when the subject has an occupation set. The "correct" answer is
  // for the SUBJECT to verify (we ask others to guess). For multi-choice we
  // surface the occupation + 3 plausible similar fields so the game still
  // works without bespoke distractors.
  //
  // We deliberately keep these neutral — specific occupation-based
  // questions are generated by the AI at game-start time. This bank is
  // the fallback.
  {
    id: "occ-fallback",
    subject_aware: true,
    question_text: "How would you describe {subject}'s line of work?",
    options: ["Professional", "Creative", "Service", "Trades"],
    correct_option_index: 0,
    tag: "occupation",
    difficulty: "easy",
  },
];

// ---------------------------------------------------------------------------
// Aggregator
// ---------------------------------------------------------------------------

/** Map from tag to all bank questions at that tag. */
const ALL: Record<string, TaggedQuestion[]> = {
  sports: [...SPORTS_EASY, ...SPORTS_MEDIUM],
  music: [...MUSIC_EASY, ...MUSIC_MEDIUM],
  movies: MOVIES_EASY,
  science: SCIENCE_EASY,
  history: HISTORY_EASY,
  geography: GEOGRAPHY_EASY,
  food: FOOD_EASY,
  occupation: OCCUPATION_QUESTIONS,
};

/** Tags we recognize in player profiles. Drives chip suggestions in UI. */
export const AVAILABLE_TAGS = [
  "sports",
  "music",
  "movies",
  "science",
  "history",
  "geography",
  "food",
  "art",
  "gaming",
  "books",
  "nature",
  "tech",
] as const;
export type InterestTag = typeof AVAILABLE_TAGS[number];

/** Nicely-cased label for chips. */
export const TAG_LABELS: Record<InterestTag, string> = {
  sports: "Sports",
  music: "Music",
  movies: "Movies",
  science: "Science",
  history: "History",
  geography: "Geography",
  food: "Food",
  art: "Art",
  gaming: "Gaming",
  books: "Books",
  nature: "Nature",
  tech: "Tech",
};

/** Returns questions for one or more tags. Use to power the picker. */
export function questionsForTags(tags: string[]): TaggedQuestion[] {
  const out: TaggedQuestion[] = [];
  for (const t of tags) {
    const bank = ALL[t.toLowerCase()];
    if (bank) out.push(...bank);
  }
  return out;
}

/** Tags we currently have rich question banks for. UI can show this list
 * as the "supported" chip set. */
export const BANKED_TAGS: ReadonlyArray<string> = Object.freeze([
  "sports",
  "music",
  "movies",
  "science",
  "history",
  "geography",
  "food",
]);
