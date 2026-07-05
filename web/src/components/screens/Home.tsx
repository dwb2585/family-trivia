import { Button } from "@/components/ui/Button";
import { Marquee } from "@/components/ui/Marquee";
import { TitleIntro } from "@/components/TitleIntro";

interface HomeProps {
  onHost: () => void;
  onJoin: () => void;
  onProfile: () => void;
  hasStoredGame: boolean;
  onResume?: () => void;
}

export function Home({ onHost, onJoin, onProfile, hasStoredGame, onResume }: HomeProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-between px-5 py-8 stage-scanlines relative overflow-hidden">
      {/* Spotlight + velvet backdrop */}
      <div className="absolute inset-0 bg-stage-radial pointer-events-none" />
      <div className="absolute inset-0 bg-stage-velvet pointer-events-none opacity-80" />

      <div className="relative z-10 w-full flex flex-col items-center flex-1 justify-center max-w-md">
        {/* Top marquee */}
        <Marquee className="mb-6 max-w-xs" />

        {/* Theatrical CWABS title — letters crash in, names fade below */}
        <TitleIntro />

        {/* CTAs — fade in after the title sequence finishes */}
        <div
          className="w-full space-y-3 mt-8 animate-fade-in-up"
          style={{ animationDelay: "2.5s", opacity: 0 }}
        >
          <Button onClick={onHost} size="xl" fullWidth>
            🎤 Host a Game
          </Button>
          <Button onClick={onJoin} variant="secondary" size="xl" fullWidth>
            🎮 Join a Game
          </Button>
          <Button onClick={onProfile} variant="ghost" size="lg" fullWidth>
            👤 Edit My Profile
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