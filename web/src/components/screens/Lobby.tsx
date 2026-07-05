import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Marquee } from "@/components/ui/Marquee";
import { DEFAULT_FACTS, type FactDef } from "@/lib/facts";
import type { Player } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface LobbyProps {
  code: string;
  me: Player;
  players: Player[];
  facts: Record<string, string>;           // fact_key -> value (for me)
  onFactChange: (key: string, value: string) => void;
  onReady: () => Promise<void>;
  onStart: () => Promise<void>;
  onCopyCode: () => void;
}

export function Lobby({
  code,
  me,
  players,
  facts,
  onFactChange,
  onReady,
  onStart,
  onCopyCode,
}: LobbyProps) {
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
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

  const factsComplete = DEFAULT_FACTS.every((f) => (facts[f.key] || "").trim().length > 0);

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 stage-scanlines relative">
      <div className="absolute inset-0 bg-stage-radial pointer-events-none" />

      <div className="relative z-10 w-full max-w-2xl mx-auto flex-1 flex flex-col">
        <Marquee className="mb-4" />

        {/* Code banner */}
        <div className="text-center mb-6 animate-fade-in-up">
          <p className="text-cream/60 text-xs uppercase tracking-[0.3em] mb-2">Game Code</p>
          <button
            onClick={onCopyCode}
            className="group inline-flex items-baseline gap-3 bg-card border-2 border-gold/40 hover:border-gold rounded-2xl px-8 py-4 transition-colors"
          >
            <span className="font-mono font-display text-5xl text-gold tracking-[0.3em]"
                  style={{ textShadow: "0 0 30px hsl(var(--gold-glow) / 0.5)" }}>
              {code}
            </span>
            <span className="text-xs text-cream/40 group-hover:text-cream/70 uppercase tracking-wider">
              📋 tap to copy
            </span>
          </button>
        </div>

        {/* Players list */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Players ({players.length})</CardTitle>
              {me.is_host ? (
                <Badge variant="gold">HOST</Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardBody className="pt-2">
            <ul className="space-y-2">
              {players.map((p) => (
                <li
                  key={p.id}
                  className={cn(
                    "flex items-center justify-between px-4 py-2.5 rounded-xl border",
                    p.id === me.id ? "border-gold/40 bg-gold/5" : "border-border bg-stage/40",
                  )}
                >
                  <span className="font-semibold flex items-center gap-2">
                    {p.is_host ? "🎤" : "🎮"} {p.name}
                    {p.id === me.id ? <span className="text-cream/40 text-xs">(you)</span> : null}
                  </span>
                  <Badge variant={p.ready ? "success" : "default"}>
                    {p.ready ? "✓ Ready" : "Entering…"}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        {/* Fact entry form */}
        <Card className="mb-4 flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Tell us about you</CardTitle>
            <p className="text-foreground/60 text-xs mt-1">
              Others will try to guess these answers. Be specific — funnier is better!
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
                  disabled={me.ready}
                />
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Action button */}
        <div className="sticky bottom-0 pt-4 pb-2 bg-gradient-to-t from-stage via-stage to-transparent">
          {me.is_host ? (
            <Button
              onClick={handleStart}
              size="xl"
              fullWidth
              loading={starting}
              disabled={!me.ready || !factsComplete}
            >
              {!me.ready
                ? "Fill in your facts first"
                : !factsComplete
                ? "Answer all questions first"
                : players.length < 2
                ? "Waiting for players…"
                : !everyoneReady
                ? `Start anyway (${players.filter((p) => p.ready).length}/${players.length} ready)`
                : "🎬 Start Game"}
            </Button>
          ) : (
            <Button
              onClick={handleReady}
              size="xl"
              fullWidth
              loading={saving}
              disabled={!factsComplete || me.ready}
              variant={me.ready ? "secondary" : "primary"}
            >
              {me.ready ? "✓ You're ready — waiting for host" : "🎯 I'm Ready"}
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
      <span className="block text-xs font-bold text-cream/70 uppercase tracking-wider mb-1.5">
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
          "focus:outline-none focus:border-gold",
          "transition-colors",
          "disabled:opacity-60",
        )}
      />
    </label>
  );
}