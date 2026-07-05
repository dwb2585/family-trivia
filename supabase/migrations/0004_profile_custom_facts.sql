-- Family Trivia — profile custom facts
-- Lets each player add their OWN questions about themselves, beyond the
-- 8 default fact_keys. E.g. "What's your favorite season?" or "Cats or dogs?"
--
-- Fields:
--   prompt — the question, shown in the fact-entry form ("What's your favorite season?")
--   label  — short noun phrase, used to build question prompts
--            ("Whose favorite season is Autumn?", "What's Morgan's favorite season?")
--   value  — the player's answer ("Autumn")
--
-- Keyed by full_name to match the profiles table.

create table if not exists public.profile_custom_facts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  prompt text not null,
  label text not null,
  value text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profile_custom_facts_name_idx on profile_custom_facts (full_name);

alter table public.profile_custom_facts enable row level security;
create policy "anon all profile_custom_facts" on public.profile_custom_facts
  for all using (true) with check (true);

-- Reuse the set_updated_at function from migration 0002
drop trigger if exists profile_custom_facts_set_updated_at on public.profile_custom_facts;
create trigger profile_custom_facts_set_updated_at
  before update on public.profile_custom_facts
  for each row execute function public.set_updated_at();