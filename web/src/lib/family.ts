/**
 * The CWABS family roster.
 *
 *   C — Crosse     (1)
 *   W — Wobbekind  (8)
 *   A — Arts       (1)
 *   B — Battersby  (3)
 *   S — Shimizu    (1)
 *
 * Used by the name picker (CreateGame / JoinGame) so no one has to type it.
 * Also drives the CWABS title-screen acronym (the 5 surname letters).
 */

export interface FamilyMember {
  /** First name */
  firstName: string;
  /** Last name / family name */
  lastName: string;
  /** Full display name, e.g. "Daniel Wobbekind" */
  fullName: string;
  /** CWABS letter — derived from the first letter of the surname */
  letter: string;
  /** Family-color badge (shared by everyone in the same surname) */
  color: string;
  /** Emoji avatar */
  emoji: string;
}

/** Per-family color (drives the letter badge color in the dropdown) */
const FAMILY_COLOR: Record<string, string> = {
  Crosse:     "#f59e0b", // amber
  Wobbekind:  "#ef4444", // red
  Arts:       "#a855f7", // purple
  Battersby:  "#3b82f6", // blue
  Shimizu:    "#ec4899", // pink
};

function make(firstName: string, lastName: string, emoji: string): FamilyMember {
  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    letter: lastName.charAt(0).toUpperCase(),
    color: FAMILY_COLOR[lastName] ?? "#94a3b8",
    emoji,
  };
}

/**
 * Full roster — ordered by CWABS acronym (C, W, A, B, S), then alphabetical
 * by first name within each family. This is the order the dropdown shows.
 */
export const FAMILY: FamilyMember[] = [
  // C — Crosse
  make("Morgan", "Crosse", "🦊"),

  // W — Wobbekind
  make("Amber",   "Wobbekind", "🍯"),
  make("Carol",   "Wobbekind", "🌷"),
  make("Daniel",  "Wobbekind", "👨"),
  make("Kai",     "Wobbekind", "🌊"),
  make("Kate",    "Wobbekind", "🌺"),
  make("Mae",     "Wobbekind", "🌼"),
  make("Richard", "Wobbekind", "🧔"),
  make("Teio",    "Wobbekind", "🏔️"),

  // A — Arts
  make("Kevin", "Arts", "🎨"),

  // B — Battersby
  make("Daniel", "Battersby", "⚡"),
  make("Rue",    "Battersby", "🌿"),
  make("Zeke",   "Battersby", "🦁"),

  // S — Shimizu
  make("Meg", "Shimizu", "🌸"),
];

/** Just the 5 CWABS surnames — used by the title-screen intro */
export const SURNAMES: { letter: string; name: string; color: string }[] = [
  { letter: "C", name: "Crosse",    color: FAMILY_COLOR.Crosse },
  { letter: "W", name: "Wobbekind", color: FAMILY_COLOR.Wobbekind },
  { letter: "A", name: "Arts",      color: FAMILY_COLOR.Arts },
  { letter: "B", name: "Battersby", color: FAMILY_COLOR.Battersby },
  { letter: "S", name: "Shimizu",   color: FAMILY_COLOR.Shimizu },
];

export function getFamilyMember(name: string): FamilyMember | undefined {
  return FAMILY.find((m) => m.fullName.toLowerCase() === name.toLowerCase());
}