import { supabase } from "./supabase";
import type { CustomQuestion } from "./supabase";

/**
 * Shared custom-question pool. Any player can write questions about anyone
 * in the family roster; any player can delete. At game-start time the
 * engine filters by `subject_full_name` being a current player and turns
 * each into a who-said-it question.
 *
 * Replaces the old per-player `profile_custom_facts` model (migration 0006).
 */

/** Fetch every question in the shared pool. */
export async function getCustomQuestions(): Promise<CustomQuestion[]> {
  const { data, error } = await supabase
    .from("custom_questions")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("Failed to fetch custom questions", error);
    return [];
  }
  return (data ?? []) as CustomQuestion[];
}

/**
 * Fetch shared custom questions whose subject is in `playerNames`.
 * Called from handleStart so we only generate questions about people
 * actually playing this game.
 */
export async function getCustomQuestionsForGame(
  playerNames: string[],
): Promise<CustomQuestion[]> {
  const trimmed = playerNames.map((n) => n.trim()).filter(Boolean);
  if (trimmed.length === 0) return [];
  const { data, error } = await supabase
    .from("custom_questions")
    .select("*")
    .in("subject_full_name", trimmed);
  if (error) {
    console.warn("Failed to fetch custom questions for game", error);
    return [];
  }
  return (data ?? []) as CustomQuestion[];
}

/** Add a new question to the shared pool. Returns the inserted row, or null on failure. */
export async function createCustomQuestion(input: {
  prompt: string;
  label: string;
  value: string;
  subject_full_name: string;
  created_by: string;
}): Promise<CustomQuestion | null> {
  const prompt = input.prompt.trim();
  const label = input.label.trim();
  const value = input.value.trim();
  const subject = input.subject_full_name.trim();
  const createdBy = input.created_by.trim();
  if (!prompt || !label || !subject || !createdBy) return null;
  const { data, error } = await supabase
    .from("custom_questions")
    .insert({
      prompt,
      label,
      value,
      subject_full_name: subject,
      created_by: createdBy,
    })
    .select()
    .single();
  if (error || !data) {
    console.warn("Failed to create custom question", error);
    return null;
  }
  return data as CustomQuestion;
}

/** Edit a custom question's text fields. Whitespace-only edits are ignored. */
export async function updateCustomQuestion(
  id: string,
  patch: Partial<Pick<CustomQuestion, "prompt" | "label" | "value" | "subject_full_name">>,
): Promise<void> {
  const clean: Record<string, string> = {};
  if (patch.prompt !== undefined) clean.prompt = patch.prompt.trim();
  if (patch.label !== undefined) clean.label = patch.label.trim();
  if (patch.value !== undefined) clean.value = patch.value.trim();
  if (patch.subject_full_name !== undefined) {
    clean.subject_full_name = patch.subject_full_name.trim();
  }
  if (Object.keys(clean).length === 0) return;
  const { error } = await supabase
    .from("custom_questions")
    .update(clean)
    .eq("id", id);
  if (error) console.warn("Failed to update custom question", id, error);
}

/** Remove a custom question from the shared pool. Anyone can call this. */
export async function deleteCustomQuestion(id: string): Promise<void> {
  const { error } = await supabase.from("custom_questions").delete().eq("id", id);
  if (error) console.warn("Failed to delete custom question", id, error);
}