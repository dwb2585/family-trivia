import { supabase } from "./supabase";
import type { Profile } from "./supabase";
import { DEFAULT_FACTS } from "./facts";

export async function getProfile(fullName: string): Promise<Profile | null> {
  if (!fullName || !fullName.trim()) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("full_name", fullName.trim())
    .maybeSingle();
  if (error) {
    console.warn("Failed to fetch profile for", fullName, error);
    return null;
  }
  if (!data) return null;
  const facts = (data.facts as Record<string, string>) || {};
  return data as Profile;
}

export async function upsertProfile(
  fullName: string,
  facts: Record<string, string>,
  validKeys?: Set<string>,
): Promise<void> {
  if (!fullName || !fullName.trim()) return;

  // Prefer the caller's live pool when provided. Fall back to the static
  // seed list so older callers (and tests) keep working.
  const knownKeys =
    validKeys ?? new Set(DEFAULT_FACTS.map((f) => f.key));
  const incoming: Record<string, string> = {};
  for (const [k, v] of Object.entries(facts)) {
    const trimmed = (v || "").trim();
    if (trimmed && knownKeys.has(k)) {
      incoming[k] = trimmed;
    }
  }

  if (Object.keys(incoming).length === 0) return;

  // MERGE, don't replace. profiles.facts is a JSONB column with no FK, so
  // saving with `cleanFacts` alone wipes any keys the caller doesn't know
  // about (e.g., answers saved under old default_facts keys before a pool
  // migration like 0010). Preserve them by reading the existing row and
  // overlaying only the filtered incoming values.
  const trimmed = fullName.trim();
  const existing = await getProfile(trimmed);
  const merged: Record<string, string> = { ...(existing?.facts || {}) };
  for (const [k, v] of Object.entries(incoming)) {
    merged[k] = v;
  }

  const { error } = await supabase
    .from("profiles")
    .upsert(
      { full_name: trimmed, facts: merged },
      { onConflict: "full_name" },
    );
  if (error) {
    console.warn("Failed to upsert profile for", fullName, error);
  }
}

// ============================================================================
// Default-fact pool CRUD lives in `web/src/lib/defaultFacts.ts`
// ============================================================================

// ============================================================================
// Profile avatar
// ============================================================================

/**
 * Fetch profiles for many full_names in one query.
 * Returns a Map of full_name -> Profile. Missing names are absent from the map.
 * Used by App.tsx to pre-resolve avatar emojis for everyone in a game.
 */
export async function getProfilesForNames(
  fullNames: string[],
): Promise<Record<string, Profile>> {
  const trimmed = fullNames.map((n) => n.trim()).filter(Boolean);
  if (trimmed.length === 0) return {};
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .in("full_name", trimmed);
  if (error || !data) {
    console.warn("Failed to fetch profiles", error);
    return {};
  }
  const out: Record<string, Profile> = {};
  for (const row of data as Profile[]) {
    out[row.full_name] = row;
  }
  return out;
}

/**
 * Set just the avatar emoji for a profile. No-ops if the name is empty.
 * Leaves the rest of the profile (facts, custom_facts) untouched.
 */
export async function setProfileAvatar(fullName: string, emoji: string): Promise<void> {
  if (!fullName || !fullName.trim()) return;
  const cleaned = (emoji || "").trim();
  // Best-effort write even when the user is clearing the avatar to fall
  // back to the roster default (empty string means "use roster emoji").
  const { error } = await supabase
    .from("profiles")
    .upsert(
      { full_name: fullName.trim(), avatar_emoji: cleaned || null },
      { onConflict: "full_name" },
    );
  if (error) console.warn("Failed to set avatar for", fullName, error);
}
