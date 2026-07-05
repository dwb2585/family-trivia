import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Marquee } from "@/components/ui/Marquee";
import type { Player } from "@/lib/supabase";

interface FinalProps {
  players: Player[];
  onPlayAgain: () => void;
  onLeave: () => void;
}

export function Final({ players, onPlayAgain, onLeave }: FinalProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    setConfetti(true);
    const t = setTimeout(() => setConfetti(false), 5000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 stage-scanlines relative overflow-hidden">
      <div className="absolute inset-0 bg-stage-radial pointer-events-none" />

      {/* Confetti */}
      {confetti ? (
        <div className="absolute inset-0 pointer-events-none z-0">
          {Array.from({ length: 40 }).map((_, i) => (
            <motion.span
              key={i}
              initial={{
                y: -20,
                x: Math.random() * window.innerWidth,
                rotate: 0,
              }}
              animate={{
                y: window.innerHeight + 20,
                rotate: 720,
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                delay: Math.random() * 2,
                ease: "linear",
              }}
              className="absolute inline-block w-2 h-3"
              style={{
                backgroundColor: ["#f4b942", "#fb923c", "#fafafa", "#22c55e"][i % 4],
              }}
            />
          ))}
        </div>
      ) : null}

      <div className="relative z-10 w-full max-w-md flex-1 flex flex-col">
        <Marquee className="mb-6" />

        <div className="text-center mb-6">
          <Badge variant="gold" className="mb-3">Game Over</Badge>
          <h1 className="font-display text-5xl text-gold leading-none"
              style={{ textShadow: "0 0 30px hsl(var(--gold-glow) / 0.5)" }}>
            {winner ? `${winner.name}` : "Tie!"}
          </h1>
          <p className="text-cream/70 text-lg mt-2">
            {winner ? "takes the trophy 🏆" : ""}
          </p>
        </div>

        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Final Standings</CardTitle>
          </CardHeader>
          <CardBody className="pt-2">
            <ol className="space-y-2">
              {sorted.map((p, i) => (
                <motion.li
                  key={p.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-stage/40 border border-border"
                >
                  <span className="flex items-center gap-3">
                    <span className="font-display text-xl text-cream/50 w-6 text-center">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </span>
                    <span className="font-semibold">{p.name}</span>
                  </span>
                  <span className="font-mono font-bold text-gold text-lg">{p.score}</span>
                </motion.li>
              ))}
            </ol>
          </CardBody>
        </Card>

        <div className="mt-6 space-y-2">
          <Button onClick={onPlayAgain} size="lg" fullWidth>
            🎬 New Game
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