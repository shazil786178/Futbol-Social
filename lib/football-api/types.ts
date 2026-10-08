import type { CompetitionId } from "@/lib/brand";

/** football-data.org league codes (free tier). MLS is paid — use ESPN for MLS/friendlies. */
export const FOOTBALL_DATA_CODES: Partial<Record<CompetitionId, string>> = {
  epl: "PL",
  laliga: "PD",
  bundesliga: "BL1",
  ucl: "CL",
};

export const ALL_SYNC_COMPETITION_IDS: CompetitionId[] = [
  "epl",
  "laliga",
  "bundesliga",
  "ucl",
  "mls",
  "friendlies",
];

export type ApiMatchStatus =
  | "SCHEDULED"
  | "TIMED"
  | "IN_PLAY"
  | "PAUSED"
  | "HALFTIME"
  | "FINISHED"
  | "SUSPENDED"
  | "POSTPONED"
  | "CANCELLED"
  | "AWARDED";

export type FootballDataMatch = {
  id: number;
  utcDate: string;
  status: ApiMatchStatus;
  minute?: number | null;
  venue: string | null;
  homeTeam: { name: string; shortName?: string };
  awayTeam: { name: string; shortName?: string };
  score: {
    fullTime: { home: number | null; away: number | null };
    halfTime?: { home: number | null; away: number | null };
  };
};

export type FootballDataResponse = {
  matches?: FootballDataMatch[];
};

export function mapApiStatus(
  status: ApiMatchStatus,
): "upcoming" | "live" | "finished" {
  switch (status) {
    case "IN_PLAY":
    case "PAUSED":
    case "HALFTIME":
    case "SUSPENDED":
      return "live";
    case "FINISHED":
    case "AWARDED":
      return "finished";
    default:
      return "upcoming";
  }
}

export function buildMatchId(competitionId: CompetitionId, externalId: number) {
  return `${competitionId}-${externalId}`;
}

export function syncDateWindow(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const from = new Date(now);
  from.setUTCDate(from.getUTCDate() - 30);
  const to = new Date(now);
  to.setUTCDate(to.getUTCDate() + 45);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { dateFrom: fmt(from), dateTo: fmt(to) };
}

export type SyncedMatchRow = {
  id: string;
  competition_id: CompetitionId;
  external_id: string;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  status: "upcoming" | "live" | "finished";
  home_score: number | null;
  away_score: number | null;
  venue: string | null;
  minute: number | null;
  last_synced_at: string;
};
