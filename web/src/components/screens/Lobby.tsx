import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle, GlowCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Marquee } from "@/components/ui/Marquee";
import { LeaveButton } from "@/components/ui/LeaveButton";
import { avatarFor } from "@/lib/family";
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
  isHost: boolean;
  onFactChange: (key: string, value: string) => void;
  onSetActive: (playerId: string) => void;
  onAddPlayer: (name: string) => Promise<void>;
  onReady: () => Promise<void>;
  onStart: () => Promise<void>;
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
  isHost,
  onFactChange,
  onSetActive,
  onAddPlayer,
  onReady,
  onStart,
  onCopyCode,
  onLeave,
  onOpenProfile,
}: LobbyProps) {
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const activePlayer = myPlayers.find((p) => p.id === activePlayerId) ?? myPlayers[0];
  const allMyReady = myPlayers.every((p) => p.ready);
  const everyoneReady = players.length >= 2 && players.every((p) => p.ready);

  async function handleReady() {
    setSaving(true);
    try {
      await onReady();
    } finally {
      setSaving(false);
    }
  }

  async function handleStart() {
    setStarting(true);
    try {
      await onStart();
    } finally {
      setStarting(false);
    }
  }

  async function handleAddPlayerSubmit() {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await onAddPlayer(newName.trim());
      setNewName("");
      setShowAdd(false);
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
            <CardTitle>Players</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {players.map((p) => {
                  const isMe = p.client_id === activePlayer?.client_id && p.id === activePlayer?.id;
                  const rosterEmoji = avatarFor(p.name, avatarOverrides);
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
                      {p.is_host ? <Badge variant="gold">Host</Badge> : null}
                      {p.ready ? <Badge variant="success">Ready</Badge> : <Badge variant="default">…</Badge>}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </CardBody>
        </Card>

        {/* My players + add new */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>On this device</CardTitle>
            <p className="text-foreground/60 text-xs mt-1">
              Add another family member on this device, or switch who's currently playing.
            </p>
          </CardHeader>
          <CardBody className="pt-2">
            <div className="flex flex-wrap gap-2 mb-3">
              {myPlayers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSetActive(p.id)}
                  className={cn(
                    "px-3 h-9 rounded-lg text-sm font-bold transition-colors",
                    p.id === activePlayer?.id
                      ? "bg-gradient-to-br from-cyan to-violet text-stage"
                      : "bg-stage/60 text-cream/70 hover:text-cyan border border-border",
                  )}
                >
                  {avatarFor(p.name, avatarOverrides)} {p.name}
                </button>
              ))}
              {!showAdd ? (
                <button
                  type="button"
                  onClick={() => setShowAdd(true)}
                  className="px-3 h-9 rounded-lg border-2 border-dashed border-gold/30 text-gold/70 hover:text-cyan hover:border-cyan text-sm font-semibold"
                >
                  + Add player
                </button>
              ) : (
                <div className="flex gap-2 w-full">
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Name"
                    className="flex-1 h-9 px-3 rounded-lg bg-stage border border-border text-foreground text-sm focus:outline-none focus:border-cyan focus:shadow-cyan-glow-sm"
                  />
                  <Button onClick={handleAddPlayerSubmit} disabled={adding || !newName.trim()} size="sm">
                    {adding ? "Adding…" : "Add"}
                  </Button>
                  <Button onClick={() => { setShowAdd(false); setNewName(""); }} variant="ghost" size="sm">
                    Cancel
                  </Button>
                </div>
              )}
            </div>
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
                    {prefilledFromProfile ? (
                      <span className="text-[10px] uppercase tracking-[0.18em] text-cyan font-bold">
                        ✓ from profile
                      </span>
                    ) : null}
                  </div>
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
                    : players.length < 2
                      ? "Need at least 2 players"
                      : "Waiting for everyone to Ready"}
              </Button>
            </GlowCard>
          ) : (
            <GlowCard>
              <Button
                onClick={handleReady}
                disabled={saving || !!activePlayer?.ready}
                className="w-full"
              >
                {saving ? "Saving…" : activePlayer?.ready ? "Ready!" : "I'm Ready"}
              </Button>
            </GlowCard>
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
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={120}
        disabled={disabled}
        placeholder={fact.prompt}
        className={cn(
          "w-full h-10 px-3 rounded-lg text-sm",
          "bg-stage/60 border border-border",
          "text-foreground placeholder:text-foreground/30",
          "focus:outline-none focus:border-cyan focus:shadow-cyan-glow-sm",
          "transition-colors",
        )}
      />
    </label>
  );
}