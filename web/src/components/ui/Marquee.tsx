import { cn } from "@/lib/utils";

/**
 * Marquee: a strip of glowing "bulbs" that scrolls horizontally.
 * Used as decorative game-show framing above/below major UI sections.
 */
export function Marquee({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-3 w-full overflow-hidden rounded-full bg-stage", className)}>
      <div
        className="absolute inset-0 marquee-bulbs opacity-90"
        style={{ filter: "drop-shadow(0 0 4px hsl(var(--gold-glow) / 0.6))" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gold/10 to-transparent" />
    </div>
  );
}