import { entitySlug } from "@/lib/entities/slug";

export type CatalogPlayer = {
  name: string;
  team: string;
  slug: string;
  role: string;
};

export type CatalogTeam = {
  name: string;
  slug: string;
  league: string;
};

const PLAYERS_RAW: Omit<CatalogPlayer, "slug">[] = [
  { name: "Erling Haaland", team: "Manchester City", role: "Forward" },
  { name: "Kylian Mbappé", team: "Real Madrid", role: "Forward" },
  { name: "Mohamed Salah", team: "Liverpool", role: "Forward" },
  { name: "Vinícius Júnior", team: "Real Madrid", role: "Forward" },
  { name: "Harry Kane", team: "Bayern Munich", role: "Forward" },
  { name: "Jude Bellingham", team: "Real Madrid", role: "Midfielder" },
  { name: "Bukayo Saka", team: "Arsenal", role: "Winger" },
  { name: "Lionel Messi", team: "Inter Miami", role: "Forward" },
  { name: "Robert Lewandowski", team: "Barcelona", role: "Forward" },
  { name: "Pedri", team: "Barcelona", role: "Midfielder" },
  { name: "Florian Wirtz", team: "Bayer Leverkusen", role: "Midfielder" },
  { name: "Lautaro Martínez", team: "Inter Milan", role: "Forward" },
  { name: "Cole Palmer", team: "Chelsea", role: "Attacking mid" },
  { name: "Phil Foden", team: "Manchester City", role: "Midfielder" },
  { name: "Lamine Yamal", team: "Barcelona", role: "Winger" },
  { name: "Kevin De Bruyne", team: "Manchester City", role: "Midfielder" },
  { name: "Rodri", team: "Manchester City", role: "Midfielder" },
  { name: "Virgil van Dijk", team: "Liverpool", role: "Defender" },
  { name: "Thibaut Courtois", team: "Real Madrid", role: "Goalkeeper" },
  { name: "Jamal Musiala", team: "Bayern Munich", role: "Midfielder" },
];

const TEAMS_RAW: Omit<CatalogTeam, "slug">[] = [
  { name: "Manchester City", league: "Premier League" },
  { name: "Arsenal", league: "Premier League" },
  { name: "Liverpool", league: "Premier League" },
  { name: "Chelsea", league: "Premier League" },
  { name: "Manchester United", league: "Premier League" },
  { name: "Tottenham Hotspur", league: "Premier League" },
  { name: "Real Madrid", league: "La Liga" },
  { name: "Barcelona", league: "La Liga" },
  { name: "Atlético Madrid", league: "La Liga" },
  { name: "Bayern Munich", league: "Bundesliga" },
  { name: "Borussia Dortmund", league: "Bundesliga" },
  { name: "Bayer Leverkusen", league: "Bundesliga" },
  { name: "Inter Milan", league: "Serie A" },
  { name: "Inter Miami", league: "MLS" },
  { name: "LAFC", league: "MLS" },
];

export const CATALOG_PLAYERS: CatalogPlayer[] = PLAYERS_RAW.map((p) => ({
  ...p,
  slug: entitySlug(p.name),
}));

export const CATALOG_TEAMS: CatalogTeam[] = TEAMS_RAW.map((t) => ({
  ...t,
  slug: entitySlug(t.name),
}));

export function findCatalogPlayer(slugOrName: string): CatalogPlayer | null {
  const key = entitySlug(slugOrName);
  return (
    CATALOG_PLAYERS.find((p) => p.slug === key) ??
    CATALOG_PLAYERS.find((p) => entitySlug(p.name) === key) ??
    null
  );
}

export function findCatalogTeam(slugOrName: string): CatalogTeam | null {
  const key = entitySlug(slugOrName);
  return (
    CATALOG_TEAMS.find((t) => t.slug === key) ??
    CATALOG_TEAMS.find((t) => entitySlug(t.name) === key) ??
    null
  );
}

/** Resolve any free-text name into a display entity. */
export function resolvePlayer(slugOrName: string): {
  slug: string;
  name: string;
  team: string | null;
  role: string | null;
} {
  const found = findCatalogPlayer(slugOrName);
  if (found) {
    return {
      slug: found.slug,
      name: found.name,
      team: found.team,
      role: found.role,
    };
  }
  const name = decodeURIComponent(slugOrName).replace(/-/g, " ");
  const pretty = name.replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    slug: entitySlug(pretty),
    name: pretty,
    team: null,
    role: null,
  };
}

export function resolveTeam(slugOrName: string): {
  slug: string;
  name: string;
  league: string | null;
} {
  const found = findCatalogTeam(slugOrName);
  if (found) {
    return { slug: found.slug, name: found.name, league: found.league };
  }
  const name = decodeURIComponent(slugOrName).replace(/-/g, " ");
  const pretty = name.replace(/\b\w/g, (c) => c.toUpperCase());
  return { slug: entitySlug(pretty), name: pretty, league: null };
}
