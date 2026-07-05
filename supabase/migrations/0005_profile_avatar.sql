-- Add a per-person avatar emoji so each family member can pick their own.
-- Profiles table is keyed by full_name, so an update here applies to every
-- device that joins as that name.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_emoji text;

COMMENT ON COLUMN public.profiles.avatar_emoji IS
  'Optional custom avatar emoji for this person. Falls back to the roster emoji in code if NULL.';
