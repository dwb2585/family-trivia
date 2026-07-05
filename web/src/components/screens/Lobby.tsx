import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle, GlowCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Marquee } from "@/components/ui/Marquee";
import { LeaveButton } from "@/components/ui/LeaveButton";
import { DEFAULT_FACTS, type FactDef } from "@/lib/facts";
import type { Player, ProfileCustomFact } from "@/lib/supabase";
import { cn, uuid } from "@/lib/utils";

interface LobbyProps {
  code: string;
  myPlayers: Player[];
  activePlayerId: string;
  players: Player[];
  facts: Record<string, string>;
  /** Facts for ALL players on this device, keyed by player id */
  myFactsByPlayer: Record<string, Record<string, string>>;
  /** Custom (user-defined) facts for the active player */
  customFacts: ProfileCustomFact[];
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
  customFacts,
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

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await onAddPlayer(newName.trim());
      setNewName("");
      setShowAdd(false);
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  }

  // Facts are now optional — only need 1+ fact across the device.
  const totalFactsEntered = myPlayers.reduce((acc, p) => {
    const pf = myFactsByPlayer[p.id] || {};
    return (
      acc +
      Object.values(pf).filter((v) => (v || "").trim().length > 0).length
    );
  }, 0);
  const canMarkReady = totalFactsEntered > 0;
  const activeEnteredCount = myPlayers[0]?.id === activePlayerId
    ? Object.values(myFactsByPlayer[activePlayerId] || {}).filter(
        (v) => (v || "").trim().length > 0,
      ).length
    : 0;

  return (
    <div className="relative min-h-screen flex flex-col px-4 py-6 overflow-hidden bg-grid">
      <div className="bg-aurora opacity-60" />

      <LeaveButton
        onLeave={onLeave}
        warning={
          isHost && players.length > 1
            ? "You're the host — the game will end for everyone."
            : undefined
        }
      />

      <div className="relative z-10 w-full max-w-2xl mx-auto flex-1 flex flex-col">
        <Marquee className="mb-4" />

        {/* ==== Game code — big HUD badge with neon glow border ==== */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-5"
        >
          <p className="text-cream/60 text-[10px] uppercase tracking-[0.3em] mb-2">
            Game Code
          </p>
          <button
            onClick={onCopyCode}
            className="group inline-flex flex-col items-center px-8 py-4 rounded-2xl bg-card border border-cyan/40 hover:border-cyan hover:shadow-cyan-glow transition-all"
          >
            <span
              className="font-mono font-bold text-5xl sm:text-6xl tracking-[0.4em] hud-code"
            >
              {code}
            </span>
            <span className="text-xs text-cream/40 group-hover:text-cyan uppercase tracking-[0.18em] mt-1 transition-colors">
              tap to copy
            </span>
          </button>
        </motion.div>

        {/* ==== Players on this device — pills with neon active state ==== */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle>
                {myPlayers.length === 1 ? "You" : `On this device (${myPlayers.length})`}
              </CardTitle>
              {isHost ? <Badge variant="cyan">HOST</Badge> : null}
            </div>
          </CardHeader>
          <CardBody className="pt-2">
            <div className="flex flex-wrap gap-2 mb-3">
              {myPlayers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSetActive(p.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-bold transition-all",
                    "border",
                    p.id === activePlayerId
                      ? "bg-gradient-to-br from-cyan to-violet text-stage border-cyan shadow-cyan-glow"
                      : p.ready
                      ? "bg-success/15 text-success border-success/40"
                      : "bg-stage/50 text-foreground/80 border-border hover:border-cyan/60",
                  )}
                >
                  {p.name}
                  {p.ready ? "" : ""}
                </button>
              ))}
              <button
                onClick={() => setShowAdd(true)}
                className="px-3 py-1.5 rounded-full text-sm font-bold border border-dashed border-cyan/40 text-cyan/70 hover:text-cyan hover:border-cyan transition-colors"
              >
                + Add player
              </button>
            </div>
            {showAdd ? (
              <form onSubmit={handleAdd} className="flex gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Name (e.g., the kid)"
                  autoFocus
                  maxLength={24}
                  className="flex-1 h-10 px-3 rounded-lg bg-stage border border-border text-foreground focus:outline-none focus:border-cyan focus:shadow-cyan-glow-sm transition-all"
                />
                <Button type="submit" size="sm" loading={adding} disabled={!newName.trim()}>
                  Add
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAdd(false);
                    setNewName("");
                  }}
                >
                  Cancel
                </Button>
              </form>
            ) : null}
          </CardBody>
        </Card>

        {/* ==== In the game ==== */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle>
              In the game ({players.length})
            </CardTitle>
          </CardHeader>
          <CardBody className="pt-2">
            <ul className="space-y-1.5">
              {players.map((p) => {
                const isMine = p.client_id === myPlayers[0]?.client_id;
                return (
                  <li
                    key={p.id}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-xl border text-sm transition-colors",
                      isMine
                        ? "border-cyan/40 bg-cyan/5"
                        : "border-border bg-stage/40",
                    )}
                  >
                    <span className="font-semibold flex items-center gap-2">
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full",
                          p.is_host ? "bg-gold neon-pulse" : "bg-cyan",
                        )}
                        style={{ color: p.is_host ? "hsl(var(--gold))" : "hsl(var(--cyan))" }}
                      />
                      {p.is_host ? "Host " : ""}{p.name}
                      {isMine && myPlayers.length > 1 ? (
                        <span className="text-cream/40 text-xs">(on your device)</span>
                      ) : null}
                    </span>
                    <Badge variant={p.ready ? "success" : "default"}>
                      {p.ready ? "ready" : "waiting"}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>

        {/* ==== Fact entry for active player ==== */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activePlayer?.id || "none"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col"
          >
            <Card className="mb-4 flex-1">
              <CardHeader className="pb-2">
                <CardTitle>
                  {activePlayer?.name}'s facts
                </CardTitle>
                <p className="text-foreground/60 text-xs mt-1">
                  {activePlayer?.ready
                    ? `${activeEnteredCount} fact${activeEnteredCount === 1 ? "" : "s"} in the pool.`
                    : prefilledFromProfile
                    ? "Loaded from your saved profile — edit if anything's changed."
                    : "Fill in as many or as few as you want. Skip what doesn't fit. Specific = funnier."}
                </p>
              </CardHeader>
              <CardBody className="pt-2">
                <div className="space-y-3">
                  {DEFAULT_FACTS.map((fact) => (
                    <FactField
                      key={fact.key}
                      fact={fact}
                      value={facts[fact.key] || ""}
                      onChange={(v) => onFactChange(fact.key, v)}
                      disabled={!!activePlayer?.ready}
                    />
                  ))}

                  {customFacts.length > 0 ? (
                    <div className="pt-2 mt-2 border-t border-border/50">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-cream/40 font-bold mb-2">
                        Your custom questions
                      </p>
                      {customFacts.map((cf) => (
                        <FactField
                          key={cf.id}
                          fact={{
                            key: cf.id,
                            label: cf.label,
                            prompt: cf.prompt,
                            emoji: "",
                          }}
                          value={facts[cf.id] || ""}
                          onChange={(v) => onFactChange(cf.id, v)}
                          disabled={!!activePlayer?.ready}
                        />
                      ))}
                    </div>
                  ) : null}

                  {onOpenProfile ? (
                    <button
                      type="button"
                      onClick={onOpenProfile}
                      className="block w-full text-center text-sm text-cream/50 hover:text-cyan underline underline-offset-4 pt-2 transition-colors"
                    >
                      Add or edit custom questions in your profile
                    </button>
                  ) : null}
                </div>
              </CardBody>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* ==== Action button ==== */}
        <div className="sticky bottom-0 pt-4 pb-2 bg-gradient-to-t from-stage via-stage/95 to-transparent">
          {isHost ? (
            !allMyReady ? (
              <Button
                onClick={handleReady}
                size="xl"
                fullWidth
                variant="primary"
                shimmer
                loading={saving}
                disabled={!canMarkReady}
              >
                {!canMarkReady
                  ? `Enter at least 1 fact to start (${totalFactsEntered} so far)`
                  : `Submit & Ready (${totalFactsEntered} fact${totalFactsEntered === 1 ? "" : "s"})`}
              </Button>
            ) : (
              <Button
                onClick={handleStart}
                size="xl"
                fullWidth
                variant="gold"
                shimmer
                loading={starting}
                disabled={players.length < 2}
              >
                {players.length < 2
                  ? "Waiting for players…"
                  : !everyoneReady
                  ? `Start anyway (${players.filter((p) => p.ready).length}/${players.length} ready)`
                  : "Start Game"}
              </Button>
            )
          ) : (
            <Button
              onClick={handleReady}
              size="xl"
              fullWidth
              variant="primary"
              shimmer
              loading={saving}
              disabled={!canMarkReady || allMyReady}
            >
              {allMyReady
                ? "You're ready — waiting for host"
                : !canMarkReady
                ? `Enter at least 1 fact (${totalFactsEntered} so far)`
                : `Submit & Ready (${totalFactsEntered} fact${totalFactsEntered === 1 ? "" : "s"})`}
            </Button>
          )}
        </div>

        <Marquee className="mt-4" />
      </div>
    </div>
  );
}

function FactField({
  fact,
  value,
  onChange,
  disabled,
}: {
  fact: FactDef;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold text-cream/70 uppercase tracking-[0.15em] mb-1.5">
        <span className="mr-1.5">{fact.emoji}</span> {fact.prompt}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        maxLength={80}
        placeholder="…"
        className={cn(
          "w-full h-11 px-3 rounded-lg",
          "bg-stage/60 border border-border",
          "text-foreground placeholder:text-foreground/30",
          "focus:outline-none focus:border-cyan focus:shadow-cyan-glow-sm",
          "transition-all",
          "disabled:opacity-60",
        )}
      />
    </label>
  );
}