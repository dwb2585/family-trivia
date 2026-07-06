-- Family Trivia — collaborative default-question pool
--
-- Replaces both the hardcoded 8-fact DEFAULT_FACTS array in code AND the
-- just-built shared_questions Q&A bank. Now there's one editable table
-- that anyone in the family can add/edit/delete. Daniel reframed the
-- earlier "Question Bank" as: those questions should just BE default
-- questions, not a parallel concept.
--
-- Design:
--   * prompt + label + emoji + sort_order editable by anyone (via anon RLS)
--   * `key` is the stable snake_case identifier used as fact_key in
--     player_facts for game-time questions. Auto-generated from the label
--     so renames don't break player_facts rows.
--   * existing player_facts rows for the 8 seeded facts still resolve
--     because we seed them with their original keys.

create table if not exists public.default_facts (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,                 -- stable snake_case id, used as fact_key in player_facts
  label text not null,                      -- "favorite color"
  prompt text not null,                     -- "What's your favorite color?"
  emoji text not null default '',           -- "🎨"
  sort_order int not null default 100,      -- lower = earlier in list
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists default_facts_sort_idx on public.default_facts (sort_order);

alter table public.default_facts enable row level security;
create policy "anon all default_facts" on public.default_facts
  for all using (true) with check (true);

drop trigger if exists default_facts_set_updated_at on public.default_facts;
create trigger default_facts_set_updated_at
  before update on public.default_facts
  for each row execute function public.set_updated_at();

-- Seed the original 8 hardcoded defaults so existing player_facts rows
-- still resolve. Anyone can edit/delete these.
insert into public.default_facts (key, label, prompt, emoji, sort_order, created_by)
values
  ('favorite_movie',    'favorite movie',    'What''s your favorite movie?',    '🎬',  0, 'system'),
  ('favorite_season',   'favorite season',   'What''s your favorite season?',   '🌸',  1, 'system'),
  ('favorite_food',     'favorite food',     'What''s your favorite food?',     '🍕',  2, 'system'),
  ('dream_vacation',    'dream vacation',    'Where''s your dream vacation?',   '🏝️',  3, 'system'),
  ('hidden_talent',     'hidden talent',     'What''s your hidden talent?',     '✨',  4, 'system'),
  ('favorite_song',     'favorite song',     'What''s your favorite song?',     '🎵',  5, 'system'),
  ('last_book',         'last book',         'What''s the last book you read?', '📚',  6, 'system'),
  ('motto',             'motto',             'What''s your personal motto?',    '💭',  7, 'system')
on conflict (key) do nothing;

-- Migrate any data from the just-built shared_questions Q&A bank into
-- default_facts. Each unique prompt becomes a new editable row. We don't
-- migrate answers because the new model handles answers in the lobby
-- per-player (matching how default facts always worked).
insert into public.default_facts (key, label, prompt, emoji, sort_order, created_by)
select
  'q_' || substr(md5(sq.prompt), 1, 12),
  coalesce(
    nullif(
      trim(both ' ' from lower(
        regexp_replace(sq.prompt, '^(what|where|who|when|why|how)''?s\s+(?:your\s+)?', '', 'i')
      )),
      ''
    ),
    sq.prompt
  ),
  sq.prompt,
  '',
  100 + row_number() over (),
  'migrated'
from (
  select distinct prompt from public.shared_questions
) sq
where sq.prompt not in (select prompt from public.default_facts)
on conflict do nothing;

-- Drop the old Q&A bank. Realtime publication will refresh on next schema reload.
drop table if exists public.shared_question_answers cascade;
drop table if exists public.shared_questions cascade;