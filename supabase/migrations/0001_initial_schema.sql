-- Family Trivia — initial schema
-- Run this in the Supabase SQL editor (or via supabase CLI) to set up tables.

-- Enable UUID generation (Supabase has pgcrypto available by default)
create extension if not exists "pgcrypto";

-- ---- Games ----
create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_token text not null,
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'finished')),
  current_question int not null default 0,
  total_questions int not null default 0,
  show_results boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists games_code_idx on games (code);

-- ---- Players ----
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  client_id text not null,
  name text not null,
  is_host boolean not null default false,
  score int not null default 0,
  ready boolean not null default false,
  joined_at timestamptz not null default now()
);
-- Note: no unique constraint on (game_id, client_id) so one device
-- can host multiple players (e.g., a parent filling out for a kid).
create index if not exists players_game_id_idx on players (game_id);
create index if not exists players_client_id_idx on players (client_id);

-- ---- Player facts ----
create table if not exists player_facts (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  fact_key text not null,
  fact_value text not null,
  unique (player_id, fact_key)
);
create index if not exists player_facts_player_id_idx on player_facts (player_id);

-- ---- Questions ----
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  question_index int not null,
  subject_player_id uuid not null references players(id) on delete cascade,
  fact_key text not null,
  question_text text not null,
  options jsonb not null,
  correct_option_index int not null,
  points int not null default 100,
  unique (game_id, question_index)
);
create index if not exists questions_game_id_idx on questions (game_id);

-- ---- Answers ----
-- game_id is denormalized so we can realtime-filter by it directly.
create table if not exists answers (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  selected_option_index int not null,
  is_correct boolean not null,
  points_awarded int not null default 0,
  ms_taken int not null default 0,
  answered_at timestamptz not null default now(),
  unique (question_id, player_id)
);
create index if not exists answers_game_id_idx on answers (game_id);
create index if not exists answers_question_id_idx on answers (question_id);

-- ---- Realtime ----
-- Enable realtime for the tables we subscribe to from the client.
alter publication supabase_realtime add table games;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table questions;
alter publication supabase_realtime add table answers;

-- ---- Row Level Security ----
-- For a family game with no auth, we allow anyone with the anon key to read/write.
-- Real security comes from the random 4-letter code being unguessable.
alter table games enable row level security;
alter table players enable row level security;
alter table player_facts enable row level security;
alter table questions enable row level security;
alter table answers enable row level security;

-- Permissive policies: anyone can do anything.
-- (This is fine for a low-stakes family game. Tighten before going public.)
create policy "anon all games" on games for all using (true) with check (true);
create policy "anon all players" on players for all using (true) with check (true);
create policy "anon all player_facts" on player_facts for all using (true) with check (true);
create policy "anon all questions" on questions for all using (true) with check (true);
create policy "anon all answers" on answers for all using (true) with check (true);