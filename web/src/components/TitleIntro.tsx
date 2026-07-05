import { motion, useReducedMotion } from "framer-motion";
import { SURNAMES } from "@/lib/family";

/**
 * TitleIntro — CWABS letters fly in from the back of the screen, rotate,
 * and lock into place with a punch. Kept the depth + spin (it reads well)
 * but ditched the vintage Bowlby One feel for a modern blocky Anton type
 * with neon glow per letter.
 *
 * Total runtime: ~1.4 seconds.
 */
export function TitleIntro() {
  const reduced = useReducedMotion();
  const skipAnim = !!reduced;

  // Direction per letter — different start positions for visual variety
  const FLY_IN = [
    { x: -240, y: -160, z: -1500, rotate: -340, delay: 0 },
    { x: 260, y: -180, z: -1500, rotate: 380, delay: 0.1 },
    { x: -200, y: 220, z: -1500, rotate: -420, delay: 0.2 },
    { x: 220, y: 200, z: -1500, rotate: 460, delay: 0.3 },
    { x: 0, y: -300, z: -1500, rotate: 540, delay: 0.4 },
  ];

  return (
    <div
      className="relative w-full"
      style={{ perspective: "1100px", perspectiveOrigin: "50% 45%" }}
    >
      <div className="flex justify-center items-end gap-0.5 sm:gap-1 md:gap-2 mb-3">
        {SURNAMES.map((item, i) => {
          const fly = FLY_IN[i];
          return (
            <motion.span
              key={item.letter}
              className="font-display text-[5rem] sm:text-[6.5rem] md:text-[8rem] leading-none inline-block"
              style={{
                color: item.color,
                textShadow: `
                  0 0 32px ${item.color}aa,
                  0 0 64px ${item.color}55,
                  0 6px 0 rgba(0,0,0,0.5)
                `,
                WebkitTextStroke: `1.5px ${item.color}`,
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
                      delay: fly.delay,
                      type: "spring",
                      stiffness: 220,
                      damping: 9,
                      mass: 1.1,
                    }
              }
            >
              {item.letter}
            </motion.span>
          );
        })}
      </div>

      {/* Family surnames fade in once letters land */}
      <motion.div
        className="flex justify-center items-center gap-2 sm:gap-3 md:gap-5 flex-wrap px-4"
        initial={skipAnim ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          skipAnim
            ? { duration: 0 }
            : { delay: 1.1, duration: 0.5, ease: "easeOut" }
        }
      >
        {SURNAMES.map((item) => (
          <span
            key={item.name}
            className="text-cream/70 text-[10px] sm:text-xs uppercase tracking-[0.3em] font-bold"
          >
            {item.name}
          </span>
        ))}
      </motion.div>
    </div>
  );
}