-- Family Trivia — shared custom question pool
--
-- Replaces the per-player profile_custom_facts model (where each person
-- could only see questions they wrote themselves) with a global pool that
-- any player can write into (about anyone in the family roster) and any
-- player can delete.
--
-- At game-start time, the engine filters this table by subject_full_name
-- being a current player, and generates a who-said-it question for each
-- match. Distractors aren't needed because the dropdown IS the player list.
--
-- Migration: every row from the old profile_custom_facts is preserved as
-- a row here, with subject = full_name and created_by = full_name (so the
-- original author gets credit), then the old table is dropped.

create table if not exists public.custom_questions (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,                     -- "What's your favorite season?"
  label text not null,                      -- "favorite season" (short noun phrase)
  value text not null default '',           -- "Autumn" (the answer; empty means incomplete)
  subject_full_name text not null,          -- whose fact this is
  created_by text not null,                 -- who wrote it
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists custom_questions_subject_idx
  on public.custom_questions (subject_full_name);
create index if not exists custom_questions_created_idx
  on public.custom_questions (created_at);

alter table public.custom_questions enable row level security;
create policy "anon all custom_questions" on public.custom_questions
  for all using (true) with check (true);

drop trigger if exists custom_questions_set_updated_at on public.custom_questions;
create trigger custom_questions_set_updated_at
  before update on public.custom_questions
  for each row execute function public.set_updated_at();

-- Migrate per-player custom facts into the shared pool. Each row becomes
-- a question ABOUT its full_name, BY the same person. Existing data is
-- preserved verbatim.
insert into public.custom_questions
  (prompt, label, value, subject_full_name, created_by, created_at)
select
  prompt,
  label,
  value,
  full_name,
  full_name,
  created_at
from public.profile_custom_facts
on conflict do nothing;

-- Drop the old per-player table. Realtime publication will be cleaned up
-- by the supabase_realtime publication refresh on next schema reload;
-- if it complains we can `alter publication supabase_realtime drop table`.
drop table if exists public.profile_custom_facts cascade;