-- Family Trivia — per-player bio for tailored trivia
-- Adds optional fields to public.profiles so the question generator
-- (and future host prompts) can pull subject-specific context: birth
-- year for kid-tagged language/interests, occupation for tailored
-- questions, and free-form interest tags.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_year integer
    CHECK (birth_year IS NULL OR (birth_year >= 1900 AND birth_year <= extract(year from now())::int + 1));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS occupation text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS interests text[]
    DEFAULT '{}'::text[];

COMMENT ON COLUMN public.profiles.birth_year IS
  'Year of birth. Lets the question generator route to age-appropriate trivia banks and the host adjust tone (kid vs adult).';

COMMENT ON COLUMN public.profiles.occupation IS
  'Free-form short occupation (e.g. "attorney", "tax accountant", "12-year-old athlete"). Drives occupation-tailored trivia questions.';

COMMENT ON COLUMN public.profiles.interests IS
  'Array of interest tags (e.g. ["sports","music"]). Drives tag-based trivia question selection when a subject is chosen.';
