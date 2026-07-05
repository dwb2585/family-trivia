import { cn } from "@/lib/utils";

/**
 * Marquee: thin animated gradient bar — section divider with subtle shimmer.
 * Keeps the API/role of the old marquee (decorative divider) but ditches
 * the vintage lightbulb aesthetic for a modern HUD look.
 */
export function Marquee({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-[2px] w-full overflow-hidden rounded-full", className)}>
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(90deg, transparent 0%, hsl(var(--cyan)) 50%, transparent 100%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 2.5s linear infinite",
        }}
      />
    </div>
  );
}