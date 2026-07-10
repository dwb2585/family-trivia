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

interface NarratorLine {
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
  /** Position on screen. */
  position?: "top" | "bottom";
  /** Whether to attempt TTS. Disable for muted users. */
  enableVoice?: boolean;
  /** Fired after the current line settles (audio ends or autoDismissMs timer
   * fires). Parent should pop the head of the queue here. */
  onConsumed?: () => void;
}

/**
 * Stacked queue of narrator lines. Each one fades in, plays audio if
 * available, shows the text, then fades out and fires onDone.
 */
export function NarratorOverlay({
  lines,
  position = "top",
  enableVoice = true,
  onConsumed,
}: NarratorOverlayProps) {
  const current: NarratorLine | null = lines[0] ?? null;
  const [resolved, setResolved] = React.useState<string>("");
  const dismissTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const settleFiredRef = React.useRef(false);

  // Reset state when the head of the queue changes (new line to render).
  React.useEffect(() => {
    setResolved("");
    settleFiredRef.current = false;
  }, [current]);

  const settle = React.useCallback(() => {
    if (settleFiredRef.current) return;
    settleFiredRef.current = true;
    onConsumed?.();
  }, [onConsumed]);

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

      // Auto-dismiss timer starts once we have the text.
      if (current.autoDismissMs && current.autoDismissMs > 0) {
        dismissTimer.current = setTimeout(() => {
          settle();
        }, current.autoDismissMs);
      }

      if (enableVoice && line) {
        const blob = await fetchTts(line, undefined, ac.signal);
        if (cancelled || !blob) return;
        // Stop any prior audio before playing the new one.
        if (audioRef.current) {
          audioRef.current.pause();
        }
        audioRef.current = playAudioBlob(blob, 0.9);
        if (audioRef.current) {
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
  }, [current, enableVoice, settle]);

  return (
    <AnimatePresence>
      {resolved ? (
        <motion.div
          key={current ? `${current.kind}-${resolved.slice(0, 12)}` : "idle"}
          initial={{ opacity: 0, y: position === "top" ? -16 : 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: position === "top" ? -8 : 8, scale: 0.98 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className={cn(
            "pointer-events-none fixed left-1/2 -translate-x-1/2 z-40 w-[92vw] max-w-md",
            position === "top" ? "top-3" : "bottom-3",
          )}
          role="status"
          aria-live="polite"
          aria-label="AI narrator"
        >
          <div
            className={cn(
              "flex items-start gap-3 p-3 rounded-2xl",
              "bg-gradient-to-br from-stage/95 via-stage/90 to-stage/95",
              "border border-cyan/30 shadow-cyan-glow backdrop-blur",
            )}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan/30 to-violet/30 border border-cyan/40 flex items-center justify-center text-lg shrink-0">
              🎙️
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[9px] uppercase tracking-[0.18em] text-cyan font-bold mb-0.5">
                Your Host
              </div>
              <p className="text-sm text-foreground leading-snug">{resolved}</p>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}