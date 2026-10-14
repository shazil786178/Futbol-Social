/** Shared shot rules for Rogue, Zero, and Pets. The picture and the result use the same math. */

export type KeeperKind = "normal" | "teleport" | "arms" | "gravity" | "giant" | "reverse";

export type ChaosId = "giant-ball" | "duplicate" | "gravity" | "moving-goal" | "bounce";

export type ShotMods = {
  speed: number;
  curl: number;
  split: boolean;
  giant: boolean;
  magnet: number;
  under: boolean;
};

export const EMPTY_MODS: ShotMods = {
  speed: 0,
  curl: 0,
  split: false,
  giant: false,
  magnet: 0,
  under: false,
};

export type ShotVerdict = "goal" | "save" | "wide" | "reverse";

export function keeperLabel(kind: KeeperKind) {
  switch (kind) {
    case "teleport":
      return "Teleports";
    case "arms":
      return "Six arms";
    case "gravity":
      return "Bends gravity";
    case "giant":
      return "Fills the goal";
    case "reverse":
      return "Reverses hard shots";
    default:
      return "Reads you";
  }
}

export function judgeShot(input: {
  aim: number;
  power: number;
  hook: number;
  keeper: KeeperKind;
  skill: number;
  mods: ShotMods;
  chaos: ChaosId | null;
  goalShift: number;
}): { endX: number; verdict: ShotVerdict; ends: number[] } {
  const { aim, power, hook, keeper, skill, mods, chaos, goalShift } = input;
  let end = aim + hook * 0.42 + mods.curl * 0.38 - mods.magnet * aim * 0.55;
  if (keeper === "gravity") end += 0.28 * (aim >= 0 ? 1 : -1);
  if (chaos === "gravity") end -= 0.34;
  end = clamp(end, -1.35, 1.35);

  const ends = mods.split ? [end - 0.34, end, end + 0.34] : [end];
  const posts = 0.96 + (chaos === "moving-goal" ? goalShift : 0);
  let reach = 0.34 + skill * 0.28;
  if (keeper === "arms") reach += 0.22;
  if (keeper === "giant") reach = 0.82;
  if (mods.giant || chaos === "giant-ball") reach *= 0.62;
  if (mods.under && power < 0.45) reach *= 0.45;
  if (mods.speed > 0 && power > 0.75) reach *= 0.82;

  if (keeper === "reverse" && power > 0.62 && !mods.under) {
    return { endX: end, verdict: "reverse", ends };
  }

  const verdicts = ends.map((x) => {
    if (Math.abs(x) > Math.abs(posts)) return "wide" as const;
    let kx = clamp(aim * (0.45 + skill * 0.55), -0.9, 0.9);
    if (keeper === "teleport" && power < 0.9) kx = x;
    if (chaos === "duplicate") {
      const left = Math.abs(x - (kx - 0.28));
      const right = Math.abs(x - (kx + 0.28));
      if (Math.min(left, right) < reach * 0.85) return "save" as const;
      return "goal" as const;
    }
    if (Math.abs(x - kx) < reach) return "save" as const;
    return "goal" as const;
  });

  const verdict = verdicts.includes("goal")
    ? "goal"
    : verdicts.includes("save")
      ? "save"
      : "wide";
  return { endX: end, verdict, ends };
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export const CHAOS: { id: ChaosId; label: string; blurb: string }[] = [
  { id: "giant-ball", label: "Wrecking ball", blurb: "The ball is enormous. The keeper can't cover it." },
  { id: "duplicate", label: "Two keepers", blurb: "A copy dives the other way. Shoot between them." },
  { id: "gravity", label: "Gravity flip", blurb: "Shots hook the wrong way." },
  { id: "moving-goal", label: "The goal walks", blurb: "The posts slide. Aim where they are, not where they were." },
  { id: "bounce", label: "Pinball", blurb: "A near miss can still fall in." },
];

export function bounceRescue(verdict: ShotVerdict, chaos: ChaosId | null, endX: number) {
  if (chaos === "bounce" && verdict === "wide" && Math.abs(endX) < 1.15) return "goal" as const;
  return verdict;
}
