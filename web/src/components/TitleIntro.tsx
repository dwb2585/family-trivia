import { motion, useReducedMotion } from "framer-motion";

const NAMES = [
  { letter: "C", name: "Crosse" },
  { letter: "W", name: "Wobbekind" },
  { letter: "A", name: "Arts" },
  { letter: "B", name: "Battersby" },
  { letter: "S", name: "Shimizu" },
];

// Each letter FIRES from deep behind the camera plane, spinning like a tossed
// object, and SLAMS into the front of the screen. Stagger means they don't
// all land at once — the last letter is the punchline.
//
//   z: starts at -2400 (way behind camera), ends at 0 (front of screen)
//   scale: starts tiny (0.15), ends full (1) — perspective makes them grow
//   rotate: full multi-turn spin during flight for "tossed missile" feel
const FLY_IN = [
  { x: -260, y: -180, z: -2400, rotate: -480, delay: 0.35 },
  { x: 280, y: -200, z: -2400, rotate: 520, delay: 0.50 },
  { x: -220, y: 240, z: -2400, rotate: -560, delay: 0.65 },
  { x: 240, y: 220, z: -2400, rotate: 600, delay: 0.80 },
  { x: 0, y: -340, z: -2400, rotate: 720, delay: 0.95 },
];

/**
 * TitleIntro — CWABS theatrical intro.
 *
 * Letters FLY FROM BEHIND THE CAMERA toward the audience (true z-axis depth,
 * not just x/y translation), tumbling like tossed props, then CRASH into the
 * front of the screen with a springy impact. Names fade in below once the
 * dust settles.
 *
 * Total runtime: ~2.6 seconds. Respects prefers-reduced-motion.
 */
export function TitleIntro() {
  const reduced = useReducedMotion();
  const skipAnim = !!reduced;

  return (
    <div
      className="relative w-full"
      style={{ perspective: "1100px", perspectiveOrigin: "50% 45%" }}
    >
      {/* CWABS — each letter is its own animated span on its own 3D layer */}
      <div className="flex justify-center items-center gap-1 sm:gap-2 md:gap-3 mb-5">
        {NAMES.map((item, i) => {
          const fly = FLY_IN[i];
          return (
            <motion.span
              key={item.letter}
              className="font-display text-7xl sm:text-8xl md:text-9xl text-gold leading-none inline-block"
              style={{
                textShadow:
                  "0 0 50px hsl(var(--gold-glow) / 0.7), 0 8px 0 hsl(var(--velvet) / 0.75), 0 14px 35px rgba(0,0,0,0.65)",
                transformStyle: "preserve-3d",
                transformOrigin: "center",
                willChange: "transform, opacity",
              }}
              initial={
                skipAnim
                  ? { opacity: 1, x: 0, y: 0, z: 0, rotate: 0, scale: 1 }
                  : {
                      x: fly.x,
                      y: fly.y,
                      z: fly.z,
                      rotate: fly.rotate,
                      scale: 0.15,
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
                      // Stagger: each letter launches a beat after the previous
                      delay: fly.delay,
                      // Spring for impact — high stiffness = hard crash,
                      // low damping = bounce on landing
                      type: "spring",
                      stiffness: 240,
                      damping: 7,
                      mass: 1.4,
                      // Per-axis easing: x/y land fast, z keeps a tiny
                      // overshoot for that "smack" feel
                    }
              }
            >
              {item.letter}
            </motion.span>
          );
        })}
      </div>

      {/* Full family names — fade in once all letters have landed */}
      <motion.div
        className="flex justify-center items-baseline gap-3 sm:gap-5 md:gap-7 flex-wrap px-4"
        initial={skipAnim ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          skipAnim
            ? { duration: 0 }
            : { delay: 2.25, duration: 0.6, ease: "easeOut" }
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