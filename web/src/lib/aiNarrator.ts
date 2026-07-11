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

// ---------------------------------------------------------------------------
// Module-level audio cache. Lets App.tsx prefetch the next question's TTS
// while the current results are being revealed, so playback is instant when
// the host reads the next question aloud.
// Keyed by `${kind}:${contextHash}`. Blobs are guaranteed-equal only when the
// prefetched text matches the live request; otherwise the caller fetches
// fresh and the cache entry is overwritten.
// ---------------------------------------------------------------------------
interface CacheEntry {
  text: string;
  blob: Blob;
  ts: number;
}
const audioCache = new Map<string, CacheEntry>();
const MAX_CACHE = 6;

/** Cheap, stable hash of a JSON-serializable context object. Good enough
 * for cache keys (small inputs, no security concerns). */
function contextHash(ctx: object): string {
  // Sort keys for stability.
  const sortedKeys = Object.keys(ctx).sort();
  let h = "";
  for (const k of sortedKeys) {
    h += `${k}=${String((ctx as Record<string, unknown>)[k])};`;
  }
  return h;
}

/** Look up a cached audio blob for a (kind, context) pair. If found and the
 * text hasn't drifted (model could re-roll), return the blob. Accepts a
 * loosely-typed context so callers don't have to massage their domain types. */
export function getCachedAudio(
  kind: NarratorRequest["kind"],
  context: object,
  expectedText: string,
): Blob | null {
  const key = `${kind}:${contextHash(context)}`;
  const entry = audioCache.get(key);
  if (!entry) return null;
  if (entry.text !== expectedText) return null;
  // Bump freshness — keep this entry around longer than older ones.
  entry.ts = Date.now();
  return entry.blob;
}

/** Populate the audio cache. Caps total entries; oldest-first eviction. */
export function setCachedAudio(
  kind: NarratorRequest["kind"],
  context: object,
  text: string,
  blob: Blob,
): void {
  const key = `${kind}:${contextHash(context)}`;
  if (audioCache.has(key)) {
    audioCache.delete(key);
  } else if (audioCache.size >= MAX_CACHE) {
    // Find oldest by timestamp; evict it.
    let oldestKey: string | null = null;
    let oldestTs = Infinity;
    for (const [k, v] of audioCache.entries()) {
      if (v.ts < oldestTs) {
        oldestTs = v.ts;
        oldestKey = k;
      }
    }
    if (oldestKey) audioCache.delete(oldestKey);
  }
  audioCache.set(key, { text, blob, ts: Date.now() });
}

/** Returns the cache key for a (kind, context) pair. Exposed so prefetchers
 * in App.tsx can pre-fill the cache for the same key NarratorOverlay will
 * look up. */
export function audioCacheKey(kind: NarratorRequest["kind"], context: Record<string, unknown>): string {
  return `${kind}:${contextHash(context)}`;
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