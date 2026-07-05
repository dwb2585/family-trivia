import { motion, useReducedMotion } from "framer-motion";

const NAMES = [
  { letter: "C", name: "Crosse" },
  { letter: "W", name: "Wobbekind" },
  { letter: "A", name: "Arts" },
  { letter: "B", name: "Battersby" },
  { letter: "S", name: "Shimizu" },
];

// Each letter flies in from a different off-screen direction with depth.
// Numbers are tuned so the impact feels violent on landing.
const FLY_IN = [
  { x: -720, y: -360, rotate: -210 },
  { x: 720, y: -380, rotate: 210 },
  { x: -640, y: 480, rotate: -110 },
  { x: 640, y: 460, rotate: 110 },
  { x: 0, y: -820, rotate: 380 },
];

/**
 * TitleIntro — the CWABS letters fly in from behind the camera, crash into
 * their final positions spelling out the acronym, then the full family names
 * fade in underneath.
 *
 * Total runtime: ~2.4 seconds. Respects prefers-reduced-motion.
 */
export function TitleIntro() {
  const reduced = useReducedMotion();
  const skipAnim = !!reduced;

  return (
    <div className="relative w-full" style={{ perspective: "1500px" }}>
      {/* CWABS — each letter is its own animated span */}
      <div className="flex justify-center items-center gap-1 sm:gap-2 md:gap-3 mb-5">
        {NAMES.map((item, i) => (
          <motion.span
            key={item.letter}
            className="font-display text-7xl sm:text-8xl md:text-9xl text-gold leading-none inline-block"
            style={{
              textShadow:
                "0 0 40px hsl(var(--gold-glow) / 0.55), 0 6px 0 hsl(var(--velvet) / 0.7), 0 10px 30px rgba(0,0,0,0.55)",
              transformStyle: "preserve-3d",
              transformOrigin: "center",
              // Hint to the browser to promote each letter to its own layer
              willChange: "transform, opacity",
            }}
            initial={
              skipAnim
                ? { opacity: 1, x: 0, y: 0, z: 0, rotate: 0, scale: 1 }
                : {
                    x: FLY_IN[i].x,
                    y: FLY_IN[i].y,
                    z: -2000,
                    rotate: FLY_IN[i].rotate,
                    scale: 0.25,
                    opacity: 0,
                  }
            }
            animate={{
              x: 0,
              y: 0,
              z: 0,
              rotate: 0,
              scale: 1,
              opacity: 1,
            }}
            transition={
              skipAnim
                ? { duration: 0 }
                : {
                    delay: 0.35 + i * 0.18,
                    type: "spring",
                    stiffness: 180,
                    damping: 9,
                    mass: 1.3,
                  }
            }
          >
            {item.letter}
          </motion.span>
        ))}
      </div>

      {/* Full family names — fade in once all letters have landed */}
      <motion.div
        className="flex justify-center items-baseline gap-3 sm:gap-5 md:gap-7 flex-wrap px-4"
        initial={skipAnim ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          skipAnim
            ? { duration: 0 }
            : { delay: 2.05, duration: 0.55, ease: "easeOut" }
        }
      >
        {NAMES.map((item) => (
          <span
            key={item.name}
            className="text-cream/70 text-xs sm:text-sm uppercase tracking-[0.25em] font-bold"
          >
            {item.name}
          </span>
        ))}
      </motion.div>
    </div>
  );
}