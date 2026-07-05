import { supabase } from "./supabase";
import { DEFAULT_FACTS } from "./facts";

export interface Profile {
  full_name: string;
  facts: Record<string, string>;
  updated_at: string;
}

/**
 * Fetch a profile by full name (e.g. "Meg Shimizu").
 * Returns null if no profile exists yet for that name, or if facts is empty.
 */
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
  if (Object.keys(facts).length === 0) return null;
  return data as Profile;
}

/**
 * Upsert a profile. Only stores known fact_keys (from DEFAULT_FACTS) with
 * non-empty trimmed values, so we never pollute the profile with garbage
 * if the schema ever changes.
 */
export async function upsertProfile(
  fullName: string,
  facts: Record<string, string>,
): Promise<void> {
  if (!fullName || !fullName.trim()) return;

  const knownKeys = new Set(DEFAULT_FACTS.map((f) => f.key));
  const cleanFacts: Record<string, string> = {};
  for (const [k, v] of Object.entries(facts)) {
    const trimmed = (v || "").trim();
    if (trimmed && knownKeys.has(k)) {
      cleanFacts[k] = trimmed;
    }
  }

  // Nothing to save — skip rather than write an empty profile
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