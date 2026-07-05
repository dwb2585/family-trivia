-- Family Trivia — profiles table
-- Stores each person's saved facts across games so they don't have to
-- re-enter them next time. Keyed by full_name (e.g. "Meg Shimizu").

create table if not exists public.profiles (
  full_name text primary key,
  facts jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "anon all profiles" on public.profiles for all to anon using (true) with check (true);

-- Auto-update updated_at on row updates
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- No realtime on profiles — read-once on lobby join, write-once on Ready.
alter publication supabase_realtime add table profiles;