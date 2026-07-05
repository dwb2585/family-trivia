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

/**
 * Home — single-screen main menu. Modern mobile-game UI:
 * - Aurora gradient background animates behind the hero
 * - CWABS title (TitleIntro) is the visual hero
 * - Stacked CTAs: Host (gold gradient, the heroic act), Join (cyan gradient),
 *   Profile (subtle ghost)
 * - Resume link only appears if the user has a session in progress
 */
export function Home({ onHost, onJoin, onProfile, hasStoredGame, onResume }: HomeProps) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-between px-5 py-8 overflow-hidden bg-grid">
      {/* Aurora blobs — modern backdrop */}
      <div className="bg-aurora" />
      {/* Soft spotlight from the top */}
      <div className="absolute inset-0 bg-spotlight pointer-events-none" />

      <div className="relative z-10 w-full flex flex-col items-center flex-1 justify-center max-w-md">
        <Marquee className="mb-6 max-w-xs" />

        {/* Theatrical CWABS title */}
        <TitleIntro />

        {/* CTAs — visible immediately, gentle fade-in once title settles */}
        <div className="w-full space-y-3 mt-8">
          <Button onClick={onHost} size="xl" fullWidth variant="gold" shimmer>
            🎤 Host a Game
          </Button>
          <Button onClick={onJoin} size="xl" fullWidth variant="primary" shimmer>
            🎮 Join a Game
          </Button>
          <Button onClick={onProfile} variant="ghost" size="md" fullWidth>
            👤 Edit My Profile
          </Button>

          {hasStoredGame && onResume ? (
            <button
              onClick={onResume}
              className="block w-full text-center text-sm text-cream/50 hover:text-cyan mt-4 underline underline-offset-4 transition-colors"
            >
              Resume your game →
            </button>
          ) : null}
        </div>

        <Marquee className="mt-10 max-w-xs" />
      </div>

      <footer className="relative z-10 text-cream/40 text-[10px] uppercase tracking-[0.3em] mt-6">
        A Dan
        <span className="text-cyan text-[8px] align-super font-bold">2</span>
        {" "}production
      </footer>
    </div>
  );
}