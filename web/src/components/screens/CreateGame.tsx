import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FamilyMemberSelect } from "@/components/ui/Select";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Marquee } from "@/components/ui/Marquee";

interface CreateGameProps {
  onSubmit: (hostName: string) => Promise<void>;
  onBack: () => void;
}

export function CreateGame({ onSubmit, onBack }: CreateGameProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onSubmit(name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create game");
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
            <CardTitle>Host a Game</CardTitle>
            <p className="text-foreground/60 text-sm mt-1">
              You'll get a 4-letter code to share with your family.
            </p>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-5">
              <FamilyMemberSelect
                label="Who's hosting?"
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
                variant="gold"
                shimmer
                loading={loading}
                disabled={!name.trim()}
              >
                Create Game 🎤
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