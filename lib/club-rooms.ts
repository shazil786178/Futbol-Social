import type { CompetitionId } from "@/lib/brand";

export type ClubRoom = {
  slug: string;
  name: string;
  leagueId: CompetitionId;
  leagueLabel: string;
};

export const CLUB_ROOM_SECTIONS = [
  {
    title: "La Liga",
    leagueId: "laliga" as const,
    clubs: [
      { slug: "real-madrid", name: "Real Madrid" },
      { slug: "barcelona", name: "Barcelona" },
      { slug: "atletico-madrid", name: "Atlético Madrid" },
      { slug: "sevilla", name: "Sevilla" },
      { slug: "villarreal", name: "Villarreal" },
      { slug: "real-sociedad", name: "Real Sociedad" },
    ],
  },
  {
    title: "Bundesliga",
    leagueId: "bundesliga" as const,
    clubs: [
      { slug: "bayern-munich", name: "Bayern Munich" },
      { slug: "borussia-dortmund", name: "Borussia Dortmund" },
      { slug: "rb-leipzig", name: "RB Leipzig" },
      { slug: "bayer-leverkusen", name: "Bayer Leverkusen" },
      { slug: "eintracht-frankfurt", name: "Eintracht Frankfurt" },
      { slug: "vfb-stuttgart", name: "VfB Stuttgart" },
    ],
  },
  {
    title: "Champions League",
    leagueId: "ucl" as const,
    clubs: [
      { slug: "inter-milan", name: "Inter Milan" },
      { slug: "napoli", name: "Napoli" },
      { slug: "benfica", name: "Benfica" },
      { slug: "psg", name: "Paris Saint-Germain" },
      { slug: "ajax", name: "Ajax" },
      { slug: "porto", name: "Porto" },
    ],
  },
] as const;

const LEAGUE_LABELS: Record<CompetitionId, string> = {
  laliga: "La Liga",
  bundesliga: "Bundesliga",
  ucl: "Champions League",
  epl: "Premier League",
  mls: "MLS",
  friendlies: "Friendlies",
};

export const CLUB_ROOMS: ClubRoom[] = CLUB_ROOM_SECTIONS.flatMap((section) =>
  section.clubs.map((club) => ({
    slug: club.slug,
    name: club.name,
    leagueId: section.leagueId,
    leagueLabel: section.title,
  })),
);

export type ClubRoomSlug = (typeof CLUB_ROOMS)[number]["slug"];

export function getClubRoom(slug: string): ClubRoom | undefined {
  return CLUB_ROOMS.find((r) => r.slug === slug);
}

export function leagueBadgeClass(leagueId: CompetitionId): string {
  switch (leagueId) {
    case "laliga":
      return "bg-red-500/15 text-red-300 ring-red-500/30";
    case "bundesliga":
      return "bg-red-600/15 text-red-200 ring-red-600/30";
    case "ucl":
      return "bg-blue-500/15 text-blue-300 ring-blue-500/30";
    case "mls":
      return "bg-sky-500/15 text-sky-300 ring-sky-500/30";
    case "friendlies":
      return "bg-amber-500/15 text-amber-300 ring-amber-500/30";
    default:
      return "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30";
  }
}

export function leagueShort(leagueId: CompetitionId): string {
  switch (leagueId) {
    case "laliga":
      return "LL";
    case "bundesliga":
      return "BL";
    case "ucl":
      return "UCL";
    case "mls":
      return "MLS";
    case "friendlies":
      return "FRI";
    case "epl":
      return "PL";
    default: {
      const _exhaustive: never = leagueId;
      return String(_exhaustive);
    }
  }
}
