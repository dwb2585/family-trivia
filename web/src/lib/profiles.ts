import { supabase } from "./supabase";
import type { Profile, ProfileCustomFact } from "./supabase";
import { DEFAULT_FACTS } from "./facts";

// ============================================================================
// Default facts (the 8 built-in question keys, e.g. favorite_movie)
// ============================================================================

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
// Custom facts (user-defined questions beyond the 8 defaults)
// ============================================================================

export async function getCustomFacts(fullName: string): Promise<ProfileCustomFact[]> {
  if (!fullName || !fullName.trim()) return [];
  const { data, error } = await supabase
    .from("profile_custom_facts")
    .select("*")
    .eq("full_name", fullName.trim())
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("Failed to fetch custom facts for", fullName, error);
    return [];
  }
  return (data ?? []) as ProfileCustomFact[];
}

export async function createCustomFact(
  fullName: string,
  prompt: string,
  label: string,
  value: string,
): Promise<ProfileCustomFact | null> {
  if (!fullName || !prompt.trim() || !label.trim()) return null;
  const { data, error } = await supabase
    .from("profile_custom_facts")
    .insert({
      full_name: fullName.trim(),
      prompt: prompt.trim(),
      label: label.trim(),
      value: value.trim(),
    })
    .select()
    .single();
  if (error || !data) {
    console.warn("Failed to create custom fact", error);
    return null;
  }
  return data as ProfileCustomFact;
}

export async function updateCustomFact(
  id: string,
  patch: Partial<Pick<ProfileCustomFact, "prompt" | "label" | "value">>,
): Promise<void> {
  const clean: Record<string, string> = {};
  if (patch.prompt !== undefined) clean.prompt = patch.prompt.trim();
  if (patch.label !== undefined) clean.label = patch.label.trim();
  if (patch.value !== undefined) clean.value = patch.value.trim();
  if (Object.keys(clean).length === 0) return;
  const { error } = await supabase
    .from("profile_custom_facts")
    .update(clean)
    .eq("id", id);
  if (error) console.warn("Failed to update custom fact", id, error);
}

export async function deleteCustomFact(id: string): Promise<void> {
  const { error } = await supabase.from("profile_custom_facts").delete().eq("id", id);
  if (error) console.warn("Failed to delete custom fact", id, error);
}