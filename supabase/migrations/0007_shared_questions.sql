-- Family Trivia — shared question + answer bank
--
-- The simplest possible model: a flat pool of questions, anyone can post,
-- anyone can answer (one answer per person per question — updating an answer
-- upserts), anyone can delete either.
--
-- At game-start, the engine pulls all questions with at least one answer
-- and emits a round per (question × answerer) pair where the answerer
-- is a current player. Rounds look like multiple-choice:
--   "What is Kate's answer to 'What's your favorite color?'"
--   options: Kate's color, other current players' other-question answers, generic distractors
--
-- Replaces the previous per-player profile_custom_facts and the just-added
-- shared custom_questions model. Migrations:
--   0004: profile_custom_facts (per-player custom facts)
--   0006: custom_questions (shared, but with required subject + value)
--   0007: shared_questions + shared_question_answers (this — fully open Q&A)
--
-- Data preserved: any custom_questions rows become (question + subject's
-- answer) pairs, so no input is lost across the model swap.

create table if not exists public.shared_questions (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,                     -- "What's your favorite color?"
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shared_questions_created_idx on public.shared_questions (created_at);

alter table public.shared_questions enable row level security;
create policy "anon all shared_questions" on public.shared_questions
  for all using (true) with check (true);

drop trigger if exists shared_questions_set_updated_at on public.shared_questions;
create trigger shared_questions_set_updated_at
  before update on public.shared_questions
  for each row execute function public.set_updated_at();

create table if not exists public.shared_question_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.shared_questions(id) on delete cascade,
  submitted_by text not null,               -- who gave this answer
  value text not null,                      -- "Purple"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One answer per (question, person). Re-submitting upserts in place.
  unique (question_id, submitted_by)
);

create index if not exists shared_question_answers_q_idx on public.shared_question_answers (question_id);
create index if not exists shared_question_answers_author_idx on public.shared_question_answers (submitted_by);

alter table public.shared_question_answers enable row level security;
create policy "anon all shared_question_answers" on public.shared_question_answers
  for all using (true) with check (true);

drop trigger if exists shared_question_answers_set_updated_at on public.shared_question_answers;
create trigger shared_question_answers_set_updated_at
  before update on public.shared_question_answers
  for each row execute function public.set_updated_at();

-- Migrate from the previous custom_questions model (0006) into the new shape.
-- Each old row becomes a shared_question + one answer from subject_full_name.
insert into public.shared_questions (id, prompt, created_by, created_at)
  select id, prompt, created_by, created_at from public.custom_questions
  on conflict do nothing;

insert into public.shared_question_answers (question_id, submitted_by, value, created_at)
  select id, subject_full_name, value, created_at from public.custom_questions
  where value <> ''
  on conflict do nothing;

-- Drop the previous model. clean up realtime publication bookkeeping if any.
drop table if exists public.custom_questions cascade;