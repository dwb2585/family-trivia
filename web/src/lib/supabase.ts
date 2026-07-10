import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn(
    "Supabase env vars not set. Copy .env.example to .env.local and fill them in.",
  );
}

export const supabase = createClient(url || "http://localhost", key || "anon", {
  auth: { persistSession: true, autoRefreshToken: true },
  realtime: { params: { eventsPerSecond: 10 } },
});

export const supabaseUrl = url ?? "";
export const supabaseAnonKey = key ?? "";

// ---- Database types ----

export type GameStatus = "lobby" | "playing" | "finished";

export interface Game {
  id: string;
  code: string;
  host_token: string;
  status: GameStatus;
  current_question: number;
  total_questions: number;
  show_results: boolean;
  created_at: string;
}

export interface Player {
  id: string;
  game_id: string;
  client_id: string;
  name: string;
  is_host: boolean;
  score: number;
  ready: boolean;
  joined_at: string;
}

export interface PlayerFact {
  id: string;
  player_id: string;
  fact_key: string;
  fact_value: string;
}

export interface Question {
  id: string;
  game_id: string;
  question_index: number;
  subject_player_id: string;
  fact_key: string;
  /** Question format - 'multiple-choice' for old format, 'who-said-it' for dropdown */
  mode: "multiple-choice" | "who-said-it";
  question_text: string;
  options: string[];
  correct_option_index: number;
  points: number;
}

export interface Answer {
  id: string;
  question_id: string;
  player_id: string;
  selected_option_index: number;
  is_correct: boolean;
  answered_at: string;
}

export interface Profile {
  full_name: string;
  facts: Record<string, string>;
  avatar_emoji?: string | null;
  /** Year of birth. Rounds down to age — drives kid-tagged language and trivia banks. */
  birth_year?: number | null;
  /** Short occupation text — drives occupation-tailored trivia questions. */
  occupation?: string | null;
  /** Free-form interest tags used to pull from curated trivia banks by topic. */
  interests?: string[] | null;
  updated_at: string;
}

/**
 * A row in the collaborative default-question pool. Anyone can add, edit,
 * or delete. The `key` is the stable identifier used as `fact_key` in
 * player_facts at game time; prompt + label + emoji are user-facing and
 * freely editable. Replaces the previous hardcoded DEFAULT_FACTS array
 * and the shared_questions Q&A bank (migration 0008).
 */
export interface DefaultFact {
  id: string;
  key: string;            // "favorite_movie"
  label: string;          // "favorite movie"
  prompt: string;         // "What's your favorite movie?"
  emoji: string;          // "🎬"
  sort_order: number;     // lower = earlier in the lobby list
  created_by: string;
  created_at: string;
  updated_at: string;
}