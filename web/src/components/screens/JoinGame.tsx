import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FamilyMemberSelect } from "@/components/ui/Select";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Marquee } from "@/components/ui/Marquee";

interface JoinGameProps {
  onSubmit: (code: string, name: string) => Promise<void>;
  onBack: () => void;
  initialCode?: string;
}

export function JoinGame({ onSubmit, onBack, initialCode = "" }: JoinGameProps) {
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onSubmit(code.trim().toUpperCase(), name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join game");
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-5 py-8 overflow-hidden bg-grid">
      <div className="bg-aurora" />
      <div className="absolute inset-0 bg-spotlight pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <Marquee className="mb-6" />

        <Card>
          <CardHeader>
            <CardTitle>Join a Game</CardTitle>
            <p className="text-foreground/60 text-sm mt-1">
              Ask the host for the 4-letter code.
            </p>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Game Code"
                placeholder="ABCD"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
                mono
                maxLength={4}
                autoFocus={!initialCode}
              />
              <FamilyMemberSelect
                label="Who's playing?"
                value={name}
                onChange={setName}
                allowCustom
              />

              {error ? (
                <p className="text-danger text-sm">{error}</p>
              ) : null}

              <Button
                type="submit"
                size="lg"
                fullWidth
                variant="primary"
                shimmer
                loading={loading}
                disabled={!code.trim() || !name.trim()}
              >
                Join Game 🎮
              </Button>
              <button
                type="button"
                onClick={onBack}
                className="block w-full text-center text-foreground/50 hover:text-cyan text-sm transition-colors"
              >
                ← Back
              </button>
            </form>
          </CardBody>
        </Card>

        <Marquee className="mt-6" />
      </div>
    </div>
  );
}