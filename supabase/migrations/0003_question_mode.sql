-- Family Trivia — question mode
-- Adds a `mode` column to questions so a single game can mix multiple-choice
-- questions with "who said it" questions (dropdown of family members).
--
-- Default is 'multiple-choice' so any pre-existing rows render correctly.

alter table public.questions
  add column if not exists mode text not null default 'multiple-choice'
  check (mode in ('multiple-choice', 'who-said-it'));