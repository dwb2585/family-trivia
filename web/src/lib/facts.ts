// Default fact keys that each player fills in about themselves.
// Used both for the entry form and for question generation.

import { shuffle } from "./utils";

export interface FactDef {
  key: string;
  label: string;       // "Favorite movie"
  prompt: string;      // "What's your favorite movie?"
  emoji: string;
}

// v3 pool — mirrors `supabase/migrations/0010_replace_pool_v3.sql`.
// Keep this in sync with the DB so profile-save key filtering (in
// `profiles.ts`) doesn't drop legitimate answers.
//
// Kind discriminator lives in the DB only (`default_facts.kind`) — clients
// that need it should join via `getDefaultFacts()`. This static array is
// the legacy fallback for save-time filtering.
export const DEFAULT_FACTS: FactDef[] = [
  // Personal-fact questions (39)
  { key: "first_concert",            label: "first concert",                  prompt: "What was the first concert you ever attended (artist name and venue)?", emoji: "🎤" },
  { key: "best_concert",             label: "best concert",                   prompt: "What was the best concert you ever attended (artist name and venue)?", emoji: "🎶" },
  { key: "favorite_food",            label: "favorite food",                  prompt: "What is your favorite food?", emoji: "🍕" },
  { key: "weirdest_food_eaten",      label: "weirdest food eaten",            prompt: "What is the weirdest thing you've ever eaten?", emoji: "🦗" },
  { key: "hidden_talent",            label: "hidden talent",                  prompt: "What is your hidden talent?", emoji: "✨" },
  { key: "most_embarrassing_moment", label: "most embarrassing moment",       prompt: "What is your most embarrassing moment?", emoji: "😳" },
  { key: "love_that_most_hate",      label: "thing you love that most hate",  prompt: "What is the thing you love that most people hate?", emoji: "💘" },
  { key: "hate_that_most_love",      label: "thing you hate that most love",  prompt: "What is the thing you hate that most people love?", emoji: "🚫" },
  { key: "greatest_fear",            label: "greatest fear",                  prompt: "What is your greatest fear?", emoji: "😱" },
  { key: "favorite_musical_artist",  label: "favorite musical artist",        prompt: "Who is your favorite musical artist?", emoji: "🎵" },
  { key: "favorite_movie",           label: "favorite movie",                 prompt: "What is your favorite movie?", emoji: "🎬" },
  { key: "dinner_with_anyone",       label: "dinner with anyone",             prompt: "If you could have dinner with any person, living or dead, who would it be and why?", emoji: "🍽️" },
  { key: "best_meal_ever",           label: "best meal ever",                 prompt: "What was your best meal ever?", emoji: "🥩" },
  { key: "worst_meal_ever",          label: "worst meal ever",                prompt: "What was your worst meal ever?", emoji: "🤢" },
  { key: "glad_you_did_it",          label: "glad you did it",                prompt: "What's something you didn't want to do, but you're glad you did?", emoji: "✅" },
  { key: "wish_you_hadnt",           label: "wish you hadn't",                prompt: "What's something you really wanted to do, but wish you hadn't done?", emoji: "❌" },
  { key: "ideal_friday_night",       label: "ideal Friday night",             prompt: "What is your ideal Friday night?", emoji: "🌃" },
  { key: "spirit_animal",            label: "spirit animal",                  prompt: "What is your spirit animal and why?", emoji: "🐺" },
  { key: "describe_yourself",        label: "describe yourself in one word",  prompt: "How would you describe yourself in one word?", emoji: "🪞" },
  { key: "how_others_describe_you",  label: "how others describe you",        prompt: "How would others describe you in one word?", emoji: "👀" },
  { key: "biggest_regret",           label: "biggest regret",                 prompt: "What is your biggest regret?", emoji: "😔" },
  { key: "bucket_list_top",          label: "bucket list top item",           prompt: "What is your #1 bucket list item?", emoji: "🪣" },
  { key: "guilty_pleasure",          label: "guilty pleasure",                prompt: "What is your guilty pleasure?", emoji: "😏" },
  { key: "which_beatle",             label: "which Beatle",                   prompt: "Which Beatle would you be and why?", emoji: "🎸" },
  { key: "biography_title",          label: "biography title",                prompt: "What would the title of your biography be?", emoji: "📖" },
  { key: "dream_vacation",           label: "dream vacation",                 prompt: "What is your dream vacation?", emoji: "🏝️" },
  { key: "nightmare_vacation",       label: "nightmare vacation",             prompt: "What is your nightmare vacation?", emoji: "🕳️" },
  { key: "karaoke_song",             label: "go-to karaoke song",             prompt: "What is your go-to karaoke song?", emoji: "🎤" },
  { key: "detention_story",          label: "detention story",                prompt: "Did you ever get detention in school? If so, what for?", emoji: "🖊️" },
  { key: "arrested_story",           label: "arrested story",                 prompt: "Have you ever been arrested? If so, what for?", emoji: "🚓" },
  { key: "superpower",               label: "superpower",                     prompt: "What's your superpower?", emoji: "🦸" },
  { key: "kid_dream_job",            label: "kid dream job",                  prompt: "What did you want to be when you grew up?", emoji: "🚀" },
  { key: "genie_wish",               label: "genie wish",                     prompt: "If a genie granted you one wish, what would you wish for?", emoji: "🧞" },
  { key: "time_travel_destination",  label: "time travel destination",        prompt: "If you could travel through time, what era or day would you visit and why?", emoji: "⏳" },
  { key: "universe_to_live_in",      label: "universe to live in",            prompt: "What literary, game or movie universe would you like to live in and why?", emoji: "🪄" },
  { key: "terrible_job",             label: "job you'd be terrible at",       prompt: "What job would you be terrible at?", emoji: "😅" },
  { key: "great_at_job",             label: "job you'd be great at",          prompt: "What job would you be really good at (that is not your current job)?", emoji: "💪" },
  { key: "post_freeze_question",     label: "first question after cryogenic freeze", prompt: "What would be your first question after waking up from being cryogenically frozen for 100 years?", emoji: "❄️" },
  { key: "embarrassing_style_trend", label: "embarrassing style trend",       prompt: "What's the most embarrassing style trend or look you ever rocked?", emoji: "👓" },

  // Group-stat questions (3) — UI renders as text input today; chip picker is a follow-up.
  { key: "early_bird_or_night_owl", label: "early bird or night owl", prompt: "Early bird or night owl?", emoji: "🌅" },
  { key: "school_archetype",        label: "school archetype",        prompt: "Teacher's pet, class clown, or too cool for school?", emoji: "🎒" },
  { key: "punctuality",             label: "punctuality",             prompt: "Always punctual or fashionably late?", emoji: "⏰" },
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
 *
 * 2026-07-05: with 28 fact_keys (8 original + 20 added), per-game variety is
 * much higher — even with QUESTIONS_PER_FACT=1 every game samples a
 * different 14-key subset of each player's pool.
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
  // ── Round 2 prompt banks ──────────────────────────────────────────
  favorite_book: [
    "What's {name}'s favorite book?",
    "Which book would {name} read again first?",
    "{name}'s go-to recommendation?",
    "The book {name} quotes the most?",
    "If {name} were stranded on a desert island, which book would they bring?",
  ],
  favorite_cuisine: [
    "What's {name}'s favorite cuisine?",
    "What type of food does {name} crave most?",
    "Which cuisine could {name} eat every day?",
    "If {name} could only eat one country's food forever, it'd be?",
  ],
  morning_or_night: [
    "Is {name} a morning person or night owl?",
    "{name} is more of a morning or night person?",
    "When is {name} actually productive — AM or PM?",
    "{name} is a sunrise or sunset kind of person?",
  ],
  coffee_or_tea: [
    "Coffee or tea for {name}?",
    "What does {name} reach for in the morning — coffee or tea?",
    "{name} is a coffee or tea person?",
  ],
  favorite_season: [
    "What's {name}'s favorite season?",
    "Which season does {name} look forward to?",
    "{name} prefers which season?",
    "If {name} could live in one season forever?",
  ],
  superpower: [
    "What's {name}'s dream superpower?",
    "Which superpower would {name} choose?",
    "If {name} could have any superpower, it'd be?",
  ],
  famous_dinner_guest: [
    "Who would {name} invite to a famous-person dinner?",
    "Which celebrity would {name} most want to have dinner with?",
    "If {name} could host any famous person, it'd be?",
    "Living or dead, who would {name} want at their dinner table?",
  ],
  favorite_podcast: [
    "What's a podcast {name} actually listens to?",
    "Which podcast is on {name}'s rotation?",
    "{name}'s current favorite podcast?",
  ],
  most_used_app: [
    "Which app does {name} open the most?",
    "What app is {name} most likely to be scrolling right now?",
    "{name}'s most-used app on their phone?",
  ],
  pet_peeve: [
    "What's a tiny thing that annoys {name} more than it should?",
    "{name}'s biggest pet peeve?",
    "What gets under {name}'s skin?",
    "What's {name}'s 'this shouldn't bug me but it does' moment?",
  ],
  best_advice: [
    "What's the best advice {name} ever got?",
    "Which piece of advice stuck with {name}?",
    "What's the best thing anyone's ever told {name}?",
  ],
  last_show_binge: [
    "What's the last show {name} binged?",
    "What show did {name} just finish watching in one weekend?",
    "The last series {name} watched straight through?",
  ],
  favorite_sport_to_watch: [
    "What sport does {name} most love to watch?",
    "Which sport does {name} actually sit down for?",
    "{name}'s favorite sport to watch on TV?",
  ],
  would_rather_skydive_or_scuba: [
    "Would {name} rather skydive or scuba dive?",
    "Skydiving or scuba diving for {name}?",
    "{name} is more of a skydive or scuba person?",
  ],
  first_job: [
    "What was {name}'s first job?",
    "How did {name} earn their first paycheck?",
    "{name}'s first-ever job was?",
  ],
  worst_cooking_disaster: [
    "What's {name}'s worst cooking disaster?",
    "The worst thing {name} has ever tried to cook?",
    "{name}'s most epic kitchen fail?",
    "What did {name} ruin trying to make dinner?",
  ],
  favorite_holiday: [
    "What's {name}'s favorite holiday?",
    "Which holiday does {name} look forward to most?",
    "{name}'s go-to favorite holiday?",
  ],
  spirit_animal: [
    "What's {name}'s spirit animal?",
    "Which animal represents {name} best?",
    "If {name} were an animal, what would they be?",
  ],
  dream_car: [
    "What's {name}'s dream car?",
    "If {name} could drive any car, it'd be?",
    "Which car would {name} buy tomorrow if money was no object?",
  ],
  current_emoji_crush: [
    "What's {name}'s favorite emoji?",
    "Which emoji does {name} use the most?",
    "{name}'s go-to emoji?",
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
  // ── Round 2 distractor banks ─────────────────────────────────────
  favorite_book: [
    "Pride and Prejudice", "The Great Gatsby", "1984", "To Kill a Mockingbird",
    "The Catcher in the Rye", "The Hobbit", "Harry Potter and the Sorcerer's Stone",
    "Lord of the Rings", "The Chronicles of Narnia", "Jane Eyre",
    "Wuthering Heights", "Moby-Dick", "War and Peace", "Crime and Punishment",
    "The Da Vinci Code", "Gone Girl", "The Girl with the Dragon Tattoo",
    "A Game of Thrones", "Dune", "The Handmaid's Tale", "The Alchemist",
    "The Kite Runner", "Life of Pi", "The Book Thief", "Where the Crawdads Sing",
    "Atomic Habits", "Sapiens", "Educated", "Becoming",
    "The Hunger Games", "Twilight", "Fifty Shades of Grey",
    "The Fault in Our Stars", "Little Women", "Anne of Green Gables",
    "The Outsiders", "Brave New World", "Fahrenheit 451", "Catch-22",
    "The Old Man and the Sea", "Slaughterhouse-Five", "Beloved", "The Color Purple",
  ],
  favorite_cuisine: [
    "Italian", "Mexican", "Japanese", "Thai", "Indian", "Chinese", "Korean",
    "French", "Greek", "Mediterranean", "Vietnamese", "American BBQ",
    "Southern comfort food", "Lebanese", "Ethiopian", "Spanish tapas",
    "Brazilian", "Peruvian", "Moroccan", "Turkish", "German", "Russian",
    "Filipino", "Indonesian", "Malaysian", "Caribbean", "Jamaican",
    "Cuban", "Steakhouse", "Seafood", "Vegan", "Comfort food",
  ],
  morning_or_night: [
    "Morning person", "Night owl", "Mid-day person", "It depends on the day",
    "Definitely night", "Hardcore morning", "Afternoon power hours",
    "I'm nocturnal at this point", "Up at sunrise", "Burns the midnight oil",
    "Early bird", "Late riser", "Dawn patrol", "After-dark type",
  ],
  coffee_or_tea: [
    "Coffee", "Tea", "Iced coffee", "Matcha", "Black tea", "Green tea",
    "Chai latte", "Espresso", "Cold brew", "Herbal tea", "Drip coffee",
    "Neither — water", "Both — depending on mood", "Energy drinks",
  ],
  favorite_season: [
    "Spring", "Summer", "Fall", "Winter", "Autumn", "Late summer",
    "Early fall", "Holiday season", "Monsoon season",
    "Hot summer days", "Crisp autumn", "Snowy winter", "Blooming spring",
  ],
  superpower: [
    "Flying", "Time travel", "Telepathy", "Invisibility", "Super strength",
    "Teleportation", "Mind reading", "Healing", "Shapeshifting",
    "Bending time", "Telekinesis", "Breathing underwater",
    "Speaking every language", "Immortality", "X-ray vision",
    "Freezing time", "Reading minds", "Phase through walls",
    "Super speed", "Lightning", "Precognition",
  ],
  famous_dinner_guest: [
    "Albert Einstein", "Oprah Winfrey", "Beyoncé", "Barack Obama",
    "Michelle Obama", "Taylor Swift", "Leonardo da Vinci",
    "Abraham Lincoln", "Cleopatra", "Julius Caesar", "Marie Curie",
    "Stephen Hawking", "Elon Musk", "Serena Williams", "Tom Hanks",
    "David Attenborough", "Anthony Bourdain", "Ruth Bader Ginsburg",
    "Martin Luther King Jr.", "Madonna", "Freddie Mercury",
    "John Lennon", "Michael Jordan", "Babe Ruth", "Shakira",
    "Dolly Parton", "Robin Williams", "Robin Hood", "George Washington",
    "Ada Lovelace", "Nikola Tesla", "Frida Kahlo", "Picasso",
    "Maya Angelou", "Tina Fey", "Ellen DeGeneres", "Keanu Reeves",
  ],
  favorite_podcast: [
    "This American Life", "Serial", "Radiolab", "Stuff You Should Know",
    "Crime Junkie", "My Favorite Murder", "The Daily", "Pod Save America",
    "Huberman Lab", "Lex Fridman", "Tim Ferriss", "Armchair Expert",
    "SmartLess", "Conan O'Brien Needs a Friend", "Call Her Daddy",
    "The Joe Rogan Experience", "The Diary of a CEO", "Hidden Brain",
    "TED Radio Hour", "99% Invisible", "Revisionist History",
    "Planet Money", "Freakonomics", "Wait Wait... Don't Tell Me",
    "True Crime Obsessed", "Casefile True Crime", "Something You Should Know",
    "The Moth", "Reply All", "Heavyweight", "The Read",
  ],
  most_used_app: [
    "Instagram", "TikTok", "YouTube", "X / Twitter", "Reddit",
    "Messages", "WhatsApp", "Snapchat", "Facebook", "Spotify",
    "Apple Music", "Netflix", "Gmail", "Safari", "Chrome",
    "Google Maps", "Notes", "Photos", "Camera", "Discord",
    "Slack", "LinkedIn", "Amazon", "Pinterest", "Threads",
    "Telegram", "GroupMe", "Venmo", "Cash App", "Mint",
  ],
  pet_peeve: [
    "Slow walkers in crowds", "Loud chewing", "People who don't use turn signals",
    "Wet towels on the bed", "When someone says 'literally' literally all the time",
    "Mispronouncing common words", "Leaving cabinets open",
    "Texting in all lowercase", "Tagging me in things I didn't ask to see",
    "When the volume is an odd number", "Shoes on the couch",
    "Popping gum", "Reply All emails", "Spoilers", "When the wifi lags",
    "Pronouncing 'gif' wrong", "Tailgaters", "Tense shoulders from someone",
    "Unexplained driver honking", "Reading over my shoulder",
    "Loud phone speakers in public", "Snapping gum", "Slow checkout lines",
    "Double-dippers", "Hoverers", "Mouth breathers",
  ],
  best_advice: [
    "Don't take it personally", "Trust your gut", "Always be kind",
    "Sleep on it", "Say how you feel", "You can't please everyone",
    "Save 10% of everything", "Take the trip", "Call your parents",
    "Eat the frog", "Comparison is the thief of joy",
    "Done is better than perfect", "Stay curious", "Ask for help",
    "Show up", "Be the energy you want to attract", "Just keep going",
    "Be specific", "Say yes first, figure it out later",
    "Don't burn bridges", "Take the high road", "Choose your battles",
    "Listen more than you talk", "Read every day", "Move your body",
    "Learn to say no", "Invest in experiences", "Forgive quickly",
    "Stay humble", "Be present", "Hire slow, fire fast",
  ],
  last_show_binge: [
    "Breaking Bad", "The Bear", "Severance", "Succession", "Ted Lasso",
    "Stranger Things", "The Crown", "Bridgerton", "The Marvelous Mrs. Maisel",
    "Fleabag", "Killing Eve", "Better Call Saul", "Ozark", "Yellowstone",
    "The White Lotus", "Squid Game", "Wednesday", "House of the Dragon",
    "The Last of Us", "Beef", "Abbott Elementary", "Only Murders in the Building",
    "Beef", "The Morning Show", "Shogun", "Baby Reindeer", "Fallout",
    "The Bear", "Slow Horses", "For All Mankind", "Reacher",
    "Outer Banks", "Emily in Paris", "Cobra Kai", "You", "Black Mirror",
    "Band of Brothers", "The Wire", "The Sopranos", "Mad Men",
    "Atlanta", "Barry", "Euphoria", "The Bear", "The Rehearsal",
  ],
  favorite_sport_to_watch: [
    "Football", "Basketball", "Baseball", "Soccer", "Hockey",
    "Tennis", "Golf", "Boxing", "UFC / MMA", "Formula 1",
    "NASCAR", "Cricket", "Rugby", "Volleyball", "Swimming",
    "Track and field", "Olympics", "Figure skating", "Gymnastics",
    "Surfing", "Skiing", "Skateboarding", "Lacrosse", "Softball",
    "Archery", "Esports", "Cycling", "Triathlon",
  ],
  would_rather_skydive_or_scuba: [
    "Skydiving", "Scuba diving", "Both — no fear", "Neither — staying grounded",
    "Skydiving in a heartbeat", "Scuba all the way", "I'd panic at both",
    "Only if someone pushes me", "Already done both",
    "Hard pass on both", "Sign me up for both",
  ],
  first_job: [
    "Babysitting", "Lawn mowing", "Newspaper delivery", "Dishwasher at a restaurant",
    "Fast food cashier", "Ice cream scooper", "Lifeguard", "Camp counselor",
    "Dog walker", "Tutor", "Retail clerk", "Hostess", "Barista",
    "Busboy", "Grocery store bagger", "Car wash attendant", "Mowing lawns",
    "Scooping ice cream", "Paper route", "Yard work", "Cleaning houses",
    "Stocking shelves", "Bagging groceries", "Pizza delivery", "Tutoring",
    "Teaching assistant", "Receptionist", "Waiter", "Bartender",
  ],
  worst_cooking_disaster: [
    "Burned the bottom of the pan", "Set off the smoke alarm", "Forgot to defrost the chicken",
    "Salty as the ocean", "Raw in the middle", "Caught fire — actual flames",
    "The smoke alarm screamed", "Pasta glued to the pot", "Mystery meatloaf",
    "Curry that set the whole house on fire", "Burned popcorn", "Spilled milk on the stove — flames",
    "Cakes that fell", "Bread that was basically a brick",
    "Forgot sugar", "Used salt instead of sugar", "Overcooked the turkey",
    "Exploded eggs in the microwave", "Boiled-over pasta", "Ruined a family recipe",
    "Burned grilled cheese", "Charred the steak", "Made mashed potatoes with no milk",
    "Forgot the yeast", "Curdled the sauce", "Took hours and was still raw",
  ],
  favorite_holiday: [
    "Christmas", "Thanksgiving", "Halloween", "Easter", "Fourth of July",
    "New Year's Eve", "Valentine's Day", "St. Patrick's Day", "Hanukkah",
    "Diwali", "Eid al-Fitr", "Chinese New Year", "Cinco de Mayo",
    "Mother's Day", "Father's Day", "Labor Day", "Memorial Day",
    "Birthday", "My own birthday", "Any long weekend",
    "Boxing Day", "Mardi Gras", "Passover", "Ramadan",
    "Earth Day", "Veteran's Day", "MLK Day", "Presidents' Day",
  ],
  spirit_animal: [
    "Wolf", "Dolphin", "Eagle", "Owl", "Bear", "Fox", "Tiger",
    "Lion", "Elephant", "Octopus", "Sloth", "Penguin", "Otter",
    "Hawk", "Deer", "Horse", "Butterfly", "Whale", "Orca",
    "Penguin", "Cat", "Dog", "Rabbit", "Hedgehog", "Red panda",
    "Panther", "Jaguar", "Cheetah", "Koala", "Kangaroo",
    "Raven", "Crow", "Falcon", "Hummingbird",
  ],
  dream_car: [
    "Tesla Model S", "Porsche 911", "Lamborghini Huracán", "Ferrari F8",
    "Ford Mustang", "Chevrolet Corvette", "BMW M3", "Mercedes-Benz S-Class",
    "Audi R8", "Range Rover", "Toyota Land Cruiser", "Jeep Wrangler",
    "Aston Martin DB11", "Bentley Continental", "Rolls-Royce Ghost",
    "McLaren 720S", "Bugatti Chiron", "Toyota Supra", "Nissan GT-R",
    "Honda Civic Type R", "Mazda MX-5 Miata", "Subaru WRX",
    "Ford F-150 Raptor", "Rivian R1T", "Lucid Air", "Cadillac Escalade",
    "Vintage VW Bus", "Classic Mustang", "1969 Camaro",
  ],
  current_emoji_crush: [
    "😂", "❤️", "🔥", "✨", "😍", "🥺", "💀", "😭", "🙌", "😎",
    "🤔", "🥹", "😊", "💯", "🤌", "🤷", "🙄", "😴", "🤩", "👀",
    "🌈", "🌸", "🍑", "🍆", "🥑", "🌮", "☕", "🍷", "🎉", "🎂",
    "🐶", "🐱", "🦊", "🐼", "🦄", "🐝", "🫶", "🤝", "👋", "🫡",
  ],
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