// Client wrappers for the AI narrator + TTS Supabase Edge Functions.
// Failures are best-effort: the caller passes a `fallback` string and the
// overlay displays whatever it gets back, audio or no.

import { supabaseUrl, supabaseAnonKey } from "./supabase";

const BASE = `${supabaseUrl}/functions/v1`;

interface NarratorRequest {
  kind: "intro" | "outro" | "reaction" | "score_summary" | "tiebreak_tease" | "commentary" | "read_question" | "subject_intro";
  context: Record<string, unknown>;
}

interface NarratorResponse {
  line: string;
  /** Populated when the Edge Function returned a fallback due to API error. */
  fallback?: boolean;
  /** Populated when the call itself failed (network, key missing, etc.). */
  error?: string;
}

/**
 * Fetch a single narrator line. Returns the line as text, or `fallback` on
 * any error. Caller is responsible for trying to play audio via fetchTts.
 */
export async function fetchNarration(
  req: NarratorRequest,
  fallback: string,
  signal?: AbortSignal,
): Promise<string> {
  try {
    const res = await fetch(`${BASE}/ai-narrator`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(req),
      signal,
    });
    if (!res.ok) return fallback;
    const data = (await res.json()) as NarratorResponse;
    return (data.line ?? "").trim() || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Fetch TTS audio as a Blob. Returns null on any error (caller falls back
 * to text-only display).
 */
export async function fetchTts(
  text: string,
  voice?: string,
  signal?: AbortSignal,
): Promise<Blob | null> {
  if (!text.trim()) return null;
  try {
    const res = await fetch(`${BASE}/ai-tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ text, voice }),
      signal,
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.startsWith("audio/")) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

/** Convert a Blob into an object URL and play it once. */
export function playAudioBlob(blob: Blob, volume = 1): HTMLAudioElement {
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.volume = Math.min(1, Math.max(0, volume));
  audio.onended = () => URL.revokeObjectURL(url);
  audio.onerror = () => URL.revokeObjectURL(url);
  void audio.play().catch(() => {
    /* autoplay blocked — ignore */
  });
  return audio;
}