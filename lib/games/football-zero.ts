import type { KeeperKind } from "@/lib/games/arcade";

export type ZeroAttrs = {
  speed: number;
  shooting: number;
  dribbling: number;
  control: number;
  special: number;
};

export type ZeroSave = {
  xp: number;
  coins: number;
  keeperLevel: number;
  dribbleLevel: number;
  unspent: number;
  attrs: ZeroAttrs;
  style: "speed" | "curve" | "cannon" | null;
};

export const ZERO_KEY = "fs-zero-save";

export const ZERO_FALLBACK: ZeroSave = {
  xp: 0,
  coins: 0,
  keeperLevel: 1,
  dribbleLevel: 1,
  unspent: 0,
  attrs: { speed: 0, shooting: 0, dribbling: 0, control: 0, special: 0 },
  style: null,
};

export function keeperForLevel(level: number): KeeperKind {
  if (level >= 100) return "reverse";
  if (level >= 50) return "giant";
  if (level >= 20) return "gravity";
  if (level >= 10) return "arms";
  if (level >= 5) return "teleport";
  return "normal";
}

export function keeperBlurb(level: number) {
  const kind = keeperForLevel(level);
  if (kind === "reverse") return "Hard shots come back. Place it, or lose it.";
  if (kind === "giant") return "The keeper is the goal. Find the sliver.";
  if (kind === "gravity") return "The ball bends after it leaves your foot.";
  if (kind === "arms") return "Six arms. The near post is a lie.";
  if (kind === "teleport") return "They appear where you aimed. Hit it early.";
  return "A normal keeper. For now.";
}

export function styleFor(attrs: ZeroAttrs): ZeroSave["style"] {
  const entries = [
    ["speed", attrs.speed],
    ["curve", attrs.control],
    ["cannon", attrs.shooting],
  ] as const;
  const top = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  if (top[1] < 3) return null;
  return top[0];
}

export function grantXp(save: ZeroSave, amount: number): ZeroSave {
  const xp = save.xp + amount;
  const gained = Math.floor(xp / 40) - Math.floor(save.xp / 40);
  return { ...save, xp, unspent: save.unspent + Math.max(0, gained) };
}
