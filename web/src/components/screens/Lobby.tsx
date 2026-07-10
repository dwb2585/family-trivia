import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle, GlowCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Marquee } from "@/components/ui/Marquee";
import { LeaveButton } from "@/components/ui/LeaveButton";
import { FamilyMemberSelect } from "@/components/ui/Select";
import { VoiceInputField } from "@/components/ui/VoiceInputField";
import { FAMILY, avatarFor } from "@/lib/family";
import type { Player, DefaultFact } from "@/lib/supabase";
import { cn, uuid } from "@/lib/utils";

interface LobbyProps {
  code: string;
  myPlayers: Player[];
  activePlayerId: string;
  players: Player[];
  facts: Record<string, string>;
  /** Facts for all my players, keyed by player id */
  myFactsByPlayer: Record<string, Record<string, string>>;
  /** Current default-question pool (anyone can add/edit/delete via profile). */
  defaultFacts: DefaultFact[];
  /** full_name -> avatar emoji overrides from each profile */
  avatarOverrides: Record<string, string>;
  /** True if this player's facts were just loaded from their saved profile */
  prefilledFromProfile?: boolean;
  /** Per-player count of facts saved to player_facts (from any device). */
  playerFactCounts?: Record<string, number>;
  /** Minimum answers per player required before the game can start. */
  minFactsRequired?: number;
  isHost: boolean;
  onFactChange: (key: string, value: string) => void;
  onSetActive: (playerId: string) => void;
  onAddPlayer: (name: string) => Promise<void>;
  onReady: () => Promise<void>;
  onStart: () => Promise<void>;
  /** Persist the active player's typed answers to their profile. */
  onSaveAnswers?: () => Promise<void>;
  onCopyCode: () => void;
  onLeave: () => void;
  onOpenProfile?: () => void;
}

export function Lobby({
  code,
  myPlayers,
  activePlayerId,
  players,
  facts,
  myFactsByPlayer,
  defaultFacts,
  avatarOverrides,
  prefilledFromProfile = false,
  playerFactCounts = {},
  minFactsRequired = 10,
  isHost,
  onFactChange,
  onSetActive,
  onAddPlayer,
  onReady,
  onStart,
  onSaveAnswers,
  onCopyCode,
  onLeave,
  onOpenProfile,
}: LobbyProps) {
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  // Save-answers indicator state. Per-active-player so switching which
  // family member is filling in shows the right "last saved" stamp.
  const [saveStatusByPlayer, setSaveStatusByPlayer] = useState<
    Record<string, { saving: boolean; savedAt: Date | null; error: string | null }>
  >({});
  const [savingNow, setSavingNow] = useState(false);

  const activePlayer = myPlayers.find((p) => p.id === activePlayerId) ?? myPlayers[0];
  const allMyReady = myPlayers.every((p) => p.ready);
  const multipleOnDevice = myPlayers.length > 1;
  // Find the next player on this device who isn't yet ready — used for the
  // "Pass to [name]" CTA after the current person marks themselves ready.
  const nextLocalPlayer = multipleOnDevice
    ? myPlayers.find((p) => p.id !== activePlayer?.id && !p.ready)
    : null;

  // Active player's answer count (drives Ready button + Add-player copy).
  const activeFactsCount = activePlayer
    ? Object.values(myFactsByPlayer[activePlayer.id] || facts || {}).filter((v) => v.trim()).length
    : 0;
  const activeHasEnough = activeFactsCount >= minFactsRequired;

  // Players across the whole game who've saved < minFactsRequired facts.
  // For players on this device, prefer local state (the form values) —
  // the DB-backed playerFactCounts can lag if the user typed something
  // but hasn't tapped Save yet. For players on other devices we only have
  // the DB count, so use that. This keeps the X/10 pill honest even
  // before Save/Ready/Start fires.
  const countFor = (p: (typeof players)[number]): number => {
    const dbCount = playerFactCounts[p.id] ?? 0;
    if (p.client_id === activePlayer?.client_id) {
      const localFacts = myFactsByPlayer[p.id] || {};
      const localCount = Object.values(localFacts).filter((v) => v.trim()).length;
      return Math.max(dbCount, localCount);
    }
    return dbCount;
  };
  const incomplete = players.filter((p) => countFor(p) < minFactsRequired);
  const incompleteNames = incomplete.map((p) => p.name);
  // Start gates:
  //  - need >= 2 players total
  //  - everyone has >= minFactsRequired facts (incomplete.length === 0)
  //  - players on *other* devices must have flipped Ready (their signal that
  //    they're done typing). Players on *this* device are the host's
  //    responsibility — we don't require them to also tap Ready, the host
  //    can go straight to Start after filling in 10+ for everyone on the
  //    pass-the-phone flow.
  const myClientId = activePlayer?.client_id ?? null;
  const everyoneReady =
    players.length >= 2 &&
    incomplete.length === 0 &&
    players.every((p) => p.client_id === myClientId || p.ready);

  // Family members not already on this device.
  const myNames = new Set(myPlayers.map((p) => p.name));
  const availableFamily = FAMILY.filter((m) => !myNames.has(m.fullName));

  async function handleReady() {
    setSaving(true);
    try {
      await onReady();
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAnswers() {
    if (!activePlayer || !onSaveAnswers) return;
    const pid = activePlayer.id;
    setSavingNow(true);
    setSaveStatusByPlayer((s) => ({
      ...s,
      [pid]: { ...(s[pid] ?? { savedAt: null }), saving: true, error: null },
    }));
    try {
      await onSaveAnswers();
      setSaveStatusByPlayer((s) => ({
        ...s,
        [pid]: { saving: false, savedAt: new Date(), error: null },
      }));
    } catch (e) {
      setSaveStatusByPlayer((s) => ({
        ...s,
        [pid]: {
          saving: false,
          savedAt: s[pid]?.savedAt ?? null,
          error: (e as Error)?.message ?? "Could not save",
        },
      }));
    } finally {
      setSavingNow(false);
    }
  }

  // Status for whichever player is currently active. Switches automatically
  // when the user taps a different player chip above.
  const activeSaveStatus = activePlayer
    ? saveStatusByPlayer[activePlayer.id] ?? { saving: false, savedAt: null, error: null }
    : { saving: false, savedAt: null, error: null };

  async function handleStart() {
    setStarting(true);
    try {
      await onStart();
    } finally {
      setStarting(false);
    }
  }

  async function handleAddPlayerSubmit(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setAdding(true);
    setAddError(null);
    try {
      await onAddPlayer(trimmed);
      setShowAdd(false);
    } catch (e) {
      setAddError((e as Error)?.message ?? "Could not add player");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col px-4 py-6 overflow-hidden bg-grid">
      <div className="bg-aurora opacity-50" />

      <LeaveButton onLeave={onLeave} confirmMessage="Leave the game? The host will need to start a new one." />

      <div className="relative z-10 w-full max-w-2xl mx-auto flex-1 flex flex-col">
        <Marquee className="mb-4" />

        {/* ==== Game code + players ==== */}
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Game Code</CardTitle>
              <Button size="sm" variant="ghost" onClick={onCopyCode}>Copy</Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="text-center">
              <div className="font-mono text-5xl font-black tracking-[0.4em] text-gold bg-clip-text bg-gradient-to-r from-cyan via-violet to-gold drop-shadow-cyan-glow-sm">
                {code}
              </div>
              <p className="text-cream/50 text-xs mt-2">
                Share this code so others can join
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Players in the game */}
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Players</CardTitle>
              <span className="text-[11px] uppercase tracking-[0.18em] text-cream/50 font-bold">
                Facts {minFactsRequired}+ to start
              </span>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {players.map((p) => {
                  const isMe = p.client_id === activePlayer?.client_id && p.id === activePlayer?.id;
                  const rosterEmoji = avatarFor(p.name, avatarOverrides);
                  const count = countFor(p);
                  const hasEnough = count >= minFactsRequired;
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.18 }}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg",
                        isMe ? "bg-cyan/10 border border-cyan/30" : "bg-stage/30",
                      )}
                    >
                      <span className="text-xl">{rosterEmoji}</span>
                      <span className="font-semibold text-foreground flex-1 truncate">{p.name}</span>
                      <span
                        className={cn(
                          "text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-full",
                          hasEnough
                            ? "bg-cyan/15 text-cyan border border-cyan/40"
                            : "bg-danger/15 text-danger border border-danger/40",
                        )}
                        title={`${count} of ${minFactsRequired} facts answered`}
                      >
                        {count}/{minFactsRequired}
                      </span>
                      {p.is_host ? <Badge variant="gold">Host</Badge> : null}
                      {p.ready && hasEnough ? (
                        <Badge variant="success">Ready</Badge>
                      ) : (
                        <Badge variant="default">…</Badge>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {incomplete.length > 0 ? (
                <p className="text-[11px] text-cream/50 mt-2 px-1">
                  Waiting on {incompleteNames.length} of {incompleteNames.length === 1 ? "them" : "them"}: {incompleteNames.join(", ")}
                </p>
              ) : null}
            </div>
          </CardBody>
        </Card>

        {/* My players + add new */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>On this device</CardTitle>
            <p className="text-foreground/60 text-xs mt-1">
              {multipleOnDevice
                ? `Pass the phone between ${myPlayers.length} players. Tap a name to switch whose answers are showing.`
                : "Add another family member on this device, or switch who's currently playing."}
            </p>
          </CardHeader>
          <CardBody className="pt-2">
            {multipleOnDevice && activePlayer ? (
              <div className="mb-3 rounded-xl bg-gradient-to-br from-cyan/15 to-violet/15 border border-cyan/30 p-3 flex items-center gap-3">
                <span className="text-3xl shrink-0">
                  {avatarFor(activePlayer.name, avatarOverrides)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-cyan font-bold">
                    Now filling in
                  </div>
                  <div className="text-base font-bold text-foreground truncate">
                    {activePlayer.name}
                  </div>
                </div>
                {activePlayer.ready ? (
                  <Badge variant="success">Ready</Badge>
                ) : null}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2 mb-3">
              {myPlayers.map((p) => {
                const isActive = p.id === activePlayer?.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSetActive(p.id)}
                    title={
                      isActive
                        ? `${p.name} is active`
                        : `Switch to ${p.name}`
                    }
                    className={cn(
                      "px-3 h-9 rounded-lg text-sm font-bold transition-all",
                      isActive
                        ? "bg-gradient-to-br from-cyan to-violet text-stage ring-2 ring-cyan ring-offset-2 ring-offset-stage shadow-cyan-glow-sm"
                        : "bg-stage/60 text-cream/70 hover:text-cyan border border-border",
                    )}
                  >
                    {avatarFor(p.name, avatarOverrides)} {p.name}
                    {p.ready ? <span className="ml-1.5">✓</span> : null}
                  </button>
                );
              })}
              {!showAdd ? (
                <button
                  type="button"
                  onClick={() => { setShowAdd(true); setAddError(null); }}
                  className="px-3 h-9 rounded-lg border-2 border-dashed border-gold/30 text-gold/70 hover:text-cyan hover:border-cyan text-sm font-semibold"
                >
                  + Add player
                </button>
              ) : null}
            </div>

            {showAdd ? (
              <div className="space-y-2 pt-2 border-t border-border/50">
                <FamilyMemberSelect
                  label="Pick a family member"
                  value=""
                  onChange={(name) => handleAddPlayerSubmit(name)}
                  members={availableFamily}
                  placeholder={
                    adding
                      ? "Adding…"
                      : availableFamily.length === 0
                        ? "All family members added"
                        : "Pick a name to add them"
                  }
                  allowCustom
                />
                {addError ? (
                  <p className="text-danger text-xs">⚠ {addError}</p>
                ) : null}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowAdd(false); setAddError(null); }}
                    className="text-cream/60 hover:text-cream text-xs underline underline-offset-4"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </CardBody>
        </Card>

        {/* ==== Active player's fact entry ==== */}
        <AnimatePresence mode="wait">
          {activePlayer && (
            <motion.div
              key={activePlayer.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="mb-4">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Your answers · <span className="text-gold">{activePlayer.name}</span>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {prefilledFromProfile ? (
                        <span className="text-[10px] uppercase tracking-[0.18em] text-cyan font-bold">
                          ✓ from profile
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          "text-[10px] uppercase tracking-[0.18em] font-bold px-2 py-0.5 rounded-full",
                          activeHasEnough
                            ? "bg-cyan/15 text-cyan border border-cyan/40"
                            : "bg-danger/15 text-danger border border-danger/40",
                        )}
                      >
                        {activeFactsCount}/{minFactsRequired}
                      </span>
                    </div>
                  </div>
                  {!activeHasEnough ? (
                    <p className="text-danger text-xs mt-1 font-semibold">
                      {activePlayer.name} needs {minFactsRequired - activeFactsCount} more{" "}
                      {minFactsRequired - activeFactsCount === 1 ? "answer" : "answers"} before the game can start.
                    </p>
                  ) : null}
                  {defaultFacts.length === 0 ? (
                    <p className="text-cream/50 text-xs italic mt-1">
                      No questions in the pool yet. Add some in your profile.
                    </p>
                  ) : null}
                </CardHeader>
                <CardBody className="pt-2 space-y-3">
                  {defaultFacts.map((fact) => (
                    <FactField
                      key={fact.id}
                      fact={fact}
                      value={facts[fact.key] || ""}
                      onChange={(v) => onFactChange(fact.key, v)}
                      disabled={!!activePlayer?.ready}
                    />
                  ))}

                  {onSaveAnswers ? (
                    <div className="pt-2 space-y-1.5">
                      <button
                        type="button"
                        onClick={handleSaveAnswers}
                        disabled={
                          !activePlayer ||
                          savingNow ||
                          activeSaveStatus.saving ||
                          activeFactsCount === 0
                        }
                        className={cn(
                          "w-full h-12 rounded-xl font-display tracking-wide text-base",
                          "bg-gradient-to-br from-cyan to-violet text-stage",
                          "shadow-cyan-glow-sm btn-3d",
                          "disabled:opacity-40 disabled:cursor-not-allowed",
                        )}
                      >
                        {activeSaveStatus.saving ? "Saving…" : `Save ${activePlayer?.name ?? ""}'s answers`}
                      </button>
                      <div className="flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-[0.18em] font-bold min-h-[16px]">
                        {activeSaveStatus.saving ? (
                          <span className="text-cream/50">Saving…</span>
                        ) : activeSaveStatus.error ? (
                          <span className="text-danger">⚠ {activeSaveStatus.error}</span>
                        ) : activeSaveStatus.savedAt ? (
                          <span className="text-cyan">
                            ✓ Saved at {activeSaveStatus.savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </span>
                        ) : (
                          <span className="text-cream/40">
                            Saves to {activePlayer?.name ?? "your"} profile and updates the {activeFactsCount}/{minFactsRequired} game count — without marking Ready.
                          </span>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {onOpenProfile ? (
                    <button
                      type="button"
                      onClick={onOpenProfile}
                      className="block w-full text-center text-sm text-cream/50 hover:text-cyan underline underline-offset-4 pt-2 transition-colors"
                    >
                      Add or remove questions in your profile
                    </button>
                  ) : null}
                </CardBody>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ==== Action button ==== */}
        <div className="sticky bottom-0 pt-4 pb-2 bg-gradient-to-t from-stage via-stage/95 to-transparent">
          {isHost ? (
            <GlowCard>
              <Button
                onClick={handleStart}
                disabled={starting || !everyoneReady}
                className="w-full"
              >
                {starting
                  ? "Starting…"
                  : everyoneReady
                    ? `Start Game (${players.length} players)`
                    : incomplete.length > 0
                      ? `${incomplete.length} ${incomplete.length === 1 ? "player needs" : "players need"} ${minFactsRequired}+ answers`
                      : players.length < 2
                        ? "Need at least 2 players"
                        : (() => {
                            // Only remote players are blocking — name them
                            // so the host knows who they're waiting on.
                            const waiting = players.filter(
                              (p) => p.client_id !== myClientId && !p.ready,
                            );
                            if (waiting.length === 0)
                              return "Waiting for everyone to Ready";
                            const names = waiting.map((p) => p.name).join(", ");
                            return `Waiting on ${names} to Ready`;
                          })()}
              </Button>
            </GlowCard>
          ) : (
            <div className="space-y-2">
              {multipleOnDevice && activePlayer?.ready && nextLocalPlayer ? (
                <GlowCard>
                  <Button
                    onClick={() => onSetActive(nextLocalPlayer.id)}
                    className="w-full"
                  >
                    Pass the phone → {avatarFor(nextLocalPlayer.name, avatarOverrides)} {nextLocalPlayer.name}
                  </Button>
                </GlowCard>
              ) : null}
              <GlowCard>
                <Button
                  onClick={handleReady}
                  disabled={saving || !!activePlayer?.ready || !activeHasEnough}
                  className="w-full"
                >
                  {saving
                    ? "Saving…"
                    : activePlayer?.ready
                      ? multipleOnDevice && nextLocalPlayer
                        ? `Waiting for ${nextLocalPlayer.name}…`
                        : "Ready!"
                      : !activeHasEnough
                        ? `Answer ${minFactsRequired - activeFactsCount} more to Ready`
                        : "I'm Ready"}
                </Button>
              </GlowCard>
            </div>
          )}
        </div>

        <Marquee className="mt-4" />
      </div>
    </div>
  );
}

interface FactFieldProps {
  fact: DefaultFact;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

function FactField({ fact, value, onChange, disabled }: FactFieldProps) {
  const filled = value.trim().length > 0;
  return (
    <label className={cn("block", disabled && "opacity-60")}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-cream/70 uppercase tracking-wider">
          <span className="mr-1.5">{fact.emoji}</span> {fact.label}
        </span>
        <span className={cn(
          "text-[10px] font-bold",
          filled ? "text-cyan" : "text-cream/30",
        )}>
          {filled ? "✓" : "…"}
        </span>
      </div>
      <VoiceInputField
        value={value}
        onChange={onChange}
        placeholder={fact.prompt}
        maxLength={120}
        disabled={disabled}
        inputClassName="h-10 text-sm"
        ariaLabel={`Voice input for ${fact.label}`}
      />
    </label>
  );
}