/** Moves you can throw while the ball is at your feet. Level 1 starts with two. */

export type SkillId =
  | "power"
  | "croqueta"
  | "stepover"
  | "roll"
  | "cruyff"
  | "elastico"
  | "heel"
  | "rainbow"
  | "roulette";

export type SkillMove = {
  id: SkillId;
  name: string;
  unlock: number;
  blurb: string;
};

export const SKILLS: SkillMove[] = [
  { id: "power", name: "Power shot", unlock: 1, blurb: "A driven strike. The keeper is late." },
  { id: "croqueta", name: "La Croqueta", unlock: 1, blurb: "Tap it across your body and leave them." },
  { id: "stepover", name: "Stepover", unlock: 2, blurb: "Show the shot, take the other lane." },
  { id: "roll", name: "Ball roll", unlock: 3, blurb: "Roll it across and keep your stride." },
  { id: "cruyff", name: "Cruyff turn", unlock: 4, blurb: "Fake the strike, drag it behind you." },
  { id: "elastico", name: "Elastico", unlock: 5, blurb: "Snap one way, explode the other." },
  { id: "heel", name: "Heel chop", unlock: 6, blurb: "Chop it back with the heel." },
  { id: "rainbow", name: "Rainbow", unlock: 7, blurb: "Flick it over the slide." },
  { id: "roulette", name: "Roulette", unlock: 8, blurb: "Spin through the contact." },
];

export const SKILL_KEY = "fs-skill-book";
const XP_PER_LEVEL = 40;

export type SkillBook = { xp: number };

export const SKILL_BOOK_FALLBACK: SkillBook = { xp: 0 };

export function levelForXp(xp: number) {
  return 1 + Math.floor(Math.max(0, xp) / XP_PER_LEVEL);
}

export function unlockedSkills(level: number) {
  return SKILLS.filter((skill) => skill.unlock <= level);
}

export function nextSkill(level: number) {
  return SKILLS.find((skill) => skill.unlock === level + 1) ?? null;
}

export function xpToNext(xp: number) {
  const into = xp % XP_PER_LEVEL;
  return XP_PER_LEVEL - into;
}
