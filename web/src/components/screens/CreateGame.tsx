import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-8 stage-scanlines relative">
      <div className="absolute inset-0 bg-stage-radial pointer-events-none" />

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
              <Input
                label="Your name"
                placeholder="e.g. Uncle Dave"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                maxLength={24}
              />

              {error ? (
                <p className="text-danger text-sm">{error}</p>
              ) : null}

              <Button type="submit" size="lg" fullWidth loading={loading}>
                Create Game 🎤
              </Button>
              <button
                type="button"
                onClick={onBack}
                className="block w-full text-center text-foreground/50 hover:text-foreground text-sm"
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