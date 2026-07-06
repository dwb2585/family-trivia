import { supabase } from "./supabase";
import type { DefaultFact } from "./supabase";

/**
 * Collaborative default-question pool. Anyone can add, edit, or delete a
 * default question. Each row's `key` is the stable fact_key used in
 * player_facts at game time; prompt + label + emoji are user-facing.
 *
 * Replaces the previous hardcoded 8 DEFAULT_FACTS array AND the
 * shared_questions Q&A bank (migration 0008).
 */

/** Load the full default-facts pool, sorted by sort_order then label. */
export async function getDefaultFacts(): Promise<DefaultFact[]> {
  const { data, error } = await supabase
    .from("default_facts")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });
  if (error) {
    console.warn("Failed to fetch default facts", error);
    return [];
  }
  return (data ?? []) as DefaultFact[];
}

/** Generate a snake_case key for a new default fact based on its label. */
export function deriveKey(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "fact"
  );
}

/** Suffix a candidate key with a numeric tail if it's already taken. */
export async function uniqueKey(baseKey: string): Promise<string> {
  const existing = new Set((await getDefaultFacts()).map((f) => f.key));
  if (!existing.has(baseKey)) return baseKey;
  for (let i = 2; i < 100; i++) {
    const candidate = `${baseKey}_${i}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${baseKey}_${Date.now()}`;
}

/**
 * Derive a default label from a prompt like "What's your favorite color?"
 * using a tiny heuristic. Returns the unchanged prompt if no clear match.
 */
export function deriveLabelFromPrompt(prompt: string): string {
  const m = prompt.match(
    /^(?:what|where|who|when|why|how)\s*(?:'s|is)\s*your\s+(.+?)\??$/i,
  );
  if (m) return m[1].trim();
  // Strip trailing punctuation, drop leading "what's" type prefixes, lower-case
  return prompt
    .replace(/^(?:what|where|who|when|why|how)\s*(?:'s|is)\s*/i, "")
    .replace(/[?.!]+$/, "")
    .trim()
    .toLowerCase()
    .slice(0, 80);
}

/** Create a new default-facts row. Pass the current user's name as `createdBy`. */
export async function createDefaultFact(input: {
  prompt: string;
  label: string;
  emoji: string;
  createdBy: string;
  sortOrder?: number;
}): Promise<DefaultFact | null> {
  const prompt = input.prompt.trim();
  const label = input.label.trim() || deriveLabelFromPrompt(prompt);
  const emoji = input.emoji.trim();
  const createdBy = input.createdBy.trim();
  if (!prompt || !label || !createdBy) return null;
  const key = await uniqueKey(deriveKey(label));
  const sortOrder = input.sortOrder ?? 100;
  const { data, error } = await supabase
    .from("default_facts")
    .insert({ key, label, prompt, emoji, sort_order: sortOrder, created_by: createdBy })
    .select()
    .single();
  if (error || !data) {
    console.warn("Failed to create default fact", error);
    return null;
  }
  return data as DefaultFact;
}

/** Edit a default fact's user-facing fields. The `key` is immutable (stable fact_key). */
export async function updateDefaultFact(
  id: string,
  patch: Partial<Pick<DefaultFact, "prompt" | "label" | "emoji" | "sort_order">>,
): Promise<void> {
  const clean: Record<string, string | number> = {};
  if (patch.prompt !== undefined) clean.prompt = patch.prompt.trim();
  if (patch.label !== undefined) clean.label = patch.label.trim();
  if (patch.emoji !== undefined) clean.emoji = patch.emoji.trim();
  if (patch.sort_order !== undefined) clean.sort_order = patch.sort_order;
  if (Object.keys(clean).length === 0) return;
  const { error } = await supabase.from("default_facts").update(clean).eq("id", id);
  if (error) console.warn("Failed to update default fact", id, error);
}

/**
 * Delete a default fact AND any player_facts rows that referenced its key.
 * The cascade matters because player_facts.fact_key is text with no FK,
 * so deleting the parent row would otherwise leave orphaned answer data.
 *
 * Reordering: deletes for the active game only really matter for facts a
 * player hasn't answered yet (no orphan); for answered ones we wipe so the
 * game's question generator only sees live facts.
 */
export async function deleteDefaultFact(id: string, key: string): Promise<void> {
  // First, drop any player_facts rows keyed to this default fact's key.
  // These belong to specific games; they're cheap to lose.
  const { error: pfErr } = await supabase
    .from("player_facts")
    .delete()
    .eq("fact_key", key);
  if (pfErr) console.warn("Failed to clear player_facts for", key, pfErr);

  const { error } = await supabase.from("default_facts").delete().eq("id", id);
  if (error) console.warn("Failed to delete default fact", id, error);
}
