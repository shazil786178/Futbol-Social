import { entitySlug } from "@/lib/entities/slug";

export type FantasyPosition = "GK" | "DEF" | "MID" | "FWD";

export type FantasyPlayer = {
  slug: string;
  name: string;
  club: string;
  position: FantasyPosition;
  /** £m */
  price: number;
};

/** Champions League pool. Prices are game balance, not market value — edit freely. */
const RAW: [string, string, FantasyPosition, number][] = [
  // Real Madrid
  ["Thibaut Courtois", "Real Madrid", "GK", 6.0],
  ["Trent Alexander-Arnold", "Real Madrid", "DEF", 6.5],
  ["Antonio Rüdiger", "Real Madrid", "DEF", 5.5],
  ["Dean Huijsen", "Real Madrid", "DEF", 5.0],
  ["Jude Bellingham", "Real Madrid", "MID", 9.5],
  ["Federico Valverde", "Real Madrid", "MID", 7.5],
  ["Arda Güler", "Real Madrid", "MID", 7.0],
  ["Kylian Mbappé", "Real Madrid", "FWD", 14.0],
  ["Vinícius Júnior", "Real Madrid", "FWD", 12.0],
  // Barcelona
  ["Joan García", "Barcelona", "GK", 5.0],
  ["Jules Koundé", "Barcelona", "DEF", 5.5],
  ["Pau Cubarsí", "Barcelona", "DEF", 5.0],
  ["Alejandro Balde", "Barcelona", "DEF", 5.0],
  ["Pedri", "Barcelona", "MID", 8.5],
  ["Frenkie de Jong", "Barcelona", "MID", 6.5],
  ["Lamine Yamal", "Barcelona", "FWD", 12.5],
  ["Raphinha", "Barcelona", "FWD", 11.0],
  ["Robert Lewandowski", "Barcelona", "FWD", 10.0],
  // Atlético Madrid
  ["Jan Oblak", "Atlético Madrid", "GK", 5.0],
  ["José Giménez", "Atlético Madrid", "DEF", 4.5],
  ["Koke", "Atlético Madrid", "MID", 5.5],
  ["Julián Álvarez", "Atlético Madrid", "FWD", 10.0],
  ["Antoine Griezmann", "Atlético Madrid", "FWD", 8.0],
  // Manchester City
  ["Gianluigi Donnarumma", "Manchester City", "GK", 5.5],
  ["Joško Gvardiol", "Manchester City", "DEF", 6.0],
  ["Rúben Dias", "Manchester City", "DEF", 5.5],
  ["Rodri", "Manchester City", "MID", 7.0],
  ["Phil Foden", "Manchester City", "MID", 8.0],
  ["Tijjani Reijnders", "Manchester City", "MID", 7.0],
  ["Erling Haaland", "Manchester City", "FWD", 14.5],
  // Arsenal
  ["David Raya", "Arsenal", "GK", 5.5],
  ["William Saliba", "Arsenal", "DEF", 6.0],
  ["Gabriel Magalhães", "Arsenal", "DEF", 6.0],
  ["Martin Ødegaard", "Arsenal", "MID", 8.0],
  ["Declan Rice", "Arsenal", "MID", 7.5],
  ["Bukayo Saka", "Arsenal", "FWD", 10.5],
  ["Viktor Gyökeres", "Arsenal", "FWD", 10.0],
  // Liverpool
  ["Alisson", "Liverpool", "GK", 5.5],
  ["Virgil van Dijk", "Liverpool", "DEF", 6.0],
  ["Jeremie Frimpong", "Liverpool", "DEF", 5.5],
  ["Florian Wirtz", "Liverpool", "MID", 9.5],
  ["Dominik Szoboszlai", "Liverpool", "MID", 7.5],
  ["Alexis Mac Allister", "Liverpool", "MID", 7.0],
  ["Mohamed Salah", "Liverpool", "FWD", 13.0],
  ["Alexander Isak", "Liverpool", "FWD", 11.0],
  ["Hugo Ekitike", "Liverpool", "FWD", 9.0],
  // Chelsea
  ["Robert Sánchez", "Chelsea", "GK", 4.5],
  ["Marc Cucurella", "Chelsea", "DEF", 5.0],
  ["Cole Palmer", "Chelsea", "MID", 10.5],
  ["Enzo Fernández", "Chelsea", "MID", 7.5],
  ["João Pedro", "Chelsea", "FWD", 8.5],
  // Bayern Munich
  ["Manuel Neuer", "Bayern Munich", "GK", 5.0],
  ["Dayot Upamecano", "Bayern Munich", "DEF", 5.0],
  ["Alphonso Davies", "Bayern Munich", "DEF", 5.5],
  ["Joshua Kimmich", "Bayern Munich", "MID", 7.0],
  ["Jamal Musiala", "Bayern Munich", "MID", 9.0],
  ["Michael Olise", "Bayern Munich", "FWD", 10.0],
  ["Harry Kane", "Bayern Munich", "FWD", 13.5],
  // Borussia Dortmund
  ["Gregor Kobel", "Borussia Dortmund", "GK", 5.0],
  ["Nico Schlotterbeck", "Borussia Dortmund", "DEF", 5.0],
  ["Julian Brandt", "Borussia Dortmund", "MID", 6.5],
  ["Serhou Guirassy", "Borussia Dortmund", "FWD", 9.5],
  // Bayer Leverkusen
  ["Alejandro Grimaldo", "Bayer Leverkusen", "DEF", 5.5],
  ["Patrik Schick", "Bayer Leverkusen", "FWD", 8.0],
  // Paris Saint-Germain
  ["Lucas Chevalier", "Paris Saint-Germain", "GK", 5.0],
  ["Achraf Hakimi", "Paris Saint-Germain", "DEF", 6.5],
  ["Nuno Mendes", "Paris Saint-Germain", "DEF", 6.0],
  ["Marquinhos", "Paris Saint-Germain", "DEF", 5.5],
  ["Vitinha", "Paris Saint-Germain", "MID", 7.5],
  ["João Neves", "Paris Saint-Germain", "MID", 7.0],
  ["Ousmane Dembélé", "Paris Saint-Germain", "FWD", 11.5],
  ["Khvicha Kvaratskhelia", "Paris Saint-Germain", "FWD", 10.5],
  // Inter
  ["Yann Sommer", "Inter Milan", "GK", 5.0],
  ["Alessandro Bastoni", "Inter Milan", "DEF", 5.5],
  ["Denzel Dumfries", "Inter Milan", "DEF", 5.5],
  ["Nicolò Barella", "Inter Milan", "MID", 7.0],
  ["Hakan Çalhanoğlu", "Inter Milan", "MID", 6.5],
  ["Lautaro Martínez", "Inter Milan", "FWD", 10.0],
  ["Marcus Thuram", "Inter Milan", "FWD", 8.5],
  // Napoli
  ["Alex Meret", "Napoli", "GK", 4.5],
  ["Giovanni Di Lorenzo", "Napoli", "DEF", 5.0],
  ["Scott McTominay", "Napoli", "MID", 7.5],
  ["Kevin De Bruyne", "Napoli", "MID", 8.0],
  ["Rasmus Højlund", "Napoli", "FWD", 8.0],
];

export const FANTASY_PLAYERS: FantasyPlayer[] = RAW.map(
  ([name, club, position, price]) => ({
    slug: entitySlug(name),
    name,
    club,
    position,
    price,
  }),
);

const BY_SLUG = new Map(FANTASY_PLAYERS.map((p) => [p.slug, p]));

export function fantasyPlayer(slug: string): FantasyPlayer | undefined {
  return BY_SLUG.get(slug);
}

export const FANTASY_CLUBS = [...new Set(FANTASY_PLAYERS.map((p) => p.club))];

export const FANTASY_RULES = {
  budget: 100,
  squadSize: 11,
  maxPerClub: 3,
  positions: {
    GK: { min: 1, max: 1 },
    DEF: { min: 3, max: 5 },
    MID: { min: 2, max: 5 },
    FWD: { min: 1, max: 3 },
  } satisfies Record<FantasyPosition, { min: number; max: number }>,
} as const;

export const FANTASY_SCORING = [
  { label: "Club plays the match", points: "+2" },
  { label: "Goal — forward", points: "+4" },
  { label: "Goal — midfielder", points: "+5" },
  { label: "Goal — defender / keeper", points: "+6" },
  { label: "Clean sheet — keeper / defender", points: "+4" },
  { label: "Clean sheet — midfielder", points: "+1" },
  { label: "Club win", points: "+1" },
  { label: "Every 2 conceded — keeper / defender", points: "-1" },
  { label: "Captain", points: "×2" },
] as const;

export const POSITION_LABEL: Record<FantasyPosition, string> = {
  GK: "Goalkeeper",
  DEF: "Defenders",
  MID: "Midfielders",
  FWD: "Forwards",
};

export type SquadCheck = { ok: true } | { ok: false; error: string };

export function validateSquad(slugs: string[], captain: string | null): SquadCheck {
  const unique = [...new Set(slugs)];
  if (unique.length !== FANTASY_RULES.squadSize) {
    return { ok: false, error: `Pick exactly ${FANTASY_RULES.squadSize} players.` };
  }
  const players = unique.map(fantasyPlayer);
  if (players.some((p) => !p)) {
    return { ok: false, error: "Unknown player in squad." };
  }
  const list = players as FantasyPlayer[];

  const cost = list.reduce((sum, p) => sum + p.price, 0);
  if (cost > FANTASY_RULES.budget + 1e-9) {
    return { ok: false, error: `Over budget: £${cost.toFixed(1)}m of £${FANTASY_RULES.budget}m.` };
  }

  for (const [pos, { min, max }] of Object.entries(FANTASY_RULES.positions)) {
    const n = list.filter((p) => p.position === pos).length;
    if (n < min || n > max) {
      return {
        ok: false,
        error:
          min === max
            ? `You need exactly ${min} ${POSITION_LABEL[pos as FantasyPosition].toLowerCase().replace(/s$/, "")}.`
            : `${POSITION_LABEL[pos as FantasyPosition]}: pick ${min}–${max}.`,
      };
    }
  }

  const perClub = new Map<string, number>();
  for (const p of list) perClub.set(p.club, (perClub.get(p.club) ?? 0) + 1);
  for (const [club, n] of perClub) {
    if (n > FANTASY_RULES.maxPerClub) {
      return { ok: false, error: `Max ${FANTASY_RULES.maxPerClub} players from ${club}.` };
    }
  }

  if (!captain || !unique.includes(captain)) {
    return { ok: false, error: "Choose a captain from your XI." };
  }

  return { ok: true };
}
