import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchNarration, fetchTts, playAudioBlob } from "@/lib/aiNarrator";
import { cn } from "@/lib/utils";

export type NarratorKind =
  | "intro"
  | "outro"
  | "reaction"
  | "score_summary"
  | "tiebreak_tease";

export interface NarratorContext {
  questionText?: string;
  subjectName?: string;
  correctAnswer?: string;
  isCorrect?: boolean;
  playerName?: string;
  score?: number;
  round?: number;
  totalRounds?: number;
  players?: { name: string; score: number }[];
  leaderName?: string;
  runnerUpName?: string;
  scoreGap?: number;
  correctStreak?: number;
}

export interface NarratorLine {
  kind: NarratorKind;
  context: NarratorContext;
  /** Static fallback used if the Edge Function call fails entirely. */
  fallback: string;
  /** Auto-dismiss after this many ms. 0 = persist until manually cleared. */
  autoDismissMs?: number;
}

interface NarratorOverlayProps {
  /** Queue of lines. The first one is currently active; once it completes
   * the parent is expected to remove it from the queue. */
  lines: NarratorLine[];
  /** Whether the user has opted into hearing voice. False = text only. */
  voiceEnabled: boolean;
  /** Fired after the current line settles (audio ends or autoDismissMs timer
   * fires). Parent should pop the head of the queue here. */
  onConsumed: () => void;
  /** Fired when the user taps the "Hear it" button. Parent should flip
   * voiceEnabled to true (and persist if desired). */
  onEnableVoice?: () => void;
}

/**
 * Stacked queue of narrator lines. Bottom-right pill that fades in,
 * shows text, plays audio (if opted in), then dismisses and fires onConsumed.
 */
export function NarratorOverlay({
  lines,
  voiceEnabled,
  onConsumed,
  onEnableVoice,
}: NarratorOverlayProps) {
  const current: NarratorLine | null = lines[0] ?? null;
  const [resolved, setResolved] = React.useState<string>("");
  const [state, setState] = React.useState<"loading" | "ready" | "speaking">("loading");

  // Keep onConsumed in a ref so the fetch effect doesn't re-run whenever
  // the parent's inline callback identity changes on every render.
  const onConsumedRef = React.useRef(onConsumed);
  React.useEffect(() => {
    onConsumedRef.current = onConsumed;
  }, [onConsumed]);

  const dismissTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const settleFiredRef = React.useRef(false);

  const settle = React.useCallback(() => {
    if (settleFiredRef.current) return;
    settleFiredRef.current = true;
    onConsumedRef.current();
  }, []);

  // Reset state when the head of the queue changes (new line to render).
  React.useEffect(() => {
    setResolved("");
    setState("loading");
    settleFiredRef.current = false;
  }, [current]);

  // Fetch narration + audio for the current line.
  React.useEffect(() => {
    if (!current) return;
    const ac = new AbortController();
    let cancelled = false;

    void (async () => {
      const line = await fetchNarration(
        { kind: current.kind, context: current.context as Record<string, unknown> },
        current.fallback,
        ac.signal,
      );
      if (cancelled) return;
      setResolved(line);
      setState("ready");

      // Auto-dismiss timer starts once we have the text.
      if (current.autoDismissMs && current.autoDismissMs > 0) {
        dismissTimer.current = setTimeout(() => {
          settle();
        }, current.autoDismissMs);
      }

      // Only attempt voice playback if the user explicitly opted in.
      // (Browsers — iOS Safari especially — block autoplay otherwise.)
      if (voiceEnabled && line) {
        const blob = await fetchTts(line, undefined, ac.signal);
        if (cancelled || !blob) return;
        // Stop any prior audio before playing the new one.
        if (audioRef.current) {
          audioRef.current.pause();
        }
        audioRef.current = playAudioBlob(blob, 0.9);
        if (audioRef.current) {
          setState("speaking");
          audioRef.current.onended = () => {
            if (dismissTimer.current) {
              clearTimeout(dismissTimer.current);
              dismissTimer.current = null;
            }
            settle();
          };
        }
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
        dismissTimer.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [current, voiceEnabled, settle]);

  return (
    <AnimatePresence>
      {resolved ? (
        <motion.div
          key={current ? `${current.kind}-${resolved.slice(0, 12)}` : "idle"}
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="pointer-events-auto fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-sm z-30"
          role="status"
          aria-live="polite"
          aria-label="AI narrator"
        >
          <div
            className={cn(
              "flex items-start gap-2.5 p-2.5 pr-3 rounded-2xl",
              "bg-gradient-to-br from-stage/95 via-stage/90 to-stage/95",
              "border border-cyan/30 shadow-cyan-glow backdrop-blur",
            )}
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan/30 to-violet/30 border border-cyan/40 flex items-center justify-center text-lg shrink-0">
              {state === "speaking" ? "🗣️" : "🎙️"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[9px] uppercase tracking-[0.18em] text-cyan font-bold">
                  Your Host
                </span>
                {state === "speaking" ? (
                  <span className="text-[9px] uppercase tracking-[0.18em] text-violet font-bold animate-pulse">
                    Speaking
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-foreground leading-snug">{resolved}</p>
              {!voiceEnabled && onEnableVoice ? (
                <button
                  type="button"
                  onClick={onEnableVoice}
                  className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-violet hover:text-cyan transition-colors"
                >
                  🔊 Hear it
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={settle}
              aria-label="Dismiss narrator"
              className="text-cream/40 hover:text-cream text-xs leading-none p-1 rounded-full hover:bg-cyan/10 transition-colors"
            >
              ✕
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
