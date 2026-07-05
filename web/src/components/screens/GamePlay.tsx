import { useEffect, useMemo, useState } from "react";
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
  return FAMILY.find((m) => m.fullName === fullName)?.emoji ?? "👤";
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
          <div className="flex items-center gap-2">
            {isWhoSaidIt ? <Badge variant="default">🎯 Who said it?</Badge> : null}
            {!showResults ? (
              <Badge variant={countdown <= 5 ? "danger" : "gold"}>
                ⏱ {countdown}s
              </Badge>
            ) : (
              <Badge variant="success">✓ Revealed</Badge>
            )}
          </div>
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
            {!isWhoSaidIt && subjectPlayer ? (
              <p className="text-cream/60 text-sm uppercase tracking-wider text-center mb-2">
                About {subjectPlayer.name}
              </p>
            ) : null}
            <h2
              className="font-display text-3xl sm:text-4xl text-gold text-center leading-tight"
              style={{ textShadow: "0 0 30px hsl(var(--gold-glow) / 0.3)" }}
            >
              {question.question_text}
            </h2>

            {isMyQuestion && !isWhoSaidIt ? (
              <div className="mt-4 px-4 py-3 rounded-xl bg-gold/10 border border-gold/30 text-center">
                <p className="text-gold font-semibold">
                  🎤 This one's about you! Share your answer out loud.
                </p>
              </div>
            ) : null}

            {/* Who-said-it: show who this fact belongs to (subject) after they're not the one answering */}
            {isWhoSaidIt && isMyQuestion ? (
              <div className="mt-4 px-4 py-3 rounded-xl bg-gold/10 border border-gold/30 text-center">
                <p className="text-gold font-semibold">
                  🎤 This fact is yours! Everyone else is guessing.
                </p>
              </div>
            ) : null}
          </CardBody>
        </Card>

        {/* Answer UI — switches based on question mode */}
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
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.9 }}
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
                        : "bg-card border-border opacity-60",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-2xl shrink-0">{emojiFor(opt)}</span>
                      <span className="font-semibold truncate">{opt}</span>
                    </div>
                    {isCorrect ? <span className="text-xl shrink-0">✓</span> : null}
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

/**
 * WhoSaidItPicker — native <select> for picking a player from the dropdown.
 * On iOS opens the wheel picker; on Android opens a bottom sheet; on desktop
 * opens a standard dropdown. Styled with a gold border to match the theme.
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

  // Reset selection when question changes
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
      <label className="block text-xs uppercase tracking-wider text-cream/60 mb-2 text-center">
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
            "transition-colors duration-150",
            "focus:outline-none",
            disabled
              ? "opacity-60 cursor-not-allowed"
              : "border-gold/60 focus:border-gold hover:bg-gold/5",
            myAnswer && "border-success bg-success/10",
          )}
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
        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gold text-2xl">
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
          <span className="text-lg">
            You picked <span className="font-bold text-gold">{selectedName}</span>
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