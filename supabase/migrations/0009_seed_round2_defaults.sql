-- Family Trivia — seed the round-2 default questions
-- These 20 fact_keys lived in the hardcoded FACT_PROMPTS/FACT_DISTRACTORS
-- banks in code. Promote them to first-class default_facts rows so the
-- full historical 28-key catalog shows up in the lobby by default. Daniel
-- can edit or delete any of these like the original 8.

insert into public.default_facts (key, label, prompt, emoji, sort_order, created_by)
values
  ('go_to_snack',           'go-to snack',           'What''s your go-to snack?',                    '🍿',  10, 'system'),
  ('first_concert',         'first concert',         'What was your first concert?',                  '🎤',  11, 'system'),
  ('guilty_pleasure_song',  'guilty pleasure song',  'What''s your most embarrassing song you love?','🎵',  12, 'system'),
  ('kid_dream_job',         'kid dream job',         'What did you want to be when you grew up?',    '🚀',  13, 'system'),
  ('unpopular_opinion',     'unpopular opinion',     'What''s an unpopular opinion you hold?',       '🤔',  14, 'system'),
  ('favorite_book',         'favorite book',         'What''s your favorite book?',                  '📚',  15, 'system'),
  ('favorite_cuisine',      'favorite cuisine',      'What''s your favorite type of food?',          '🍜',  16, 'system'),
  ('morning_or_night',      'morning or night',      'Are you a morning person or a night owl?',     '🌅',  17, 'system'),
  ('coffee_or_tea',         'coffee or tea',         'Coffee or tea?',                               '☕',  18, 'system'),
  ('superpower',            'superpower',            'If you could have any superpower, what would it be?', '🦸',  19, 'system'),
  ('famous_dinner_guest',   'famous dinner guest',   'Which famous person (alive or dead) would you invite to dinner?', '🍽️', 20, 'system'),
  ('favorite_podcast',      'favorite podcast',      'What''s a podcast you actually listen to?',    '🎙️',  21, 'system'),
  ('most_used_app',         'most-used app',         'Which app do you open most?',                  '📱',  22, 'system'),
  ('pet_peeve',             'pet peeve',             'What''s a tiny thing that annoys you more than it should?', '😤', 23, 'system'),
  ('best_advice',           'best advice',           'What''s the best advice you''ve ever received?','💡',  24, 'system'),
  ('last_show_binge',       'last show binge',       'What''s the last show you binged?',             '📺',  25, 'system'),
  ('favorite_sport_to_watch','favorite sport to watch','What''s your favorite sport to watch?',       '🏈',  26, 'system'),
  ('would_rather_skydive_or_scuba','skydive or scuba','Would you rather go skydiving or scuba diving?','🪂', 27, 'system'),
  ('first_job',             'first job',             'What was your first job?',                      '💼',  28, 'system'),
  ('worst_cooking_disaster','worst cooking disaster','What''s your worst cooking disaster?',         '🔥',  29, 'system'),
  ('favorite_holiday',      'favorite holiday',      'What''s your favorite holiday?',               '🎄',  30, 'system'),
  ('spirit_animal',         'spirit animal',         'What''s your spirit animal?',                  '🐺',  31, 'system'),
  ('dream_car',             'dream car',             'What''s your dream car?',                      '🚗',  32, 'system'),
  ('current_emoji_crush',   'current emoji crush',   'What''s your favorite emoji?',                 '😍',  33, 'system')
on conflict (key) do nothing;