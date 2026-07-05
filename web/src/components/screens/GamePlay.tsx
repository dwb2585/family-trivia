import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Marquee } from "@/components/ui/Marquee";
import { LeaveButton } from "@/components/ui/LeaveButton";
import type { Answer, Player, Question } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface GamePlayProps {
  me: Player;
  myPlayers: Player[];
  players: Player[];
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  showResults: boolean;
  myAnswer: Answer | null;
  answersForQuestion: Answer[];
  isHost: boolean;
  onAnswer: (optionIndex: number) => Promise<void>;
  onReveal: () => Promise<void>;
  onNext: () => Promise<void>;
  onSetActive: (playerId: string) => void;
  onLeave: () => void;
}

export function GamePlay({
  me,
  myPlayers,
  players,
  question,
  questionIndex,
  totalQuestions,
  showResults,
  myAnswer,
  answersForQuestion,
  isHost,
  onAnswer,
  onReveal,
  onNext,
  onSetActive,
  onLeave,
}: GamePlayProps) {
  const [answering, setAnswering] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  useEffect(() => {
    setCountdown(15);
    const t = setInterval(() => {
      setCountdown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [question.id]);

  async function handleAnswer(idx: number) {
    if (myAnswer || showResults) return;
    setAnswering(true);
    try {
      await onAnswer(idx);
    } finally {
      setAnswering(false);
    }
  }

  const answeredCount = answersForQuestion.length;
  const totalPlayers = players.length;
  const subjectPlayer = players.find((p) => p.id === question.subject_player_id);
  const isMyQuestion = question.subject_player_id === me.id;
  const showSwitcher = myPlayers.length > 1;

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 stage-scanlines relative">
      <div className="absolute inset-0 bg-stage-radial pointer-events-none" />

      <LeaveButton
        onLeave={onLeave}
        warning={
          isHost
            ? "You're the host — the game will end for everyone."
            : undefined
        }
      />

      <div className="relative z-10 w-full max-w-2xl mx-auto flex-1 flex flex-col">
        <Marquee className="mb-4" />

        {/* Top bar */}
        <div className="flex items-center justify-between mb-3">
          <Badge variant="default">
            Question {questionIndex + 1} of {totalQuestions}
          </Badge>
          {!showResults ? (
            <Badge variant={countdown <= 5 ? "danger" : "gold"}>
              ⏱ {countdown}s
            </Badge>
          ) : (
            <Badge variant="success">✓ Revealed</Badge>
          )}
        </div>

        {/* Playing-as switcher */}
        {showSwitcher ? (
          <div className="mb-3 relative">
            <button
              onClick={() => setSwitcherOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-2 rounded-xl bg-card border border-border hover:border-gold/50 transition-colors"
            >
              <span className="text-xs uppercase tracking-wider text-cream/50">
                Playing as
              </span>
              <span className="font-bold text-gold flex items-center gap-2">
                {me.name}
                <span className="text-cream/40 text-xs">{switcherOpen ? "▲" : "▼"}</span>
              </span>
            </button>
            <AnimatePresence>
              {switcherOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute left-0 right-0 mt-1 z-20 bg-card border border-gold/40 rounded-xl overflow-hidden shadow-2xl"
                >
                  {myPlayers.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onSetActive(p.id);
                        setSwitcherOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-2.5 flex items-center justify-between",
                        "hover:bg-gold/10 transition-colors",
                        p.id === me.id && "bg-gold/15",
                      )}
                    >
                      <span className="font-semibold">{p.name}</span>
                      <span className="text-xs text-cream/50">{p.score} pts</span>
                    </button>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        ) : null}

        {/* Question card */}
        <Card className="mb-4">
          <CardBody className="pt-6">
            <p className="text-cream/60 text-sm uppercase tracking-wider text-center mb-2">
              {subjectPlayer ? `About ${subjectPlayer.name}` : ""}
            </p>
            <h2
              className="font-display text-3xl sm:text-4xl text-gold text-center leading-tight"
              style={{ textShadow: "0 0 30px hsl(var(--gold-glow) / 0.3)" }}
            >
              {question.question_text}
            </h2>

            {isMyQuestion ? (
              <div className="mt-4 px-4 py-3 rounded-xl bg-gold/10 border border-gold/30 text-center">
                <p className="text-gold font-semibold">
                  🎤 This one's about you! Share your answer out loud.
                </p>
              </div>
            ) : null}
          </CardBody>
        </Card>

        {/* Answers or results */}
        <AnimatePresence mode="wait">
          {!showResults ? (
            <motion.div
              key="options"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4"
            >
              {question.options.map((opt, idx) => {
                const iAnsweredThis = myAnswer?.selected_option_index === idx;
                const disabled = !!myAnswer || isMyQuestion;
                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    disabled={disabled}
                    className={cn(
                      "h-16 px-4 rounded-xl border-2 text-left font-semibold",
                      "transition-all duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                      "disabled:cursor-not-allowed",
                      iAnsweredThis
                        ? "bg-gold text-stage border-gold btn-3d"
                        : "bg-card text-foreground border-border hover:border-gold hover:bg-gold/10",
                      isMyQuestion && "opacity-30",
                    )}
                  >
                    <span className="inline-block w-6 h-6 mr-2 rounded-full bg-stage/60 text-gold text-xs font-bold leading-6 text-center align-middle">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4"
            >
              {question.options.map((opt, idx) => {
                const isCorrect = idx === question.correct_option_index;
                const pickers = answersForQuestion.filter(
                  (a) => a.selected_option_index === idx,
                );
                return (
                  <div
                    key={idx}
                    className={cn(
                      "h-auto min-h-16 px-4 py-3 rounded-xl border-2 flex flex-col items-start justify-center",
                      isCorrect
                        ? "bg-success/20 border-success animate-correct-flash"
                        : "bg-card border-border opacity-60",
                    )}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="inline-block w-6 h-6 rounded-full bg-stage/60 text-gold text-xs font-bold leading-6 text-center shrink-0">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="font-semibold flex-1">{opt}</span>
                      {isCorrect ? <span className="text-xl">✓</span> : null}
                    </div>
                    {pickers.length > 0 ? (
                      <p className="text-xs text-foreground/60 mt-1 ml-8">
                        {pickers.length === 1
                          ? `${pickers[0].player_id === me.id ? "you" : players.find((p) => p.id === pickers[0].player_id)?.name} got it`
                          : `${pickers.length} picked this`}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Host action bar */}
        <div className="mt-auto">
          {isHost ? (
            <div className="space-y-2">
              {!showResults ? (
                <Button
                  onClick={onReveal}
                  size="lg"
                  fullWidth
                  disabled={answeredCount === 0}
                >
                  👁 Reveal Answer ({answeredCount}/{totalPlayers} answered)
                </Button>
              ) : questionIndex + 1 < totalQuestions ? (
                <Button onClick={onNext} size="lg" fullWidth>
                  Next Question →
                </Button>
              ) : (
                <Button onClick={onNext} size="lg" fullWidth>
                  🏁 Show Final Results
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center text-cream/60 text-sm py-3">
              {!myAnswer && !showResults && !isMyQuestion
                ? "Pick an answer above!"
                : isMyQuestion
                ? "Listening to the answer…"
                : showResults
                ? "Waiting for next question…"
                : "✓ Answer locked in"}
            </div>
          )}
        </div>

        {/* Live scoreboard */}
        <div className="mt-4 bg-card/50 border border-border rounded-xl px-4 py-3">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-cream/50 mb-2">
            <span>Live Scoreboard</span>
            <span>{answeredCount}/{totalPlayers} answered</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[...players].sort((a, b) => b.score - a.score).map((p) => {
              const isMine = p.client_id === me.client_id;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-sm font-bold flex items-center gap-1.5",
                    isMine
                      ? "bg-gold/20 text-gold"
                      : "bg-stage/60 text-foreground/80",
                  )}
                >
                  <span>{p.name}</span>
                  <span className="text-cream/40 font-mono">{p.score}</span>
                </div>
              );
            })}
          </div>
        </div>

        <Marquee className="mt-4" />
      </div>
    </div>
  );
}