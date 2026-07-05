import { useState } from "react";
import { cn } from "@/lib/utils";

interface LeaveButtonProps {
  /** Called when user confirms they want to leave */
  onLeave: () => void;
  /** Confirm prompt — defaults to a generic one */
  confirmMessage?: string;
  /** Extra detail in the confirm (e.g. "Game will end for everyone") */
  warning?: string;
  className?: string;
}

/**
 * Small "‹" back button in the top-left of the screen.
 * On tap, shows an inline confirm prompt before actually leaving — safer than
 * native window.confirm() (which blocks the main thread and looks awful).
 */
export function LeaveButton({
  onLeave,
  confirmMessage = "Leave the game?",
  warning,
  className,
}: LeaveButtonProps) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center px-6",
          "bg-stage/80 backdrop-blur-sm",
          className,
        )}
        onClick={() => setConfirming(false)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm bg-card border-2 border-gold/40 rounded-2xl p-6 shadow-2xl animate-fade-in-up"
        >
          <h3 className="font-display text-2xl text-gold mb-2 text-center">
            Leave the game?
          </h3>
          <p className="text-foreground/80 text-center mb-1">
            {confirmMessage}
          </p>
          {warning ? (
            <p className="text-danger/90 text-sm text-center mb-5 font-semibold">
              ⚠ {warning}
            </p>
          ) : (
            <div className="mb-5" />
          )}
          <div className="flex gap-3">
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 h-12 rounded-xl bg-stage/60 border border-border text-foreground font-bold hover:bg-stage transition-colors"
            >
              Stay
            </button>
            <button
              onClick={onLeave}
              className="flex-1 h-12 rounded-xl bg-danger text-cream font-bold hover:bg-danger/90 transition-colors"
            >
              Leave
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      aria-label="Leave game"
      className={cn(
        "fixed top-3 left-3 z-40",
        "w-10 h-10 rounded-full",
        "bg-card/80 border border-border backdrop-blur-sm",
        "text-foreground/80 hover:text-gold hover:border-gold/60",
        "flex items-center justify-center",
        "transition-all",
        "active:scale-95",
        className,
      )}
    >
      <span className="text-xl leading-none">‹</span>
    </button>
  );
}