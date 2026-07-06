import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Marquee } from "@/components/ui/Marquee";
import { LeaveButton } from "@/components/ui/LeaveButton";
import { FamilyMemberSelect } from "@/components/ui/Select";
import { FAMILY } from "@/lib/family";
import type { DefaultFact } from "@/lib/supabase";
import {
  getProfile,
  upsertProfile,
  setProfileAvatar,
} from "@/lib/profiles";
import {
  createDefaultFact,
  updateDefaultFact,
  deleteDefaultFact,
  deriveLabelFromPrompt,
  deriveKey,
} from "@/lib/defaultFacts";
import { cn } from "@/lib/utils";

interface ProfileScreenProps {
  initialName?: string;
  onBack: () => void;
  /** Current default-question pool. Owned by App.tsx. */
  defaultFacts: DefaultFact[];
  /** Called after we mutate the pool so App can re-fetch and re-render the lobby. */
  onDefaultFactsChanged: () => void | Promise<void>;
}

/**
 * Profile editor — pick a name, edit avatar, edit that person's answers to
 * the current default-question pool, or add/edit/delete questions in the
 * shared pool itself. Anyone in the family can do any of these — no
 * permissions, no admin role, no separate "custom" section.
 *
 * Auto-saves the active player's answers with a 600ms debounce.
 */
export function ProfileScreen({
  initialName = "",
  onBack,
  defaultFacts,
  onDefaultFactsChanged,
}: ProfileScreenProps) {
  const [name, setName] = useState(initialName);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [avatarEmoji, setAvatarEmoji] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingFact, setAddingFact] = useState(false);
  const [editingFactId, setEditingFactId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Load profile when name changes. We pre-fill the answers from the
  // saved profile (cross-game persistence) and use the default-facts pool
  // to know which keys to render.
  useEffect(() => {
    if (!name.trim()) {
      setAnswers({});
      setAvatarEmoji(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      const profile = await getProfile(name);
      if (cancelled) return;
      const blank: Record<string, string> = {};
      for (const f of defaultFacts) blank[f.key] = "";
      if (profile) Object.assign(blank, profile.facts);
      setAnswers(blank);
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
  }, [name, defaultFacts]);

  // Debounced save for answers (only the keys that match the current pool).
  const saveTimerRef = useRef<number | null>(null);
  const scheduleSaveAnswers = useCallback(
    (next: Record<string, string>) => {
      if (!name.trim()) return;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      setSaving(true);
      saveTimerRef.current = window.setTimeout(async () => {
        // Only persist keys that are still in the current pool — others
        // (deleted facts) get dropped from the profile so they don't sneak
        // back into a future game.
        const knownKeys = new Set(defaultFacts.map((f) => f.key));
        const clean: Record<string, string> = {};
        for (const [k, v] of Object.entries(next)) {
          const trimmed = (v || "").trim();
          if (trimmed && knownKeys.has(k)) clean[k] = trimmed;
        }
        await upsertProfile(name, clean);
        setSaving(false);
      }, 600);
    },
    [name, defaultFacts],
  );

  function handleAnswerChange(key: string, value: string) {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    scheduleSaveAnswers(next);
  }

  async function handleAvatarPick(emoji: string) {
    if (!name.trim()) return;
    const next = emoji || null;
    setAvatarEmoji(next);
    await setProfileAvatar(name, next ?? "");
  }

  // ---- Default-fact pool CRUD ----

  async function handleAddFact(input: { prompt: string; label: string; emoji: string }) {
    if (!name.trim()) return;
    const created = await createDefaultFact({
      prompt: input.prompt,
      label: input.label || deriveLabelFromPrompt(input.prompt),
      emoji: input.emoji,
      createdBy: name.trim(),
    });
    if (created) {
      await onDefaultFactsChanged();
      setAddingFact(false);
    } else {
      setError("Could not add question");
    }
  }

  async function handleUpdateFact(
    id: string,
    patch: Partial<Pick<DefaultFact, "prompt" | "label" | "emoji">>,
  ) {
    await updateDefaultFact(id, patch);
    await onDefaultFactsChanged();
    setEditingFactId(null);
  }

  async function handleDeleteFact(id: string, key: string) {
    await deleteDefaultFact(id, key);
    await onDefaultFactsChanged();
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

              <Card className="mb-4">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Default Questions</CardTitle>
                    <span className="text-xs text-cream/50">
                      {saving ? "Saving…" : Object.values(answers).some((v) => v.trim()) ? "✓ Saved" : ""}
                    </span>
                  </div>
                  <p className="text-foreground/60 text-xs mt-1">
                    Fill in your answers below. Add new questions or delete ones you don't want at the bottom.
                  </p>
                </CardHeader>
                <CardBody className="pt-2 space-y-3">
                  {defaultFacts.map((fact) => (
                    <DefaultAnswerField
                      key={fact.id}
                      fact={fact}
                      value={answers[fact.key] || ""}
                      onChange={(v) => handleAnswerChange(fact.key, v)}
                    />
                  ))}
                </CardBody>
              </Card>

              <Card className="mb-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Edit the question pool</CardTitle>
                  <p className="text-foreground/60 text-xs mt-1">
                    Anyone can add or delete questions. Deleting a question also clears any answers for it.
                  </p>
                </CardHeader>
                <CardBody className="pt-2 space-y-2">
                  <AnimatePresence initial={false}>
                    {defaultFacts.map((fact) => (
                      <motion.div
                        key={fact.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20, height: 0 }}
                        transition={{ duration: 0.18 }}
                      >
                        {editingFactId === fact.id ? (
                          <FactEditForm
                            fact={fact}
                            onSave={(patch) => handleUpdateFact(fact.id, patch)}
                            onCancel={() => setEditingFactId(null)}
                          />
                        ) : pendingDeleteId === fact.id ? (
                          <FactDeleteConfirm
                            fact={fact}
                            onCancel={() => setPendingDeleteId(null)}
                            onConfirm={async () => {
                              await handleDeleteFact(fact.id, fact.key);
                              setPendingDeleteId(null);
                            }}
                          />
                        ) : (
                          <FactRow
                            fact={fact}
                            onEdit={() => setEditingFactId(fact.id)}
                            onDelete={() => setPendingDeleteId(fact.id)}
                          />
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {addingFact ? (
                    <NewFactForm
                      onSubmit={handleAddFact}
                      onCancel={() => setAddingFact(false)}
                    />
                  ) : (
                    <button
                      onClick={() => setAddingFact(true)}
                      className="w-full py-3 rounded-xl border-2 border-dashed border-gold/30 text-gold/70 hover:text-cyan hover:border-cyan transition-colors font-semibold"
                    >
                      Add a question
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

const AVATAR_OPTIONS: string[] = [
  "😎", "🤩", "🥳", "😺", "🐶", "🦊", "🐼", "🦁", "🐯", "🐸",
  "🦄", "🐝", "🦋", "🌈", "⚡", "🔥", "💎", "🌟", "✨", "🚀",
  "🎸", "🎮", "📚", "🎬", "🍕", "🍩", "🌮", "🍣", "🍔", "☕",
  "🏀", "⚽", "🏆", "👑", "💀", "🤖", "👻", "🎯", "🧠", "💯",
];

function DefaultAnswerField({
  fact,
  value,
  onChange,
}: {
  fact: DefaultFact;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-cream/70 uppercase tracking-wider mb-1.5">
        <span className="mr-1.5">{fact.emoji}</span> {fact.prompt}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={120}
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

function FactRow({
  fact,
  onEdit,
  onDelete,
}: {
  fact: DefaultFact;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-stage/40 border border-gold/20">
      <span className="text-xl shrink-0">{fact.emoji || "✨"}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-foreground truncate">{fact.prompt}</div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-cream/40 mt-0.5">
          {fact.label} · key: {fact.key}
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        <button
          onClick={onEdit}
          aria-label="Edit question"
          title="Edit question"
          className="w-8 h-8 rounded-lg bg-stage/60 hover:bg-gold/20 text-cream/70 hover:text-gold flex items-center justify-center transition-colors"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 2.5l2.5 2.5-7.5 7.5H3.5v-2.5L11 2.5z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          aria-label="Delete question"
          title="Delete question"
          className="w-8 h-8 rounded-lg bg-stage/60 hover:bg-danger/20 text-cream/70 hover:text-danger flex items-center justify-center transition-colors"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 4h10M6.5 4V2.5h3V4M5 4l.5 9a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1L11 4" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * Inline two-step delete confirmation. Tap trash -> this prompt appears
 * in place of the row; tap "Yes, delete it" to actually delete, or
 * "Cancel" to dismiss. Keeps the user on the same screen with no modal.
 */
function FactDeleteConfirm({
  fact,
  onCancel,
  onConfirm,
}: {
  fact: DefaultFact;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-danger/10 border border-danger/40">
      <span className="text-xl shrink-0">{fact.emoji || "✨"}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-danger">You sure about that?!</div>
        <div className="text-xs text-cream/60 truncate">
          Deleting <span className="text-cream/80">"{fact.prompt}"</span> clears every answer to it.
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={onCancel}
          disabled={busy}
          className="h-9 px-3 rounded-lg bg-stage/60 text-cream/70 hover:text-foreground text-sm font-semibold disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={busy}
          className="h-9 px-3 rounded-lg bg-gradient-to-br from-red to-[hsl(355,95%,55%)] text-cream text-sm font-bold transition-all disabled:opacity-50"
        >
          {busy ? "Deleting…" : "Yes, delete it"}
        </button>
      </div>
    </div>
  );
}

function FactEditForm({
  fact,
  onSave,
  onCancel,
}: {
  fact: DefaultFact;
  onSave: (patch: Partial<Pick<DefaultFact, "prompt" | "label" | "emoji">>) => void;
  onCancel: () => void;
}) {
  const [prompt, setPrompt] = useState(fact.prompt);
  const [label, setLabel] = useState(fact.label);
  const [emoji, setEmoji] = useState(fact.emoji);

  return (
    <div className="p-3 rounded-xl bg-stage/60 border-2 border-gold/40 space-y-2">
      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Prompt (e.g. What's your favorite color?)"
        className="w-full h-10 px-3 rounded-lg bg-stage border border-border text-foreground text-sm focus:outline-none focus:border-cyan focus:shadow-cyan-glow-sm focus:bg-stage"
      />
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Short label (e.g. favorite color)"
        className="w-full h-10 px-3 rounded-lg bg-stage border border-border text-foreground text-sm focus:outline-none focus:border-cyan focus:shadow-cyan-glow-sm focus:bg-stage"
      />
      <input
        value={emoji}
        onChange={(e) => setEmoji(e.target.value)}
        placeholder="Emoji (optional)"
        maxLength={4}
        className="w-full h-10 px-3 rounded-lg bg-stage border border-border text-foreground text-sm focus:outline-none focus:border-cyan focus:shadow-cyan-glow-sm focus:bg-stage"
      />
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => {
            setPrompt(fact.prompt);
            setLabel(fact.label);
            setEmoji(fact.emoji);
            onCancel();
          }}
          className="px-3 h-9 rounded-lg bg-stage text-cream/70 hover:text-foreground text-sm font-semibold"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave({ prompt, label, emoji })}
          disabled={!prompt.trim() || !label.trim()}
          className="px-3 h-9 rounded-lg bg-gradient-to-br from-cyan to-violet text-stage text-sm font-bold shadow-cyan-glow-sm disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function NewFactForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (input: { prompt: string; label: string; emoji: string }) => void;
  onCancel: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [label, setLabel] = useState("");
  const [emoji, setEmoji] = useState("");
  const [hint] = useState<string>("");

  // Show the user what the auto-derived key will be so they know what it
  // maps to internally.
  const previewKey = label.trim() ? deriveKey(label) : "(prompt-derived)";

  return (
    <div className="p-3 rounded-xl bg-card border-2 border-gold/40 space-y-2">
      <input
        autoFocus
        value={prompt}
        onChange={(e) => {
          setPrompt(e.target.value);
          if (!label) setLabel(deriveLabelFromPrompt(e.target.value));
        }}
        placeholder="Prompt (e.g. What's your favorite color?)"
        className="w-full h-10 px-3 rounded-lg bg-stage border border-border text-foreground text-sm focus:outline-none focus:border-cyan focus:shadow-cyan-glow-sm focus:bg-stage"
      />
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Short label (auto-filled from prompt)"
        className="w-full h-10 px-3 rounded-lg bg-stage border border-border text-foreground text-sm focus:outline-none focus:border-cyan focus:shadow-cyan-glow-sm focus:bg-stage"
      />
      <input
        value={emoji}
        onChange={(e) => setEmoji(e.target.value)}
        placeholder="Emoji (optional)"
        maxLength={4}
        className="w-full h-10 px-3 rounded-lg bg-stage border border-border text-foreground text-sm focus:outline-none focus:border-cyan focus:shadow-cyan-glow-sm focus:bg-stage"
      />
      <p className="text-[10px] uppercase tracking-[0.18em] text-cream/40 font-bold">
        Stable key: <span className="text-cream/70 font-mono">{previewKey}</span>
      </p>
      {hint ? <p className="text-xs text-cream/50">{hint}</p> : null}
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-3 h-9 rounded-lg bg-stage text-cream/70 hover:text-foreground text-sm font-semibold"
        >
          Cancel
        </button>
        <button
          onClick={() => onSubmit({ prompt, label, emoji })}
          disabled={!prompt.trim() || !label.trim()}
          className="px-3 h-9 rounded-lg bg-gradient-to-br from-cyan to-violet text-stage text-sm font-bold shadow-cyan-glow-sm disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}

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