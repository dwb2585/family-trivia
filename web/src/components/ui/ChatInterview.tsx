import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./Button";
import { VoiceInputField } from "./VoiceInputField";
import { cn } from "@/lib/utils";

export interface InterviewQuestion {
  key: string;
  label: string;
  emoji: string;
  /** Conversational opener from the AI host, e.g. "Hey Rue, what's something you'll never forget?" */
  prompt: string;
}

interface ChatInterviewProps {
  playerName: string;
  questions: InterviewQuestion[];
  /** Existing facts for this player — pre-filled when the user enters chat mode. */
  initialFacts?: Record<string, string>;
  /** Called whenever an answer is added/edited. Use this to wire into factsByPlayer. */
  onChange?: (facts: Record<string, string>) => void;
  /** Called when the user finishes the last question. */
  onComplete?: (facts: Record<string, string>) => void;
  /** Close the chat without finishing. */
  onCancel?: () => void;
}

/**
 * Conversational interview mode. Shows one question at a time as a chat-thread
 * with the AI host. Supports voice dictation via the existing mic button.
 *
 * Pure frontend — questions are static. The "AI" framing is just a chat-bubble
 * UI; no API call needed.
 */
export function ChatInterview({
  playerName,
  questions,
  initialFacts = {},
  onChange,
  onComplete,
  onCancel,
}: ChatInterviewProps) {
  const [facts, setFacts] = React.useState<Record<string, string>>(() => ({ ...initialFacts }));
  const [currentIdx, setCurrentIdx] = React.useState(() => {
    // Start at the first unanswered question, or the last if all done.
    const firstUnanswered = questions.findIndex((q) => !(initialFacts[q.key] ?? "").trim());
    if (firstUnanswered === -1) return Math.max(0, questions.length - 1);
    return firstUnanswered;
  });
  const [history, setHistory] = React.useState<
    { role: "host" | "you"; text: string; qKey?: string }[]
  >(() => {
    // Reconstruct conversation history from any previously-answered questions
    // so users can see what they've already said when they re-enter chat mode.
    const seed: { role: "host" | "you"; text: string; qKey?: string }[] = [];
    for (const q of questions) {
      const ans = (initialFacts[q.key] ?? "").trim();
      if (ans) {
        seed.push({ role: "host", text: q.prompt, qKey: q.key });
        seed.push({ role: "you", text: ans, qKey: q.key });
      } else {
        break;
      }
    }
    return seed;
  });

  const currentQ = questions[currentIdx];
  const draftValue = currentQ ? (facts[currentQ.key] ?? "") : "";
  const setDraft = (v: string) => {
    if (!currentQ) return;
    setFacts((prev) => {
      const next = { ...prev, [currentQ.key]: v };
      onChange?.(next);
      return next;
    });
  };

  const answeredCount = questions.filter((q) => (facts[q.key] ?? "").trim().length > 0).length;
  const allDone = answeredCount === questions.length;

  function submit() {
    if (!currentQ) return;
    const trimmed = (facts[currentQ.key] ?? "").trim();
    if (!trimmed) return;

    // Skip if we've already added this message to the history (allows re-edit
    // without duplicating the chat bubble).
    const lastHostIdx = [...history].reverse().findIndex((m) => m.role === "host");
    const lastHost = lastHostIdx === -1 ? undefined : history[history.length - 1 - lastHostIdx];
    if (!(lastHost && lastHost.qKey === currentQ.key && history[history.length - 1]?.text === trimmed)) {
      setHistory((prev) => [...prev, { role: "you", text: trimmed, qKey: currentQ.key }]);
    }

    if (currentIdx < questions.length - 1) {
      // Animate in the next host bubble
      setTimeout(() => {
        setCurrentIdx(currentIdx + 1);
      }, 220);
    } else {
      onComplete?.(facts);
    }
  }

  function skip() {
    if (!currentQ) return;
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      onComplete?.(facts);
    }
  }

  function back() {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
  }

  function editPrevious() {
    // Find the last answered question and jump back to it.
    for (let i = questions.length - 1; i >= 0; i--) {
      if ((facts[questions[i].key] ?? "").trim()) {
        setCurrentIdx(i);
        return;
      }
    }
  }

  return (
    <div className="flex flex-col h-full max-h-[80vh] min-h-[420px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🪄</span>
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-cyan font-bold">
              AI Interview · {playerName}
            </div>
            <div className="text-sm text-foreground/70">
              {answeredCount} of {questions.length} answered
            </div>
          </div>
        </div>
        {onCancel ? (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            ✕ Close
          </Button>
        ) : null}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-stage rounded-full mt-3 mb-1 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-cyan to-violet"
          animate={{ width: `${(answeredCount / questions.length) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto py-4 px-1 space-y-3">
        {history.map((m, i) => (
          <ChatBubble key={i} role={m.role} text={m.text} emoji={m.qKey ? (questions.find((q) => q.key === m.qKey)?.emoji ?? "💬") : "💬"} />
        ))}
        {currentQ && (currentIdx >= history.filter((m) => m.role === "host").length || history[history.length - 1]?.role === "you") ? (
          <motion.div
            key={`host-${currentQ.key}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <ChatBubble role="host" text={currentQ.prompt} emoji={currentQ.emoji} />
          </motion.div>
        ) : null}

        {allDone ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <ChatBubble
              role="host"
              emoji="🎉"
              text={`Nice — got everything I need. You're ready to play, ${playerName}!`}
            />
          </motion.div>
        ) : null}
      </div>

      {/* Input area */}
      {!allDone && currentQ ? (
        <div className="pt-3 border-t border-border space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-cream/50 font-bold">
            Your answer · {currentQ.label}
          </div>
          <VoiceInputField
            value={draftValue}
            onChange={setDraft}
            placeholder="Type your answer or tap the mic…"
            maxLength={120}
            ariaLabel={`Voice input for ${currentQ.label}`}
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2">
              {currentIdx > 0 || history.length > 0 ? (
                <Button variant="ghost" size="sm" onClick={history.length > 0 ? editPrevious : back}>
                  ← Edit previous
                </Button>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={skip}>
                Skip
              </Button>
              <Button
                size="sm"
                onClick={submit}
                disabled={!draftValue.trim()}
                className={cn(!draftValue.trim() && "opacity-50")}
              >
                {currentIdx === questions.length - 1 ? "Finish ✓" : "Next →"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChatBubble({
  role,
  text,
  emoji,
}: {
  role: "host" | "you";
  text: string;
  emoji?: string;
}) {
  if (role === "host") {
    return (
      <div className="flex items-start gap-2.5">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan/30 to-violet/30 border border-cyan/40 flex items-center justify-center text-lg shrink-0">
          {emoji ?? "🪄"}
        </div>
        <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-stage/70 border border-cyan/20 px-4 py-2.5 text-sm text-foreground">
          {text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2.5 flex-row-reverse">
      <div className="w-9 h-9 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center text-base shrink-0">
        🗣️
      </div>
      <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-gold/20 to-cyan/10 border border-gold/30 px-4 py-2.5 text-sm text-foreground">
        {text}
      </div>
    </div>
  );
}
