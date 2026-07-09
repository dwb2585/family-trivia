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
  const cleanFacts: Record<string, string> = {};
  for (const [k, v] of Object.entries(facts)) {
    const trimmed = (v || "").trim();
    if (trimmed && knownKeys.has(k)) {
      cleanFacts[k] = trimmed;
    }
  }

  if (Object.keys(cleanFacts).length === 0) return;

  const { error } = await supabase
    .from("profiles")
    .upsert(
      { full_name: fullName.trim(), facts: cleanFacts },
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
