import * as React from "react";
import { cn } from "@/lib/utils";

// Type narrowing for the experimental Web Speech API. Both Chrome and
// Safari expose it as webkitSpeechRecognition; Safari iOS 14.5+ has it
// on window.SpeechRecognition too.
type SR = typeof window extends { SpeechRecognition: infer T } ? T : any;
function getSpeechRecognition(): SR | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

interface VoiceInputFieldProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  /** Show disabled state with reduced opacity. */
  disabled?: boolean;
  /** Override the input class for size tweaks. */
  inputClassName?: string;
  /** Aria label for the voice button. Defaults to "Voice input". */
  ariaLabel?: string;
}

/**
 * Text input with a mic button. Tap to start dictating, tap again to
 * stop (or just stop talking and it'll auto-end). Uses the Web Speech
 * API — works in mobile Safari and Chrome. No backend, no API key.
 *
 * While listening, interim transcript is shown in italic; final result
 * replaces the input value. Errors (mic denied / no support) appear
 * briefly below the input as a small inline message.
 */
export function VoiceInputField({
  value,
  onChange,
  placeholder,
  maxLength = 120,
  disabled,
  inputClassName,
  ariaLabel = "Voice input",
}: VoiceInputFieldProps) {
  const recognitionRef = React.useRef<any>(null);
  const [supported, setSupported] = React.useState(true);
  const [listening, setListening] = React.useState(false);
  const [interim, setInterim] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  // Detect support once on mount so we don't render the mic button
  // uselessly on Firefox desktop (which has no SpeechRecognition).
  React.useEffect(() => {
    setSupported(getSpeechRecognition() != null);
  }, []);

  // Clean up on unmount so a hot-reload doesn't leak listeners.
  React.useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort?.();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    };
  }, []);

  function startListening() {
    const SR = getSpeechRecognition();
    if (!SR) {
      setSupported(false);
      return;
    }
    setError(null);
    setInterim("");
    const rec = new SR();
    rec.continuous = false;       // stop after one utterance
    rec.interimResults = true;    // live preview while speaking
    rec.lang = navigator.language || "en-US";
    rec.maxAlternatives = 1;

    rec.onresult = (event: any) => {
      let final = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interimText += r[0].transcript;
      }
      if (final) {
        // Final result replaces whatever's there. Users dictating one
        // short answer at a time is the dominant use case; if they
        // want to append, they can type first, then mic.
        const cleaned = final.trim();
        onChange(cleaned.slice(0, maxLength));
        setInterim("");
      } else if (interimText) {
        setInterim(interimText);
      }
    };

    rec.onerror = (event: any) => {
      const code = event?.error ?? "unknown";
      if (code === "not-allowed" || code === "service-not-allowed") {
        setError("Mic permission denied");
      } else if (code === "no-speech") {
        setError("Didn't catch that — try again");
      } else if (code === "audio-capture") {
        setError("No microphone found");
      } else if (code === "network") {
        setError("Voice needs a network connection");
      } else {
        setError(`Voice error: ${code}`);
      }
      setListening(false);
      setInterim("");
    };

    rec.onend = () => {
      setListening(false);
      setInterim("");
    };

    try {
      rec.start();
      recognitionRef.current = rec;
      setListening(true);
    } catch (e) {
      setError("Couldn't start voice");
      setListening(false);
    }
  }

  function stopListening() {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      // ignore
    }
    setListening(false);
    setInterim("");
  }

  function toggle() {
    if (listening) stopListening();
    else startListening();
  }

  const displayValue = listening && interim ? interim : value;

  return (
    <div className="relative">
      <input
        type="text"
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "w-full h-11 px-3 pr-12 rounded-lg",
          "bg-stage/60 border",
          listening ? "border-cyan shadow-cyan-glow-sm" : "border-border",
          "text-foreground placeholder:text-foreground/30",
          "focus:outline-none focus:border-cyan focus:shadow-cyan-glow-sm",
          "transition-colors",
          listening && "placeholder:opacity-0",
          disabled && "opacity-60",
          inputClassName,
        )}
      />
      {supported ? (
        <button
          type="button"
          onClick={toggle}
          aria-label={listening ? "Stop voice input" : ariaLabel}
          title={
            listening
              ? "Stop listening"
              : "Tap to dictate — works in Safari & Chrome"
          }
          disabled={disabled}
          className={cn(
            "absolute right-1.5 top-1/2 -translate-y-1/2",
            "w-8 h-8 rounded-full flex items-center justify-center",
            "transition-all duration-150",
            listening
              ? "bg-danger/90 text-white shadow-danger-glow-sm animate-pulse"
              : "bg-cyan/10 text-cyan hover:bg-cyan/20 border border-cyan/30",
            disabled && "opacity-40 pointer-events-none",
          )}
        >
          {listening ? (
            // Stop icon (square)
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
              <rect x="2" y="2" width="10" height="10" rx="1.5" />
            </svg>
          ) : (
            // Mic icon
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="8" y1="22" x2="16" y2="22" />
            </svg>
          )}
        </button>
      ) : null}
      {listening && interim ? (
        <div className="absolute right-12 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-[0.18em] text-cyan/80 font-bold pointer-events-none">
          ● listening
        </div>
      ) : null}
      {error ? (
        <p className="text-[11px] text-danger mt-1.5 px-0.5" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}