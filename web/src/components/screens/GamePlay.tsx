import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Marquee } from "@/components/ui/Marquee";
import { LeaveButton } from "@/components/ui/LeaveButton";
import { FAMILY } from "@/lib/family";
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

/** Emoji avatar for a family member's full name. Falls back to a generic dot. */
function emojiFor(fullName: string): string {
  return FAMILY.find((m) => m.fullName === fullName)?.emoji ?? "";
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
  const isWhoSaidIt = question.mode === "who-said-it";

  return (
    <div className="relative min-h-screen flex flex-col px-4 py-6 overflow-hidden bg-grid">
      <div className="bg-aurora opacity-40" />

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

        {/* Top HUD bar */}
        <div className="flex items-center justify-between mb-3">
          <Badge variant="default">
            Question {questionIndex + 1} / {totalQuestions}
          </Badge>
          <div className="flex items-center gap-2">
            {isWhoSaidIt ? <Badge variant="violet">Who said it?</Badge> : null}
            {!showResults ? (
              <Badge variant={countdown <= 5 ? "danger" : "cyan"}>
                 {countdown}s
              </Badge>
            ) : (
              <Badge variant="success">Revealed</Badge>
            )}
          </div>
        </div>

        {/* Playing-as switcher */}
        {showSwitcher ? (
          <div className="mb-3 relative">
            <button
              onClick={() => setSwitcherOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-2 rounded-xl bg-card border border-border hover:border-cyan/60 transition-colors"
            >
              <span className="text-[10px] uppercase tracking-[0.18em] text-cream/50">
                Playing as
              </span>
              <span className="font-bold text-cyan flex items-center gap-2">
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
                  className="absolute left-0 right-0 mt-1 z-20 bg-card border border-cyan/40 rounded-xl overflow-hidden shadow-cyan-glow"
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
                        "hover:bg-cyan/10 transition-colors",
                        p.id === me.id && "bg-cyan/15",
                      )}
                    >
                      <span className="font-semibold">{p.name}</span>
                      <span className="text-xs text-cream/50 font-mono">{p.score} pts</span>
                    </button>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        ) : null}

        {/* ==== Question card (hero) ==== */}
        <AnimatePresence mode="wait">
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="mb-4 shadow-cyan-glow-sm">
              <CardBody className="pt-6 pb-7">
                {!isWhoSaidIt && subjectPlayer ? (
                  <p className="text-cream/60 text-[10px] uppercase tracking-[0.25em] text-center mb-3">
                    About {subjectPlayer.name}
                  </p>
                ) : null}
                <h2
                  className="font-display text-2xl sm:text-4xl text-center leading-tight"
                  style={{
                    background:
                      "linear-gradient(135deg, hsl(var(--cyan-glow)) 0%, hsl(var(--violet)) 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  {question.question_text}
                </h2>

                {isMyQuestion && !isWhoSaidIt ? (
                  <div className="mt-4 px-4 py-3 rounded-xl bg-gold/10 border border-gold/40 text-center">
                    <p className="text-gold font-semibold text-sm">
                      This one's about you. Share your answer out loud.
                    </p>
                  </div>
                ) : null}

                {isWhoSaidIt && isMyQuestion ? (
                  <div className="mt-4 px-4 py-3 rounded-xl bg-gold/10 border border-gold/40 text-center">
                    <p className="text-gold font-semibold text-sm">
                      This fact is yours. Everyone else is guessing.
                    </p>
                  </div>
                ) : null}
              </CardBody>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Answer UI */}
        <AnimatePresence mode="wait">
          {!showResults ? (
            <motion.div
              key="options"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4"
            >
              {isWhoSaidIt ? (
                <WhoSaidItPicker
                  options={question.options}
                  myAnswer={myAnswer}
                  disabled={!!myAnswer || isMyQuestion}
                  onPick={handleAnswer}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {question.options.map((opt, idx) => {
                    const iAnsweredThis = myAnswer?.selected_option_index === idx;
                    const disabled = !!myAnswer || isMyQuestion;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(idx)}
                        disabled={disabled}
                        className={cn(
                          "relative h-16 px-4 rounded-xl border-2 text-left font-semibold",
                          "transition-all duration-150",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan",
                          "disabled:cursor-not-allowed overflow-hidden",
                          iAnsweredThis
                            ? "bg-gradient-to-br from-cyan to-violet text-stage border-cyan btn-3d shadow-cyan-glow"
                            : "bg-card text-foreground border-border hover:border-cyan hover:bg-cyan/5 hover:shadow-cyan-glow-sm",
                          isMyQuestion && "opacity-30",
                        )}
                      >
                        <span className="inline-flex items-center justify-center w-7 h-7 mr-3 rounded-md bg-stage/70 text-cyan text-sm font-mono font-bold">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="align-middle">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                isWhoSaidIt
                  ? "flex flex-col gap-2 mb-4"
                  : "grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4",
              )}
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
                      "px-4 py-3 rounded-xl border-2 flex items-center justify-between gap-2",
                      isCorrect
                        ? "bg-success/20 border-success animate-correct-flash"
                        : "bg-card border-border opacity-70",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-2xl shrink-0">{emojiFor(opt)}</span>
                      <span className="font-semibold truncate">{opt}</span>
                    </div>
                    {isCorrect ? (
                      <span className="text-xs shrink-0 text-success font-display tracking-widest">CORRECT</span>
                    ) : null}
                    {pickers.length > 0 && !isCorrect ? (
                      <span className="text-xs text-foreground/60 shrink-0">
                        {pickers.length} picked
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ==== Host action bar ==== */}
        <div className="mt-auto">
          {isHost ? (
            <div className="space-y-2">
              {!showResults ? (
                <Button
                  onClick={onReveal}
                  size="lg"
                  fullWidth
                  variant="gold"
                  shimmer
                  disabled={answeredCount === 0}
                >
                  Reveal Answer ({answeredCount}/{totalPlayers})
                </Button>
              ) : questionIndex + 1 < totalQuestions ? (
                <Button onClick={onNext} size="lg" fullWidth variant="primary" shimmer>
                  Next Question →
                </Button>
              ) : (
                <Button onClick={onNext} size="lg" fullWidth variant="gold" shimmer>
                  Show Final Results
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center text-cream/60 text-sm py-3">
              {!myAnswer && !showResults && !isMyQuestion
                ? "Pick an answer above."
                : isMyQuestion
                ? "Listening to the answer…"
                : showResults
                ? "Waiting for next question…"
                : "Answer locked in"}
            </div>
          )}
        </div>

        {/* ==== Live scoreboard (HUD style) ==== */}
        <div className="mt-4 bg-card/70 border border-border rounded-2xl px-4 py-3 backdrop-blur-md">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-cream/50 mb-2">
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
                    "px-2.5 py-1 rounded-full text-sm font-bold flex items-center gap-1.5 transition-all",
                    isMine
                      ? "bg-gradient-to-r from-cyan/30 to-violet/30 text-cyan border border-cyan/60 shadow-cyan-glow-sm"
                      : "bg-stage/60 text-foreground/80 border border-border",
                  )}
                >
                  <span>{p.name}</span>
                  <span className="text-cream/50 font-mono">{p.score}</span>
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

/**
 * WhoSaidItPicker — native <select> styled with neon-bordered HUD.
 * On iOS opens the wheel picker; on Android opens a bottom sheet.
 */
function WhoSaidItPicker({
  options,
  myAnswer,
  disabled,
  onPick,
}: {
  options: string[];
  myAnswer: Answer | null;
  disabled: boolean;
  onPick: (idx: number) => void | Promise<void>;
}) {
  const [selected, setSelected] = useState<string>(
    myAnswer ? String(myAnswer.selected_option_index) : "",
  );

  useEffect(() => {
    setSelected(myAnswer ? String(myAnswer.selected_option_index) : "");
  }, [myAnswer]);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    setSelected(v);
    if (v !== "") {
      await onPick(parseInt(v, 10));
    }
  }

  const selectedName = selected !== "" ? options[parseInt(selected, 10)] : null;

  return (
    <div className="w-full">
      <label className="block text-[11px] uppercase tracking-[0.18em] text-cream/60 mb-2 text-center font-bold">
        Who is this about?
      </label>
      <div className="relative">
        <select
          value={selected}
          onChange={handleChange}
          disabled={disabled}
          className={cn(
            "w-full h-16 px-5 pr-12 rounded-2xl appearance-none cursor-pointer",
            "bg-card border-2 text-foreground text-xl font-semibold",
            "transition-all duration-150",
            "focus:outline-none focus:shadow-cyan-glow",
            disabled
              ? "opacity-60 cursor-not-allowed border-border"
              : "border-cyan/60 hover:border-cyan hover:bg-cyan/5",
            myAnswer && "border-success bg-success/10",
          )}
          style={{ colorScheme: "dark" }}
        >
          <option value="" disabled>
            {disabled ? "Not for you to answer" : "Pick someone…"}
          </option>
          {options.map((name, idx) => (
            <option key={idx} value={idx}>
              {emojiFor(name)}  {name}
            </option>
          ))}
        </select>
        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-cyan text-2xl">
          ▾
        </div>
      </div>

      {selectedName ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-center justify-center gap-2 text-cream/80"
        >
          <span className="text-2xl">{emojiFor(selectedName)}</span>
          <span className="text-base">
            You picked <span className="font-bold text-cyan">{selectedName}</span>
          </span>
        </motion.div>
      ) : (
        <p className="mt-3 text-center text-cream/50 text-sm">
          Tap to choose from {options.length} players
        </p>
      )}
    </div>
  );
}