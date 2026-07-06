import { supabase } from "./supabase";
import type { SharedQuestion, SharedQuestionAnswer, SharedQuestionWithAnswers } from "./supabase";

/**
 * Community Q&A bank. Anyone can post a question; anyone can answer it
 * (one answer per person per question); anyone can delete either.
 *
 * The shape is intentionally trivial: a question is just a prompt, and
 * answers are flat rows keyed by submitter. The trivia engine asks
 * "what is [name]\u2019s answer to [prompt]?" at game time.
 */

/** Fetch every question along with all its answers. Cheap on this scale (family). */
export async function getSharedQuestionsWithAnswers(): Promise<SharedQuestionWithAnswers[]> {
  const [{ data: qs, error: qErr }, { data: ans, error: aErr }] = await Promise.all([
    supabase.from("shared_questions").select("*").order("created_at", { ascending: true }),
    supabase.from("shared_question_answers").select("*"),
  ]);
  if (qErr || aErr) {
    console.warn("Failed to fetch shared questions", qErr, aErr);
    return [];
  }
  const byQ = new Map<string, SharedQuestionWithAnswers>();
  for (const q of (qs ?? []) as SharedQuestion[]) {
    byQ.set(q.id, { ...q, answers: [] });
  }
  for (const a of (ans ?? []) as SharedQuestionAnswer[]) {
    const parent = byQ.get(a.question_id);
    if (parent) parent.answers.push(a);
  }
  return [...byQ.values()];
}

/** Post a new question. created_by is required (the local profile name). */
export async function createSharedQuestion(
  prompt: string,
  createdBy: string,
): Promise<SharedQuestion | null> {
  const p = prompt.trim();
  const by = createdBy.trim();
  if (!p || !by) return null;
  const { data, error } = await supabase
    .from("shared_questions")
    .insert({ prompt: p, created_by: by })
    .select()
    .single();
  if (error || !data) {
    console.warn("Failed to create shared question", error);
    return null;
  }
  return data as SharedQuestion;
}

/**
 * Submit (or update) the current player's answer to a question.
 * Unique (question_id, submitted_by) means re-submitting replaces the row.
 */
export async function upsertSharedAnswer(
  questionId: string,
  submittedBy: string,
  value: string,
): Promise<SharedQuestionAnswer | null> {
  const v = value.trim();
  const by = submittedBy.trim();
  if (!by || !questionId) return null;
  if (!v) {
    // Empty answer → delete any existing row for this (question, person)
    await deleteSharedAnswerFor(questionId, by);
    return null;
  }
  const { data, error } = await supabase
    .from("shared_question_answers")
    .upsert(
      { question_id: questionId, submitted_by: by, value: v },
      { onConflict: "question_id,submitted_by" },
    )
    .select()
    .single();
  if (error || !data) {
    console.warn("Failed to upsert shared answer", error);
    return null;
  }
  return data as SharedQuestionAnswer;
}

/** Delete a question and all its answers (cascade on the FK). */
export async function deleteSharedQuestion(id: string): Promise<void> {
  const { error } = await supabase.from("shared_questions").delete().eq("id", id);
  if (error) console.warn("Failed to delete shared question", id, error);
}

/** Delete a single answer row. */
export async function deleteSharedAnswer(id: string): Promise<void> {
  const { error } = await supabase
    .from("shared_question_answers")
    .delete()
    .eq("id", id);
  if (error) console.warn("Failed to delete shared answer", id, error);
}

/** Delete the (question, person) pair \u2014 used when the user clears their answer. */
export async function deleteSharedAnswerFor(questionId: string, submittedBy: string): Promise<void> {
  const { error } = await supabase
    .from("shared_question_answers")
    .delete()
    .eq("question_id", questionId)
    .eq("submitted_by", submittedBy);
  if (error) console.warn("Failed to delete answer for", submittedBy, error);
}

/**
 * Try to extract "your X" / "your X Y" from a prompt like "What's your favorite color?"
 * so we can build a friendlier game question: "What is Kate's favorite color?"
 * Returns null if no clear noun phrase is found \u2014 caller should fall back
 * to a generic restatement.
 */
export function extractShortLabel(prompt: string): string | null {
  const m = prompt.match(
    /^(?:what|where|who|when|why|how)\s*(?:'s|is)\s*your\s+(.+?)\??$/i,
  );
  if (m) return m[1].trim().toLowerCase().slice(0, 80);
  return null;
}