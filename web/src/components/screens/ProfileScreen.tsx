import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Marquee } from "@/components/ui/Marquee";
import { LeaveButton } from "@/components/ui/LeaveButton";
import { FamilyMemberSelect } from "@/components/ui/Select";
import { FAMILY } from "@/lib/family";
import { DEFAULT_FACTS } from "@/lib/facts";
import type { SharedQuestion, SharedQuestionAnswer } from "@/lib/supabase";
import {
  getProfile,
  upsertProfile,
  setProfileAvatar,
} from "@/lib/profiles";
import {
  getSharedQuestionsWithAnswers,
  createSharedQuestion,
  upsertSharedAnswer,
  deleteSharedQuestion,
  deleteSharedAnswer,
} from "@/lib/sharedQuestions";
import { cn } from "@/lib/utils";

/** UI helper: question + the answers that have been collected for it. */
interface QuestionWithAnswers {
  question: SharedQuestion;
  answers: SharedQuestionAnswer[];
}

/**
 * Avatar options shown in the picker. Curated, single-glyph emojis so they
 * render reliably across iOS / Android / desktop. Falls back to roster
 * default (in family.ts) when the user picks "Use roster default".
 */
const AVATAR_OPTIONS: string[] = [
  "😎", "🤩", "🥳", "😺", "🐶", "🦊", "🐼", "🦁", "🐯", "🐸",
  "🦄", "🐝", "🦋", "🌈", "⚡", "🔥", "💎", "🌟", "✨", "🚀",
  "🎸", "🎮", "📚", "🎬", "🍕", "🍩", "🌮", "🍣", "🍔", "☕",
  "🏀", "⚽", "🏆", "👑", "💀", "🤖", "👻", "🎯", "🧠", "💯",
];

interface ProfileScreenProps {
  initialName?: string;
  onBack: () => void;
}

/**
 * Profile editor — pick a name, then edit that person's default facts
 * (the 8 built-in keys) and avatar. The page also shows the shared
 * Question Bank: anyone can post a question, anyone can answer it
 * (one answer per person — re-submitting upserts), anyone can delete
 * either. Default facts auto-save with a 600ms debounce.
 */
export function ProfileScreen({ initialName = "", onBack }: ProfileScreenProps) {
  const [name, setName] = useState(initialName);
  const [defaultFacts, setDefaultFacts] = useState<Record<string, string>>({});
  const [bank, setBank] = useState<QuestionWithAnswers[]>([]);
  const [avatarEmoji, setAvatarEmoji] = useState<string | null>(null);
  // When avatarEmoji is null we fall back to the family roster default.
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [postingQuestion, setPostingQuestion] = useState(false);

  // Load profile + shared question bank. The bank is global; the profile
  // is per-name. They load in parallel.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      const [, shared] = await Promise.all([
        name.trim() ? getProfile(name) : Promise.resolve(null),
        getSharedQuestionsWithAnswers(),
      ]);
      if (cancelled) return;
      if (!name.trim()) {
        setDefaultFacts({});
        setAvatarEmoji(null);
      } else {
        const blank: Record<string, string> = {};
        for (const f of DEFAULT_FACTS) blank[f.key] = "";
        // shared here is the profile | null from the parallel call.
        const profile = (await getProfile(name)) ?? null;
        if (profile) Object.assign(blank, profile.facts);
        setDefaultFacts(blank);
        setAvatarEmoji(
          profile && profile.avatar_emoji && profile.avatar_emoji.length > 0
            ? profile.avatar_emoji
            : null,
        );
      }
      setBank(
        shared.map((q) => ({ question: q, answers: q.answers })),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [name]);

  // Debounced save for default facts
  const saveTimerRef = useRef<number | null>(null);
  const scheduleSaveDefaults = useCallback(
    (next: Record<string, string>) => {
      if (!name.trim()) return;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      setSaving(true);
      saveTimerRef.current = window.setTimeout(async () => {
        await upsertProfile(name, next);
        setSaving(false);
      }, 600);
    },
    [name],
  );

  function handleDefaultChange(key: string, value: string) {
    const next = { ...defaultFacts, [key]: value };
    setDefaultFacts(next);
    scheduleSaveDefaults(next);
  }

  /**
   * Save the avatar to the profile. Pass "" to clear (use roster default).
   * Optimistically updates local state, persists to Supabase.
   */
  async function handleAvatarPick(emoji: string) {
    if (!name.trim()) return;
    const next = emoji || null;
    setAvatarEmoji(next);
    await setProfileAvatar(name, next ?? "");
  }

  // ----- Shared Q&A handlers -----

  async function refreshBank() {
    const shared = await getSharedQuestionsWithAnswers();
    setBank(shared.map((q) => ({ question: q, answers: q.answers })));
  }

  async function handlePostQuestion(prompt: string) {
    if (!name.trim()) {
      setError("Pick a name above to post or answer questions");
      return;
    }
    const created = await createSharedQuestion(prompt, name.trim());
    if (created) {
      setBank((prev) => [...prev, { question: created, answers: [] }]);
      setPostingQuestion(false);
    } else {
      setError("Could not post question");
    }
  }

  async function handleAnswer(questionId: string, value: string) {
    if (!name.trim()) {
      setError("Pick a name above to post or answer questions");
      return;
    }
    const saved = await upsertSharedAnswer(questionId, name.trim(), value);
    if (saved) {
      setBank((prev) =>
        prev.map((row) => {
          if (row.question.id !== questionId) return row;
          const others = row.answers.filter((a) => a.submitted_by !== saved.submitted_by);
          return { ...row, answers: [...others, saved] };
        }),
      );
    } else if (value.trim()) {
      setError("Could not save answer");
    }
    // If value was blank, the upsert helper deleted the existing row for us;
    // we still need to refresh the visible state.
    if (!value.trim()) {
      setBank((prev) =>
        prev.map((row) =>
          row.question.id === questionId
            ? { ...row, answers: row.answers.filter((a) => a.submitted_by !== name.trim()) }
            : row,
        ),
      );
    }
  }

  async function handleDeleteQuestion(id: string) {
    setBank((prev) => prev.filter((row) => row.question.id !== id));
    await deleteSharedQuestion(id);
  }

  async function handleDeleteAnswer(answerId: string, questionId: string) {
    setBank((prev) =>
      prev.map((row) =>
        row.question.id === questionId
          ? { ...row, answers: row.answers.filter((a) => a.id !== answerId) }
          : row,
      ),
    );
    await deleteSharedAnswer(answerId);
  }

  return (
    <div className="relative min-h-screen flex flex-col px-4 py-6 overflow-hidden bg-grid">
      <div className="bg-aurora opacity-50" />

      <LeaveButton onLeave={onBack} confirmMessage="Leave without saving further changes?" />

      <div className="relative z-10 w-full max-w-2xl mx-auto flex-1 flex flex-col">
        <Marquee className="mb-4" />

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
            <p className="text-foreground/60 text-sm mt-1">
              Update your answers anytime. They auto-fill in your next game.
            </p>
          </CardHeader>
          <CardBody>
            <FamilyMemberSelect
              label="Whose profile?"
              value={name}
              onChange={setName}
              allowCustom
            />
          </CardBody>
        </Card>

        {name.trim() ? (
          loading ? (
            <div className="text-center text-cream/60 py-8">Loading profile…</div>
          ) : (
            <>
              {/* Avatar picker */}
              <Card className="mb-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Your avatar</CardTitle>
                  <p className="text-foreground/60 text-xs mt-1">
                    Shown next to your name in lobbies, scoreboards, and reveals.
                  </p>
                </CardHeader>
                <CardBody className="pt-2">
                  <AvatarPicker
                    current={avatarEmoji}
                    rosterDefault={
                      FAMILY.find((m) => m.fullName === name)?.emoji ?? ""
                    }
                    onPick={handleAvatarPick}
                  />
                </CardBody>
              </Card>

              {/* Default 8 facts */}
              <Card className="mb-4">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Default Questions</CardTitle>
                    <span className="text-xs text-cream/50">
                      {saving ? "Saving…" : Object.values(defaultFacts).some((v) => v.trim()) ? "✓ Saved" : ""}
                    </span>
                  </div>
                </CardHeader>
                <CardBody className="pt-2 space-y-3">
                  {DEFAULT_FACTS.map((fact) => (
                    <DefaultFactField
                      key={fact.key}
                      emoji={fact.emoji}
                      prompt={fact.prompt}
                      value={defaultFacts[fact.key] || ""}
                      onChange={(v) => handleDefaultChange(fact.key, v)}
                    />
                  ))}
                </CardBody>
              </Card>

              {/* Question Bank — shared community Q&A */}
              <Card className="mb-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Question Bank</CardTitle>
                  <p className="text-foreground/60 text-xs mt-1">
                    Anyone can post a question, answer one, or delete either. Your answers appear in every game.
                  </p>
                </CardHeader>
                <CardBody className="pt-2 space-y-3">
                  {bank.length === 0 && !postingQuestion ? (
                    <p className="text-cream/50 text-sm text-center py-3">
                      No questions yet. Post the first one below.
                    </p>
                  ) : null}

                  <AnimatePresence initial={false}>
                    {bank.map((row) => (
                      <motion.div
                        key={row.question.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20, height: 0 }}
                        transition={{ duration: 0.18 }}
                      >
                        <QuestionBankRow
                          row={row}
                          currentName={name}
                          onAnswer={(value) => handleAnswer(row.question.id, value)}
                          onDeleteQuestion={() => handleDeleteQuestion(row.question.id)}
                          onDeleteAnswer={(answerId) =>
                            handleDeleteAnswer(answerId, row.question.id)
                          }
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {postingQuestion ? (
                    <PostQuestionForm
                      onSubmit={handlePostQuestion}
                      onCancel={() => setPostingQuestion(false)}
                    />
                  ) : (
                    <button
                      onClick={() => setPostingQuestion(true)}
                      className="w-full py-3 rounded-xl border-2 border-dashed border-gold/30 text-gold/70 hover:text-cyan hover:border-cyan transition-colors font-semibold"
                    >
                      Post a question
                    </button>
                  )}
                </CardBody>
              </Card>

              {error ? (
                <p className="text-danger text-sm text-center mb-2">{error}</p>
              ) : null}
            </>
          )
        ) : (
          <Card>
            <CardBody>
              <p className="text-foreground/60 text-center py-6">
                Pick a name above to view or edit a profile.
              </p>
            </CardBody>
          </Card>
        )}

        <Marquee className="mt-4" />
      </div>
    </div>
  );
}

// ---- Sub-components ----

function DefaultFactField({
  emoji,
  prompt,
  value,
  onChange,
}: {
  emoji: string;
  prompt: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-cream/70 uppercase tracking-wider mb-1.5">
        <span className="mr-1.5">{emoji}</span> {prompt}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={80}
        placeholder="…"
        className={cn(
          "w-full h-11 px-3 rounded-lg",
          "bg-stage/60 border border-border",
          "text-foreground placeholder:text-foreground/30",
          "focus:outline-none focus:border-cyan focus:shadow-cyan-glow-sm",
          "transition-colors",
        )}
      />
    </label>
  );
}

/**
 * One row of the Question Bank — a question prompt + the answer list + a
 * "your answer" inline editor. Anyone can delete the question or any answer.
 */
function QuestionBankRow({
  row,
  currentName,
  onAnswer,
  onDeleteQuestion,
  onDeleteAnswer,
}: {
  row: QuestionWithAnswers;
  currentName: string;
  onAnswer: (value: string) => void;
  onDeleteQuestion: () => void;
  onDeleteAnswer: (answerId: string) => void;
}) {
  const myExisting = row.answers.find((a) => a.submitted_by === currentName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(myExisting?.value ?? "");

  // Sync draft when the actual answer row updates (e.g. another tab wrote it)
  useEffect(() => {
    if (!editing) setDraft(myExisting?.value ?? "");
  }, [myExisting?.value, editing]);

  return (
    <div className="p-3 rounded-xl bg-stage/40 border border-gold/20 space-y-2">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground">{row.question.prompt}</div>
          <div className="text-xs text-cream/40 mt-0.5">
            posted by {row.question.created_by}
          </div>
        </div>
        <button
          onClick={onDeleteQuestion}
          aria-label="Delete question"
          className="shrink-0 w-8 h-8 rounded-lg bg-stage/60 hover:bg-danger/20 text-cream/70 hover:text-danger flex items-center justify-center transition-colors"
        >
          
        </button>
      </div>

      {/* Answers */}
      {row.answers.length > 0 ? (
        <ul className="space-y-1">
          {row.answers.map((a) => {
            const isMine = a.submitted_by === currentName;
            const emoji = FAMILY.find((m) => m.fullName === a.submitted_by)?.emoji ?? "👤";
            return (
              <li
                key={a.id}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm",
                  isMine ? "bg-cyan/10 border border-cyan/30" : "bg-stage/30",
                )}
              >
                <span className="text-base">{emoji}</span>
                <span className="text-gold font-semibold flex-1 truncate">{a.value}</span>
                <span className="text-xs text-cream/50 shrink-0">{a.submitted_by}</span>
                <button
                  onClick={() => onDeleteAnswer(a.id)}
                  aria-label="Delete answer"
                  className="shrink-0 w-7 h-7 rounded-md bg-stage/60 hover:bg-danger/20 text-cream/60 hover:text-danger flex items-center justify-center text-xs"
                >
                  
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-cream/40 text-xs italic px-2">no answers yet</p>
      )}

      {/* Your answer — inline editor */}
      {currentName.trim() ? (
        <div className="flex items-center gap-2 pt-1">
          <input
            value={editing ? draft : myExisting?.value ?? ""}
            placeholder={`${currentName}'s answer`}
            disabled={!editing}
            onChange={(e) => setDraft(e.target.value)}
            className={cn(
              "flex-1 h-9 px-3 rounded-lg text-sm",
              "bg-stage border border-border",
              "text-foreground placeholder:text-cream/40",
              "focus:outline-none focus:border-cyan focus:shadow-cyan-glow-sm",
              !editing && "opacity-80 cursor-default",
            )}
          />
          {editing ? (
            <>
              <button
                onClick={() => {
                  setDraft(myExisting?.value ?? "");
                  setEditing(false);
                }}
                className="h-9 px-3 rounded-lg bg-stage text-cream/70 hover:text-foreground text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onAnswer(draft);
                  setEditing(false);
                }}
                className="h-9 px-3 rounded-lg bg-gradient-to-br from-cyan to-violet text-stage text-xs font-bold shadow-cyan-glow-sm"
              >
                Save
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setDraft(myExisting?.value ?? "");
                setEditing(true);
              }}
              className="h-9 px-3 rounded-lg bg-stage/60 hover:bg-cyan/20 text-cream/70 hover:text-cyan text-xs font-bold"
            >
              {myExisting ? "Edit" : "Answer"}
            </button>
          )}
        </div>
      ) : (
        <p className="text-cream/40 text-xs italic px-2">pick a name above to answer</p>
      )}
    </div>
  );
}

/** Minimal post-a-question form: just a prompt and a submit button. */
function PostQuestionForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (prompt: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState("");

  return (
    <div className="p-3 rounded-xl bg-card border-2 border-gold/40 space-y-2">
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Question (e.g. What's your favorite color?)"
        className="w-full h-10 px-3 rounded-lg bg-stage border border-border text-foreground text-sm focus:outline-none focus:border-cyan focus:shadow-cyan-glow-sm focus:bg-stage"
      />
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-3 h-9 rounded-lg bg-stage text-cream/70 hover:text-foreground text-sm font-semibold"
        >
          Cancel
        </button>
        <button
          onClick={() => onSubmit(draft)}
          disabled={!draft.trim()}
          className="px-3 h-9 rounded-lg bg-gradient-to-br from-cyan to-violet text-stage text-sm font-bold shadow-cyan-glow-sm disabled:opacity-50"
        >
          Post
        </button>
      </div>
    </div>
  );
}
/**
 * AvatarPicker — current avatar preview + a curated emoji grid + "use default"
 * affordance. Tapping an emoji saves it immediately (no extra button).
 */
function AvatarPicker({
  current,
  rosterDefault,
  onPick,
}: {
  current: string | null;
  rosterDefault: string;
  onPick: (emoji: string) => void;
}) {
  const active = current ?? rosterDefault;
  return (
    <div>
      {/* Big preview */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-20 h-20 rounded-2xl bg-stage border border-cyan/40 shadow-cyan-glow-sm flex items-center justify-center text-5xl">
          {active || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-cream/50 font-bold">
            Currently
          </div>
          <div className="text-base font-bold text-foreground truncate">
            {current ? "Custom avatar" : rosterDefault ? "Family default" : "No avatar"}
          </div>
        </div>
      </div>

      {/* Emoji grid */}
      <div className="grid grid-cols-7 sm:grid-cols-9 gap-1.5">
        {AVATAR_OPTIONS.map((emoji, i) => {
          const isActive = current === emoji;
          return (
            <motion.button
              key={`${emoji}-${i}`}
              type="button"
              onClick={() => onPick(emoji)}
              whileTap={{ scale: 0.9 }}
              className={cn(
                "aspect-square rounded-lg flex items-center justify-center text-2xl",
                "transition-all duration-150",
                "border-2",
                isActive
                  ? "bg-cyan/15 border-cyan shadow-cyan-glow-sm"
                  : "bg-stage/40 border-transparent hover:border-cyan/40 hover:bg-stage/60",
              )}
              aria-label={`Pick ${emoji} as your avatar`}
            >
              {emoji}
            </motion.button>
          );
        })}
      </div>

      {/* Use roster default */}
      <button
        type="button"
        onClick={() => onPick("")}
        className={cn(
          "mt-3 w-full h-10 rounded-lg text-sm font-bold transition-all",
          "border",
          current === null
            ? "bg-gold/15 border-gold text-gold"
            : "bg-stage/40 border-border text-cream/60 hover:border-gold/40 hover:text-gold",
        )}
      >
        Use family roster default{rosterDefault ? ` (${rosterDefault})` : ""}
      </button>
    </div>
  );
}
