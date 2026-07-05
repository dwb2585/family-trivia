import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Marquee } from "@/components/ui/Marquee";
import { LeaveButton } from "@/components/ui/LeaveButton";
import { FamilyMemberSelect } from "@/components/ui/Select";
import { FAMILY } from "@/lib/family";
import { DEFAULT_FACTS } from "@/lib/facts";
import type { ProfileCustomFact } from "@/lib/supabase";
import {
  getProfile,
  upsertProfile,
  getCustomFacts,
  createCustomFact,
  updateCustomFact,
  deleteCustomFact,
} from "@/lib/profiles";
import { cn } from "@/lib/utils";

interface ProfileScreenProps {
  initialName?: string;
  onBack: () => void;
}

/**
 * Profile editor — pick a name, then edit that person's default facts
 * (the 8 built-in keys) and any custom questions they've added.
 *
 * Auto-saves with a 600ms debounce on edit, so changes stick without
 * needing a Save button. Custom questions can be added/edited/deleted
 * inline.
 */
export function ProfileScreen({ initialName = "", onBack }: ProfileScreenProps) {
  const [name, setName] = useState(initialName);
  const [defaultFacts, setDefaultFacts] = useState<Record<string, string>>({});
  const [customFacts, setCustomFacts] = useState<ProfileCustomFact[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingCustom, setAddingCustom] = useState(false);

  // Load profile when name changes
  useEffect(() => {
    if (!name.trim()) {
      setDefaultFacts({});
      setCustomFacts([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      const [profile, customs] = await Promise.all([
        getProfile(name),
        getCustomFacts(name),
      ]);
      if (cancelled) return;
      // Pre-fill with empty strings for all default keys so the form shows them
      const blank: Record<string, string> = {};
      for (const f of DEFAULT_FACTS) blank[f.key] = "";
      if (profile) Object.assign(blank, profile.facts);
      setDefaultFacts(blank);
      setCustomFacts(customs);
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

  // ----- Custom facts handlers -----

  async function handleAddCustom(prompt: string, label: string, value: string) {
    if (!name.trim()) return;
    const created = await createCustomFact(name, prompt, label, value);
    if (created) {
      setCustomFacts((prev) => [...prev, created]);
      setAddingCustom(false);
    } else {
      setError("Could not add custom question");
    }
  }

  async function handleUpdateCustom(
    id: string,
    patch: Partial<Pick<ProfileCustomFact, "prompt" | "label" | "value">>,
  ) {
    setCustomFacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
    await updateCustomFact(id, patch);
  }

  async function handleDeleteCustom(id: string) {
    setCustomFacts((prev) => prev.filter((c) => c.id !== id));
    await deleteCustomFact(id);
  }

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 stage-scanlines relative">
      <div className="absolute inset-0 bg-stage-radial pointer-events-none" />

      <LeaveButton onLeave={onBack} confirmMessage="Leave without saving further changes?" />

      <div className="relative z-10 w-full max-w-2xl mx-auto flex-1 flex flex-col">
        <Marquee className="mb-4" />

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>👤 My Profile</CardTitle>
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
              {/* Default 8 facts */}
              <Card className="mb-4">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Default Questions</CardTitle>
                    <span className="text-xs text-cream/50">
                      {saving ? "💾 Saving…" : Object.values(defaultFacts).some((v) => v.trim()) ? "✓ Saved" : ""}
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

              {/* Custom facts */}
              <Card className="mb-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Custom Questions</CardTitle>
                  <p className="text-foreground/60 text-xs mt-1">
                    Add your own — e.g. "What's your favorite season?" — and pick from a dropdown in games.
                  </p>
                </CardHeader>
                <CardBody className="pt-2 space-y-3">
                  {customFacts.length === 0 && !addingCustom ? (
                    <p className="text-cream/40 text-sm text-center py-3">
                      No custom questions yet.
                    </p>
                  ) : null}

                  <AnimatePresence initial={false}>
                    {customFacts.map((c) => (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20, height: 0 }}
                        transition={{ duration: 0.18 }}
                      >
                        <CustomFactCard
                          fact={c}
                          onChange={(patch) => handleUpdateCustom(c.id, patch)}
                          onDelete={() => handleDeleteCustom(c.id)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {addingCustom ? (
                    <NewCustomFactForm
                      onSubmit={handleAddCustom}
                      onCancel={() => setAddingCustom(false)}
                    />
                  ) : (
                    <button
                      onClick={() => setAddingCustom(true)}
                      className="w-full py-3 rounded-xl border-2 border-dashed border-gold/30 text-gold/70 hover:text-gold hover:border-gold transition-colors font-semibold"
                    >
                      + Add a custom question
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
          "focus:outline-none focus:border-gold",
          "transition-colors",
        )}
      />
    </label>
  );
}

function CustomFactCard({
  fact,
  onChange,
  onDelete,
}: {
  fact: ProfileCustomFact;
  onChange: (patch: Partial<Pick<ProfileCustomFact, "prompt" | "label" | "value">>) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [prompt, setPrompt] = useState(fact.prompt);
  const [label, setLabel] = useState(fact.label);
  const [value, setValue] = useState(fact.value);

  // Sync local state when fact changes externally
  useEffect(() => {
    setPrompt(fact.prompt);
    setLabel(fact.label);
    setValue(fact.value);
  }, [fact.prompt, fact.label, fact.value]);

  if (!editing) {
    return (
      <div className="flex items-start gap-2 p-3 rounded-xl bg-stage/40 border border-gold/20">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground">{fact.prompt}</div>
          <div className="text-xs text-cream/50 mt-0.5">
            Label: <span className="text-cream/70">{fact.label}</span>
          </div>
          <div className="text-sm text-gold mt-1">
            {fact.value || <span className="text-cream/40 italic">no answer yet</span>}
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
            🗑
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
        className="w-full h-10 px-3 rounded-lg bg-stage border border-border text-foreground text-sm focus:outline-none focus:border-gold"
      />
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label (e.g. favorite season)"
        className="w-full h-10 px-3 rounded-lg bg-stage border border-border text-foreground text-sm focus:outline-none focus:border-gold"
      />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Your answer"
        className="w-full h-10 px-3 rounded-lg bg-stage border border-border text-foreground text-sm focus:outline-none focus:border-gold"
      />
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => {
            setPrompt(fact.prompt);
            setLabel(fact.label);
            setValue(fact.value);
            setEditing(false);
          }}
          className="px-3 h-9 rounded-lg bg-stage text-cream/70 hover:text-foreground text-sm font-semibold"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onChange({ prompt, label, value });
            setEditing(false);
          }}
          disabled={!prompt.trim() || !label.trim()}
          className="px-3 h-9 rounded-lg bg-gold text-stage text-sm font-bold disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function NewCustomFactForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (prompt: string, label: string, value: string) => void;
  onCancel: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");

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
        className="w-full h-10 px-3 rounded-lg bg-stage border border-border text-foreground text-sm focus:outline-none focus:border-gold"
      />
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label (e.g. favorite season) — used in question templates"
        className="w-full h-10 px-3 rounded-lg bg-stage border border-border text-foreground text-sm focus:outline-none focus:border-gold"
      />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Your answer (can add later)"
        className="w-full h-10 px-3 rounded-lg bg-stage border border-border text-foreground text-sm focus:outline-none focus:border-gold"
      />
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-3 h-9 rounded-lg bg-stage text-cream/70 hover:text-foreground text-sm font-semibold"
        >
          Cancel
        </button>
        <button
          onClick={() => onSubmit(prompt, label, value)}
          disabled={!prompt.trim() || !label.trim()}
          className="px-3 h-9 rounded-lg bg-gold text-stage text-sm font-bold disabled:opacity-50"
        >
          Add Question
        </button>
      </div>
    </div>
  );
}