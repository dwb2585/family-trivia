import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn(
    "Supabase env vars not set. Copy .env.example to .env.local and fill them in.",
  );
}

export const supabase = createClient(url || "http://localhost", key || "anon", {
  realtime: { params: { eventsPerSecond: 10 } },
});

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
  /** Question format — 'multiple-choice' for old format, 'who-said-it' for dropdown */
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
  updated_at: string;
}

/**
 * A user-defined question in the shared custom-question pool.
 * Any player can add a question (about any subject in the family roster)
 * and any player can delete one. At game start the engine filters by
 * subject being a current player and turns each into a who-said-it round.
 *
 * Note: legacy name was `ProfileCustomFact` (per-player scope). Renamed in
 * migration 0006 when the model went shared.
 */
export interface CustomQuestion {
  id: string;
  prompt: string;             // "What's your favorite season?"
  label: string;              // "favorite season" — used in question templates
  value: string;              // "Autumn" — the subject's answer
  subject_full_name: string;  // whose fact this is
  created_by: string;         // who wrote it
  created_at: string;
  updated_at: string;
}