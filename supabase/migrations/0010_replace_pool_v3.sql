-- Family Trivia — replace default_facts pool with the v3 question set
--
-- Daniel + brother-in-law curated the final question list 2026-07-06. We're
-- wiping the existing 32 rows (8 from 0008 + 24 from 0009) and re-seeding
-- with 42 rows: 39 personal facts + 3 group-stat questions.
--
-- Schema additions:
--   * `kind` text — discriminator for the three question flavors we now
--     support:
--       - 'personal'    (default) — free-text answer per player, used for
--                                  who-said-it or multiple-choice at game
--                                  time.
--       - 'group_stat'           — player picks one of `options`; the game
--                                  shows distribution across the group
--                                  instead of a "right" answer. UI still
--                                  renders as a text input today — the
--                                  chip picker is a follow-up.
--       - 'auto'                 — system-computed at game time, no player
--                                  input. Reserved for things like
--                                  "Billboard #1 song the week you were
--                                  born" which needs a DOB field on
--                                  players and a song-lookup service. Not
--                                  seeded in this migration — it's a
--                                  separate piece of work.
--   * `options` jsonb — array of fixed-choice labels for `kind='group_stat'`.
--                       NULL for `kind='personal'`.
--
-- Profile impact: profiles.facts is jsonb with no FK to default_facts, so
-- saved answers to deleted keys (morning_or_night, favorite_song, motto,
-- etc.) linger as JSON. profiles.ts filters them out on next save by
-- diffing against the static DEFAULT_FACTS array in code (which is
-- updated alongside this migration). Harmless dead data, drops off
-- naturally.

alter table public.default_facts
  add column if not exists kind text not null default 'personal',
  add column if not exists options jsonb;

-- Wipe the existing pool. Anyone who added custom rows via the profile UI
-- loses them, but the next session will reload the new pool from scratch.
-- This is the intended behavior — Daniel asked for a full replacement.
delete from public.default_facts;

-- Personal-fact questions (39) — each player types a free-text answer.
-- Keys are snake_case and stable; renaming a key would orphan player_facts
-- rows that reference the old one (none exist for these new keys, so we're
-- free to pick whatever reads best).
insert into public.default_facts (key, label, prompt, emoji, sort_order, kind, created_by) values
  ('first_concert',                'first concert',                    'What was the first concert you ever attended (artist name and venue)?', '🎤',   0, 'personal', 'system'),
  ('best_concert',                 'best concert',                     'What was the best concert you ever attended (artist name and venue)?',  '🎶',   1, 'personal', 'system'),
  ('favorite_food',                'favorite food',                    'What is your favorite food?',                                            '🍕',   2, 'personal', 'system'),
  ('weirdest_food_eaten',          'weirdest food eaten',              'What is the weirdest thing you''ve ever eaten?',                         '🦗',   3, 'personal', 'system'),
  ('hidden_talent',                'hidden talent',                    'What is your hidden talent?',                                            '✨',   4, 'personal', 'system'),
  ('most_embarrassing_moment',     'most embarrassing moment',         'What is your most embarrassing moment?',                                 '😳',   5, 'personal', 'system'),
  ('love_that_most_hate',          'thing you love that most hate',    'What is the thing you love that most people hate?',                      '💘',   6, 'personal', 'system'),
  ('hate_that_most_love',          'thing you hate that most love',    'What is the thing you hate that most people love?',                      '🚫',   7, 'personal', 'system'),
  ('greatest_fear',                'greatest fear',                    'What is your greatest fear?',                                            '😱',   8, 'personal', 'system'),
  ('favorite_musical_artist',      'favorite musical artist',          'Who is your favorite musical artist?',                                   '🎵',   9, 'personal', 'system'),
  ('favorite_movie',               'favorite movie',                   'What is your favorite movie?',                                           '🎬',  10, 'personal', 'system'),
  ('dinner_with_anyone',           'dinner with anyone',               'If you could have dinner with any person, living or dead, who would it be and why?', '🍽️', 11, 'personal', 'system'),
  ('best_meal_ever',               'best meal ever',                   'What was your best meal ever?',                                          '🥩',  12, 'personal', 'system'),
  ('worst_meal_ever',              'worst meal ever',                  'What was your worst meal ever?',                                         '🤢',  13, 'personal', 'system'),
  ('glad_you_did_it',              'glad you did it',                  'What''s something you didn''t want to do, but you''re glad you did?',    '✅',  14, 'personal', 'system'),
  ('wish_you_hadnt',               'wish you hadn''t',                 'What''s something you really wanted to do, but wish you hadn''t done?',  '❌',  15, 'personal', 'system'),
  ('ideal_friday_night',           'ideal Friday night',               'What is your ideal Friday night?',                                       '🌃',  16, 'personal', 'system'),
  ('spirit_animal',                'spirit animal',                    'What is your spirit animal and why?',                                    '🐺',  17, 'personal', 'system'),
  ('describe_yourself',            'describe yourself in one word',    'How would you describe yourself in one word?',                           '🪞',  18, 'personal', 'system'),
  ('how_others_describe_you',      'how others describe you',          'How would others describe you in one word?',                             '👀',  19, 'personal', 'system'),
  ('biggest_regret',               'biggest regret',                   'What is your biggest regret?',                                           '😔',  20, 'personal', 'system'),
  ('bucket_list_top',              'bucket list top item',             'What is your #1 bucket list item?',                                      '🪣',  21, 'personal', 'system'),
  ('guilty_pleasure',              'guilty pleasure',                  'What is your guilty pleasure?',                                          '😏',  22, 'personal', 'system'),
  ('which_beatle',                 'which Beatle',                     'Which Beatle would you be and why?',                                     '🎸',  23, 'personal', 'system'),
  ('biography_title',              'biography title',                  'What would the title of your biography be?',                             '📖',  24, 'personal', 'system'),
  ('dream_vacation',               'dream vacation',                   'What is your dream vacation?',                                          '🏝️', 25, 'personal', 'system'),
  ('nightmare_vacation',           'nightmare vacation',               'What is your nightmare vacation?',                                      '🕳️', 26, 'personal', 'system'),
  ('karaoke_song',                 'go-to karaoke song',               'What is your go-to karaoke song?',                                       '🎤',  27, 'personal', 'system'),
  ('detention_story',              'detention story',                  'Did you ever get detention in school? If so, what for?',                 '🖊️',  28, 'personal', 'system'),
  ('arrested_story',               'arrested story',                   'Have you ever been arrested? If so, what for?',                          '🚓',  29, 'personal', 'system'),
  ('superpower',                   'superpower',                       'What''s your superpower?',                                               '🦸',  30, 'personal', 'system'),
  ('kid_dream_job',                'kid dream job',                    'What did you want to be when you grew up?',                              '🚀',  31, 'personal', 'system'),
  ('genie_wish',                   'genie wish',                       'If a genie granted you one wish, what would you wish for?',              '🧞',  32, 'personal', 'system'),
  ('time_travel_destination',      'time travel destination',          'If you could travel through time, what era or day would you visit and why?', '⏳', 33, 'personal', 'system'),
  ('universe_to_live_in',          'universe to live in',              'What literary, game or movie universe would you like to live in and why?', '🪄', 34, 'personal', 'system'),
  ('terrible_job',                 'job you''d be terrible at',        'What job would you be terrible at?',                                     '😅',  35, 'personal', 'system'),
  ('great_at_job',                 'job you''d be great at',           'What job would you be really good at (that is not your current job)?',   '💪',  36, 'personal', 'system'),
  ('post_freeze_question',         'first question after cryogenic freeze', 'What would be your first question after waking up from being cryogenically frozen for 100 years?', '❄️', 37, 'personal', 'system'),
  ('embarrassing_style_trend',     'embarrassing style trend',         'What''s the most embarrassing style trend or look you ever rocked?',    '👓',  38, 'personal', 'system');

-- Group-stat questions (3) — each player picks from `options`, the game
-- shows distribution across the group instead of a "right" answer. Today
-- these still render as free-text inputs in the lobby UI; a chip picker is
-- a follow-up.
insert into public.default_facts (key, label, prompt, emoji, sort_order, kind, options, created_by) values
  ('early_bird_or_night_owl', 'early bird or night owl', 'Early bird or night owl?',                                              '🌅',  39, 'group_stat', '["Early bird", "Night owl"]'::jsonb, 'system'),
  ('school_archetype',        'school archetype',        'Teacher''s pet, class clown, or too cool for school?',                  '🎒',  40, 'group_stat', '["Teacher''s pet", "Class clown", "Too cool for school"]'::jsonb, 'system'),
  ('punctuality',             'punctuality',             'Always punctual or fashionably late?',                                 '⏰',  41, 'group_stat', '["Always punctual", "Fashionably late"]'::jsonb, 'system');

-- NOT seeded (deferred — separate work):
--   * 'What was the billboard number one song the week you were born?'
--     kind='auto' — requires players.birthday + a Billboard Hot 100 lookup
--     service. Both are bigger features than this pool swap.