import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle, GlowCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Marquee } from "@/components/ui/Marquee";
import { FAMILY, avatarFor } from "@/lib/family";
import type { Player } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface FinalProps {
  players: Player[];
  avatarOverrides: Record<string, string>;
  onPlayAgain: () => void;
  onLeave: () => void;
}

/** Look up the CWABS letter + color + avatar emoji for a name. */
function familyMeta(name: string, overrides?: Record<string, string>): { letter: string; color: string; emoji: string } {
  const m = FAMILY.find((f) => f.fullName === name);
  if (!m) {
    return { letter: name[0]?.toUpperCase() ?? "?", color: "hsl(var(--cyan))", emoji: "" };
  }
  // Use override emoji if set, else the roster default.
  const overrideEmoji = overrides?.[name];
  return { letter: m.letter, color: m.color, emoji: overrideEmoji || m.emoji };
}

export function Final({ players, avatarOverrides, onPlayAgain, onLeave }: FinalProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    setConfetti(true);
    const t = setTimeout(() => setConfetti(false), 5000);
    return () => clearTimeout(t);
  }, []);

  const winnerMeta = winner ? familyMeta(winner.name, avatarOverrides) : null;

  return (
    <div className="relative min-h-screen flex flex-col items-center px-4 py-8 overflow-hidden bg-grid">
      <div className="bg-aurora" />

      {/* Confetti */}
      {confetti ? (
        <div className="absolute inset-0 pointer-events-none z-0">
          {Array.from({ length: 40 }).map((_, i) => {
            const colors = [
              "hsl(var(--cyan))",
              "hsl(var(--gold))",
              "hsl(var(--violet))",
              "hsl(210 25% 96%)",
            ];
            return (
              <motion.span
                key={i}
                initial={{
                  y: -20,
                  x: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 400),
                  rotate: 0,
                }}
                animate={{
                  y: (typeof window !== "undefined" ? window.innerHeight : 800) + 20,
                  rotate: 720,
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  delay: Math.random() * 2,
                  ease: "linear",
                }}
                className="absolute inline-block w-2 h-3 rounded-sm"
                style={{ backgroundColor: colors[i % 4] }}
              />
            );
          })}
        </div>
      ) : null}

      <div className="relative z-10 w-full max-w-md flex-1 flex flex-col">
        <Marquee className="mb-6" />

        {/* Winner banner with gradient */}
        <div className="text-center mb-6">
          <Badge variant="gold" className="mb-3">GAME OVER</Badge>
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1
              className="font-display text-5xl sm:text-6xl leading-none mb-2 flex items-baseline justify-center gap-3"
              style={{
                background: "linear-gradient(135deg, hsl(var(--gold)) 0%, hsl(38 100% 72%) 60%, hsl(var(--gold)) 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                filter: "drop-shadow(0 0 24px hsl(var(--gold) / 0.5))",
              }}
            >
              {winner ? (
                <>
                  {winnerMeta?.emoji ? (
                    <span className="text-4xl" style={{ filter: "none" }}>
                      {winnerMeta.emoji}
                    </span>
                  ) : null}
                  {winner.name}
                </>
              ) : "Tie!"}
            </h1>
            <p className="text-cream/70 text-base mt-2">
              {winner ? "takes the win " : ""}
            </p>
          </motion.div>
        </div>

        {/* Standings */}
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle>Final Standings</CardTitle>
          </CardHeader>
          <CardBody className="pt-2">
            <ol className="space-y-2">
              {sorted.map((p, i) => {
                const meta = familyMeta(p.name, avatarOverrides);
                const isPodium = i < 3;
                const isFirst = i === 0;
                return (
                  <motion.li
                    key={p.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                    className={cn(
                      "flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all",
                      isFirst
                        ? "bg-gradient-to-r from-gold/15 to-gold/5 border-gold/60 shadow-[0_0_20px_hsl(var(--gold)/0.25)]"
                        : isPodium
                        ? "bg-cyan/5 border-cyan/30"
                        : "bg-stage/40 border-border",
                    )}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span
                        className={cn(
                          "font-display text-2xl w-8 text-center",
                          isPodium ? "text-foreground" : "text-cream/50",
                        )}
                      >
                        {isFirst ? "1" : isPodium ? (i === 1 ? "2" : "3") : i + 1}
                      </span>
                      <span
                        className="w-7 h-7 rounded-md flex items-center justify-center text-sm font-bold text-stage shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${meta.color}, ${meta.color}dd)`,
                          boxShadow: isFirst ? `0 0 12px ${meta.color}` : undefined,
                        }}
                      >
                        {meta.letter}
                      </span>
                      <span className="font-semibold truncate">{p.name}</span>
                    </span>
                    <span
                      className={cn(
                        "font-mono font-bold text-lg",
                        isFirst ? "text-gold" : isPodium ? "text-cyan" : "text-cream/70",
                      )}
                    >
                      {p.score}
                    </span>
                  </motion.li>
                );
              })}
            </ol>
          </CardBody>
        </Card>

        <div className="mt-6 space-y-2">
          <Button onClick={onPlayAgain} size="lg" fullWidth variant="gold" shimmer>
            New Game
          </Button>
          <Button onClick={onLeave} variant="ghost" size="md" fullWidth>
            Leave
          </Button>
        </div>

        <Marquee className="mt-6" />
      </div>
    </div>
  );
}