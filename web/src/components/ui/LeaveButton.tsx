import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface LeaveButtonProps {
  onLeave: () => void;
  confirmMessage?: string;
  warning?: string;
  className?: string;
}

/**
 * Small "‹" back button in the top-left of the screen, modern HUD style.
 * On tap, shows an inline confirm modal before actually leaving.
 */
export function LeaveButton({
  onLeave,
  confirmMessage = "Leave the game?",
  warning,
  className,
}: LeaveButtonProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <button
        onClick={() => setConfirming(true)}
        aria-label="Leave game"
        className={cn(
          "fixed top-3 left-3 z-40",
          "w-11 h-11 rounded-xl",
          "bg-card/80 backdrop-blur-md border border-border",
          "text-foreground/80 hover:text-cyan hover:border-cyan/60 hover:shadow-cyan-glow-sm",
          "flex items-center justify-center",
          "transition-all",
          "active:scale-95",
          className,
        )}
      >
        <span className="text-lg leading-none font-bold">‹</span>
      </button>

      <AnimatePresence>
        {confirming ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-stage/85 backdrop-blur-md"
            onClick={() => setConfirming(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm surface-card p-6 shadow-cyan-glow"
            >
              <h3 className="font-display text-2xl tracking-wide mb-2 text-center">
                Leave the game?
              </h3>
              <p className="text-foreground/80 text-center mb-1">
                {confirmMessage}
              </p>
              {warning ? (
                <p className="text-danger text-sm text-center mb-5 font-semibold">
                  {warning}
                </p>
              ) : (
                <div className="mb-5" />
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirming(false)}
                  className="flex-1 h-12 rounded-xl bg-stage/70 border border-border text-foreground font-bold hover:bg-stage transition-colors"
                >
                  Stay
                </button>
                <button
                  onClick={onLeave}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-br from-red to-[hsl(355,95%,55%)] text-cream font-bold btn-3d transition-all"
                >
                  Leave
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}