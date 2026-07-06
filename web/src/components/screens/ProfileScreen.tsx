import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Marquee } from "@/components/ui/Marquee";
import { LeaveButton } from "@/components/ui/LeaveButton";
import { FamilyMemberSelect } from "@/components/ui/Select";
import { FAMILY } from "@/lib/family";
import { DEFAULT_FACTS } from "@/lib/facts";
import type { CustomQuestion } from "@/lib/supabase";
import {
  getProfile,
  upsertProfile,
  setProfileAvatar,
} from "@/lib/profiles";
import {
  getCustomQuestions,
  createCustomQuestion,
  updateCustomQuestion,
  deleteCustomQuestion,
} from "@/lib/customQuestions";
import { cn } from "@/lib/utils";

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
 * (the 8 built-in keys) and avatar.
 *
 * The "Custom Questions" section below shows the SHARED pool — any player
 * can add a question about any subject in the family roster, and any
 * player can delete. Auto-saves default facts with a 600ms debounce.
 */
export function ProfileScreen({ initialName = "", onBack }: ProfileScreenProps) {
  const [name, setName] = useState(initialName);
  const [defaultFacts, setDefaultFacts] = useState<Record<string, string>>({});
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [avatarEmoji, setAvatarEmoji] = useState<string | null>(null);
  // When avatarEmoji is null we fall back to the family roster default.
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingCustom, setAddingCustom] = useState(false);

  // Load profile + shared custom questions when name changes
  useEffect(() => {
    if (!name.trim()) {
      setDefaultFacts({});
      setAvatarEmoji(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      const [profile, customs] = await Promise.all([
        getProfile(name),
        // Pull the whole shared pool once — small table, no need to filter
        // by subject here. The UI shows every question in the pool.
        getCustomQuestions(),
      ]);
      if (cancelled) return;
      // Pre-fill with empty strings for all default keys so the form shows them
      const blank: Record<string, string> = {};
      for (const f of DEFAULT_FACTS) blank[f.key] = "";
      if (profile) Object.assign(blank, profile.facts);
      setDefaultFacts(blank);
      setCustomQuestions(customs);
      // 0/empty-string from DB → null (use roster default).
      setAvatarEmoji(
        profile && profile.avatar_emoji && profile.avatar_emoji.length > 0
          ? profile.avatar_emoji
          : null,
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

  // ----- Shared custom question handlers -----

  async function handleAddCustom(
    prompt: string,
    label: string,
    value: string,
    subject: string,
  ) {
    if (!name.trim()) return;
    const created = await createCustomQuestion({
      prompt,
      label,
      value,
      subject_full_name: subject,
      created_by: name.trim(),
    });
    if (created) {
      setCustomQuestions((prev) => [...prev, created]);
      setAddingCustom(false);
    } else {
      setError("Could not add custom question");
    }
  }

  async function handleUpdateCustom(
    id: string,
    patch: Partial<Pick<CustomQuestion, "prompt" | "label" | "value" | "subject_full_name">>,
  ) {
    setCustomQuestions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
    await updateCustomQuestion(id, patch);
  }

  async function handleDeleteCustom(id: string) {
    setCustomQuestions((prev) => prev.filter((c) => c.id !== id));
    await deleteCustomQuestion(id);
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

              {/* Shared custom question pool */}
              <Card className="mb-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Shared Custom Questions</CardTitle>
                  <p className="text-foreground/60 text-xs mt-1">
                    One pool, everyone plays with them. Add a question about anyone in the family roster — anyone can also delete.
                  </p>
                </CardHeader>
                <CardBody className="pt-2 space-y-3">
                  {customQuestions.length === 0 && !addingCustom ? (
                    <p className="text-cream/50 text-sm text-center py-3">
                      No custom questions in the pool yet.
                    </p>
                  ) : null}

                  <AnimatePresence initial={false}>
                    {customQuestions.map((c) => (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20, height: 0 }}
                        transition={{ duration: 0.18 }}
                      >
                        <CustomQuestionCard
                          question={c}
                          onChange={(patch) => handleUpdateCustom(c.id, patch)}
                          onDelete={() => handleDeleteCustom(c.id)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {addingCustom ? (
                    <NewCustomQuestionForm
                      defaultSubject={name}
                      onSubmit={handleAddCustom}
                      onCancel={() => setAddingCustom(false)}
                    />
                  ) : (
                    <button
                      onClick={() => setAddingCustom(true)}
                      className="w-full py-3 rounded-xl border-2 border-dashed border-gold/30 text-gold/70 hover:text-cyan hover:border-cyan transition-colors font-semibold"
                    >
                      Add a custom question
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

function CustomQuestionCard({
  question,
  onChange,
  onDelete,
}: {
  question: CustomQuestion;
  onChange: (patch: Partial<Pick<CustomQuestion, "prompt" | "label" | "value" | "subject_full_name">>) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [prompt, setPrompt] = useState(question.prompt);
  const [label, setLabel] = useState(question.label);
  const [value, setValue] = useState(question.value);
  const [subject, setSubject] = useState(question.subject_full_name);

  // Sync local state when the row changes externally (e.g. realtime update)
  useEffect(() => {
    setPrompt(question.prompt);
    setLabel(question.label);
    setValue(question.value);
    setSubject(question.subject_full_name);
  }, [question.prompt, question.label, question.value, question.subject_full_name]);

  if (!editing) {
    const rosterEmoji = FAMILY.find((m) => m.fullName === question.subject_full_name)?.emoji ?? "👤";
    return (
      <div className="flex items-start gap-2 p-3 rounded-xl bg-stage/40 border border-gold/20">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground">{question.prompt}</div>
          <div className="text-xs text-cream/50 mt-0.5">
            About <span className="text-cream/70">{rosterEmoji} {question.subject_full_name}</span>
            {" \u00b7 "}
            added by <span className="text-cream/70">{question.created_by}</span>
          </div>
          <div className="text-sm text-gold mt-1">
            {question.value || <span className="text-cream/50 italic">no answer yet</span>}
          </div>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={() => setEditing(true)}
            aria-label="Edit"
            className="w-8 h-8 rounded-lg bg-stage/60 hover:bg-gold/20 text-cream/70 hover:text-gold flex items-center justify-center transition-colors"
          >
            ✏️
          </button>
          <button
            onClick={onDelete}
            aria-label="Delete"
            className="w-8 h-8 rounded-lg bg-stage/60 hover:bg-danger/20 text-cream/70 hover:text-danger flex items-center justify-center transition-colors"
          >
            
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-xl bg-stage/60 border-2 border-gold/40 space-y-2">
      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Question (e.g. What's your favorite season?)"
        className="w-full h-10 px-3 rounded-lg bg-stage border border-border text-foreground text-sm focus:outline-none focus:border-cyan focus:shadow-cyan-glow-sm focus:bg-stage"
      />
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label (e.g. favorite season)"
        className="w-full h-10 px-3 rounded-lg bg-stage border border-border text-foreground text-sm focus:outline-none focus:border-cyan focus:shadow-cyan-glow-sm focus:bg-stage"
      />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="The subject's answer"
        className="w-full h-10 px-3 rounded-lg bg-stage border border-border text-foreground text-sm focus:outline-none focus:border-cyan focus:shadow-cyan-glow-sm focus:bg-stage"
      />
      <FamilyMemberSelect
        label="About"
        value={subject}
        onChange={setSubject}
        allowCustom
      />
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => {
            setPrompt(question.prompt);
            setLabel(question.label);
            setValue(question.value);
            setSubject(question.subject_full_name);
            setEditing(false);
          }}
          className="px-3 h-9 rounded-lg bg-stage text-cream/70 hover:text-foreground text-sm font-semibold"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onChange({ prompt, label, value, subject_full_name: subject });
            setEditing(false);
          }}
          disabled={!prompt.trim() || !label.trim() || !subject.trim()}
          className="px-3 h-9 rounded-lg bg-gradient-to-br from-cyan to-violet text-stage text-sm font-bold shadow-cyan-glow-sm disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function NewCustomQuestionForm({
  defaultSubject,
  onSubmit,
  onCancel,
}: {
  defaultSubject: string;
  onSubmit: (prompt: string, label: string, value: string, subject: string) => void;
  onCancel: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [subject, setSubject] = useState(defaultSubject);

  function deriveLabel(p: string): string {
    // Tiny heuristic: strip "What's your / Where's your / Who" prefixes
    return p
      .replace(/^what'?s your\s+/i, "")
      .replace(/^where'?s your\s+/i, "")
      .replace(/^who'?s your\s+/i, "")
      .replace(/^what'?s\s+/i, "")
      .replace(/^where'?s\s+/i, "")
      .replace(/\?$/, "")
      .trim()
      .toLowerCase()
      .slice(0, 60);
  }

  return (
    <div className="p-3 rounded-xl bg-card border-2 border-gold/40 space-y-2">
      <input
        autoFocus
        value={prompt}
        onChange={(e) => {
          setPrompt(e.target.value);
          if (!label) setLabel(deriveLabel(e.target.value));
        }}
        placeholder="Question (e.g. What's your favorite season?)"
        className="w-full h-10 px-3 rounded-lg bg-stage border border-border text-foreground text-sm focus:outline-none focus:border-cyan focus:shadow-cyan-glow-sm focus:bg-stage"
      />
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label (e.g. favorite season) — used in question templates"
        className="w-full h-10 px-3 rounded-lg bg-stage border border-border text-foreground text-sm focus:outline-none focus:border-cyan focus:shadow-cyan-glow-sm focus:bg-stage"
      />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="The answer (e.g. Autumn)"
        className="w-full h-10 px-3 rounded-lg bg-stage border border-border text-foreground text-sm focus:outline-none focus:border-cyan focus:shadow-cyan-glow-sm focus:bg-stage"
      />
      <FamilyMemberSelect
        label="About"
        value={subject}
        onChange={setSubject}
        allowCustom
      />
      <p className="text-[10px] uppercase tracking-[0.18em] text-cream/40 font-bold">
        You'll be listed as the author: <span className="text-cream/70">{defaultSubject}</span>
      </p>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-3 h-9 rounded-lg bg-stage text-cream/70 hover:text-foreground text-sm font-semibold"
        >
          Cancel
        </button>
        <button
          onClick={() => onSubmit(prompt, label, value, subject)}
          disabled={!prompt.trim() || !label.trim() || !subject.trim()}
          className="px-3 h-9 rounded-lg bg-gradient-to-br from-cyan to-violet text-stage text-sm font-bold shadow-cyan-glow-sm disabled:opacity-50"
        >
          Add to Pool
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
