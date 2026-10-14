export type SpeciesId = "kicklet" | "glovo" | "nutter" | "thunder" | "bounce";

export type Pet = {
  id: string;
  species: SpeciesId;
  xp: number;
  longShots: number;
  dribbles: number;
  saves: number;
  team: number;
};

export type PetsSave = {
  coins: number;
  roster: Pet[];
  activeId: string;
  tickets: number;
  bestRival: number;
  dayKey: string;
  dayGoals: number;
};

export const PETS_KEY = "fs-pets-save";

export const SPECIES: Record<
  SpeciesId,
  { egg: string; line: [string, string, string]; tint: string }
> = {
  kicklet: { egg: "Kicklet", line: ["Kicklet", "Strikodon", "Goalzilla"], tint: "#3ce39a" },
  glovo: { egg: "Glovlet", line: ["Glovlet", "Glovosaur", "Glovosaurus"], tint: "#7eb6ff" },
  nutter: { egg: "Nib", line: ["Nib", "Nutmeg", "Nutmeg Ninja"], tint: "#ffc65c" },
  thunder: { egg: "Spark", line: ["Spark", "Bootling", "Thunderboot"], tint: "#d7b4ff" },
  bounce: { egg: "Boing", line: ["Boing", "Hopper", "Bouncebeast"], tint: "#ff8b6a" },
};

export function freshPets(): PetsSave {
  const first: Pet = {
    id: "pet-kicklet",
    species: "kicklet",
    xp: 0,
    longShots: 0,
    dribbles: 0,
    saves: 0,
    team: 0,
  };
  return { coins: 0, roster: [first], activeId: first.id, tickets: 0, bestRival: 0, dayKey: "", dayGoals: 0 };
}

export function stageOf(pet: Pet) {
  if (pet.xp >= 90) return 2;
  if (pet.xp >= 28) return 1;
  return 0;
}

/** Same egg, different legend, depending on how you actually played. */
export function petName(pet: Pet) {
  const stage = stageOf(pet);
  const base = SPECIES[pet.species].line[stage]!;
  if (stage === 0) return base;
  if (pet.species === "kicklet") {
    if (pet.longShots >= pet.dribbles + 2) return stage === 2 ? "Goalzilla" : "Strikodon";
    if (pet.dribbles >= pet.longShots + 2) return stage === 2 ? "Nutmeg Ninja" : "Tricklet";
    return base;
  }
  if (pet.species === "glovo" && pet.saves >= 6) return stage === 2 ? "Glovosaurus" : "Wall-let";
  if (pet.species === "thunder" && pet.longShots >= 6) return stage === 2 ? "Thunderboot" : "Flashboot";
  if (pet.species === "bounce" && pet.dribbles >= 6) return stage === 2 ? "Bouncebeast" : "Ricochet";
  if (pet.species === "nutter" && pet.dribbles >= 6) return stage === 2 ? "Nutmeg Ninja" : "Nutmeg";
  return base;
}

export function rivalScore(dayKey: string) {
  let h = 0;
  for (let i = 0; i < dayKey.length; i++) h = (h * 33 + dayKey.charCodeAt(i)) >>> 0;
  return 4 + (h % 7);
}
