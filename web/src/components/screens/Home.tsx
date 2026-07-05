import { Button } from "@/components/ui/Button";
import { Marquee } from "@/components/ui/Marquee";

interface HomeProps {
  onHost: () => void;
  onJoin: () => void;
  hasStoredGame: boolean;
  onResume?: () => void;
}

export function Home({ onHost, onJoin, hasStoredGame, onResume }: HomeProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-between px-5 py-8 stage-scanlines relative overflow-hidden">
      {/* Spotlight backdrop */}
      <div className="absolute inset-0 bg-stage-radial pointer-events-none" />
      <div className="absolute inset-0 bg-stage-velvet pointer-events-none opacity-80" />

      <div className="relative z-10 w-full flex flex-col items-center flex-1 justify-center max-w-md">
        {/* Top marquee */}
        <Marquee className="mb-8 max-w-xs" />

        {/* Title */}
        <div className="text-center mb-10 animate-fade-in-up">
          <h1 className="font-display text-5xl sm:text-6xl text-gold leading-none mb-3"
              style={{ textShadow: "0 0 30px hsl(var(--gold-glow) / 0.4), 0 4px 0 hsl(var(--velvet))" }}>
            FAMILY<br />TRIVIA<br />NIGHT
          </h1>
          <p className="text-cream/60 text-sm uppercase tracking-[0.3em] mt-4">
            The Game Show
          </p>
        </div>

        {/* CTAs */}
        <div className="w-full space-y-3 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
          <Button onClick={onHost} size="xl" fullWidth>
            🎤 Host a Game
          </Button>
          <Button onClick={onJoin} variant="secondary" size="xl" fullWidth>
            🎮 Join a Game
          </Button>

          {hasStoredGame && onResume ? (
            <button
              onClick={onResume}
              className="block w-full text-center text-sm text-cream/50 hover:text-cream/80 mt-4 underline underline-offset-4"
            >
              Resume your game →
            </button>
          ) : null}
        </div>

        <Marquee className="mt-10 max-w-xs" />
      </div>

      <footer className="relative z-10 text-cream/40 text-xs uppercase tracking-widest">
        Made for family game nights
      </footer>
    </div>
  );
}