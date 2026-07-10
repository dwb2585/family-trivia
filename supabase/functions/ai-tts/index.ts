// AI text-to-speech for the family-trivia game.
//
// Synthesizes short narration lines via MiniMax T2A v2 (speech-2.8-hd).
// Returns raw audio/mpeg bytes ready to be played by an <audio> element
// or a MediaSource buffer.
//
// Auth: server-side MINIMAX_API_KEY (set via `supabase secrets set`).
// Never exposed to the client.
//
// Request:
//   POST /functions/v1/ai-tts
//   {
//     text: string,
//     voice?: string,           // default: "English_expressive_narrator"
//     speed?: number,           // default: 1.0
//     vol?: number,             // default: 1.0
//     pitch?: number,           // default: 0
//   }
//
// Response:
//   200 OK, Content-Type: audio/mpeg, body = raw MP3 bytes
//   Cache-Control: public, max-age=3600
//   Content-Disposition: inline

import { corsHeaders } from "../_shared/cors.ts";

const MINIMAX_TTS_BASE = Deno.env.get("MINIMAX_TTS_BASE_URL") || "https://api.minimax.io";
const MINIMAX_API_KEY = Deno.env.get("MINIMAX_API_KEY");
const DEFAULT_VOICE = Deno.env.get("MINIMAX_TTS_DEFAULT_VOICE") || "English_expressive_narrator";
const TTS_MODEL = Deno.env.get("MINIMAX_TTS_MODEL") || "speech-2.8-hd";

interface RequestBody {
  text?: string;
  voice?: string;
  speed?: number;
  vol?: number;
  pitch?: number;
}

interface T2AResp {
  data?: { audio?: string };
  base_resp?: { status_code?: number; status_msg?: string };
  // some failures land here
  message?: string;
}

function jsonError(status: number, message: string, extra?: Record<string, unknown>): Response {
  return new Response(
    JSON.stringify({ error: message, ...(extra || {}) }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

/**
 * Convert a hex string to a Uint8Array.
 *
 * Accepts the format MiniMax T2A v2 returns: a hex-encoded string in
 * `data.audio`. Falls back to base64 if the string isn't valid hex
 * (so we're robust to either encoding variant).
 */
function decodeAudio(encoded: string): Uint8Array {
  // Try hex first — every char must be [0-9a-fA-F] and length must be even.
  const looksLikeHex = encoded.length > 0 && encoded.length % 2 === 0 &&
    /^[0-9a-fA-F]+$/.test(encoded);
  if (looksLikeHex) {
    const bytes = new Uint8Array(encoded.length / 2);
    for (let i = 0; i < encoded.length; i += 2) {
      bytes[i / 2] = parseInt(encoded.substring(i, i + 2), 16);
    }
    return bytes;
  }
  // Fallback: base64.
  const bin = atob(encoded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonError(405, "Method not allowed");
  }

  if (!MINIMAX_API_KEY) {
    return jsonError(503, "MINIMAX_API_KEY not set on server", {
      hint: "Run `supabase secrets set MINIMAX_API_KEY=...` and redeploy.",
    });
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const text = (body.text || "").trim();
  if (!text) return jsonError(400, "text is required");
  if (text.length > 5000) return jsonError(400, "text too long (max 5000 chars)");

  const voice = (body.voice || DEFAULT_VOICE).toString();
  const speed = typeof body.speed === "number" ? body.speed : 1.0;
  const vol = typeof body.vol === "number" ? body.vol : 1.0;
  const pitch = typeof body.pitch === "number" ? body.pitch : 0;

  // T2A v2 accepts speed/vol in [0.5, 2.0] and pitch in [-12, 12]. Clamp
  // softly so a bad client doesn't crash the request.
  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
  const safeSpeed = clamp(speed, 0.5, 2.0);
  const safeVol = clamp(vol, 0.1, 10.0);
  const safePitch = clamp(pitch, -12, 12);

  const payload = {
    model: TTS_MODEL,
    text,
    voice_setting: {
      voice_id: voice,
      speed: safeSpeed,
      vol: safeVol,
      pitch: safePitch,
    },
    audio_setting: {
      format: "mp3",
      sample_rate: 32000,
    },
  };

  try {
    const res = await fetch(`${MINIMAX_TTS_BASE}/v1/t2a_v2`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MINIMAX_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("MiniMax TTS error:", res.status, errText.slice(0, 500));
      return jsonError(502, `MiniMax TTS ${res.status}`, { details: errText.slice(0, 200) });
    }

    const data = (await res.json()) as T2AResp;
    const audio = data?.data?.audio;
    if (!audio) {
      console.error("MiniMax TTS: no audio in response", JSON.stringify(data).slice(0, 500));
      return jsonError(502, "MiniMax TTS returned no audio", {
        base_resp: data?.base_resp,
      });
    }

    let bytes: Uint8Array;
    try {
      bytes = decodeAudio(audio);
    } catch (e) {
      console.error("Audio decode error:", e);
      return jsonError(502, "Failed to decode audio payload", {
        hint: (e as Error).message,
      });
    }

    return new Response(bytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "public, max-age=3600",
        "Content-Disposition": "inline",
      },
    });
  } catch (e) {
    console.error("Edge function error:", e);
    return jsonError(500, (e as Error).message || "Internal error");
  }
});