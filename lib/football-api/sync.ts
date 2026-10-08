import type { CompetitionId } from "@/lib/brand";
import { fetchEspnCompetitionMatches } from "./espn";
import { fetchEspnRows, findSameFixture, overlayScores } from "./live-scores";
import {
  ALL_SYNC_COMPETITION_IDS,
  buildMatchId,
  FOOTBALL_DATA_CODES,
  mapApiStatus,
  syncDateWindow,
  type FootballDataResponse,
  type SyncedMatchRow,
} from "./types";

export type { SyncedMatchRow };

const BASE_URL = "https://api.football-data.org/v4";

export function hasFootballDataApi() {
  return Boolean(process.env.FOOTBALL_DATA_API_KEY);
}

function resolvedSyncLeagues(): CompetitionId[] {
  const envLeagues = process.env.SYNC_LEAGUES?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!envLeagues?.length) {
    return [...ALL_SYNC_COMPETITION_IDS];
  }

  return envLeagues.filter((id): id is CompetitionId =>
    ALL_SYNC_COMPETITION_IDS.includes(id as CompetitionId),
  );
}

async function fetchFootballDataCompetition(
  competitionId: CompetitionId,
): Promise<SyncedMatchRow[]> {
  const token = process.env.FOOTBALL_DATA_API_KEY;
  const code = FOOTBALL_DATA_CODES[competitionId];
  if (!token || !code) return [];

  const { dateFrom, dateTo } = syncDateWindow();
  const url = `${BASE_URL}/competitions/${code}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;

  const res = await fetch(url, {
    headers: { "X-Auth-Token": token },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    console.error(`Football API ${code} failed:`, res.status, await res.text());
    return [];
  }

  const json = (await res.json()) as FootballDataResponse;
  const now = new Date().toISOString();

  return (json.matches ?? []).map((match) => {
    const status = mapApiStatus(match.status);
    const homeScore =
      match.score.fullTime.home ??
      (status === "live" ? (match.score.halfTime?.home ?? null) : null);
    const awayScore =
      match.score.fullTime.away ??
      (status === "live" ? (match.score.halfTime?.away ?? null) : null);

    return {
      id: buildMatchId(competitionId, match.id),
      competition_id: competitionId,
      external_id: String(match.id),
      home_team: match.homeTeam.name,
      away_team: match.awayTeam.name,
      kickoff_at: match.utcDate,
      status,
      home_score: homeScore,
      away_score: awayScore,
      venue: match.venue,
      minute:
        status === "live" && match.minute != null
          ? match.minute
          : status === "live"
            ? estimateLiveMinute(match.utcDate)
            : null,
      last_synced_at: now,
    };
  });
}

function estimateLiveMinute(kickoffAt: string): number | null {
  const mins = Math.floor((Date.now() - new Date(kickoffAt).getTime()) / 60000);
  if (mins < 0) return null;
  if (mins <= 45) return mins;
  if (mins <= 60) return 45;
  return Math.min(90, 45 + (mins - 60));
}

/**
 * Big leagues: football-data.org fixtures with ESPN's real-time scores laid
 * on top. If football-data returns nothing (no key / rate limit), ESPN alone.
 */
async function fetchBigLeague(
  competitionId: CompetitionId,
): Promise<SyncedMatchRow[]> {
  const now = Date.now();
  const fromFootballData = await fetchFootballDataCompetition(competitionId);

  if (fromFootballData.length === 0) {
    return fetchEspnRows(
      competitionId,
      new Date(now - 14 * 86_400_000),
      new Date(now + 45 * 86_400_000),
    );
  }

  const espn = await fetchEspnRows(
    competitionId,
    new Date(now - 4 * 86_400_000),
    new Date(now + 86_400_000),
  );
  if (espn.length === 0) return fromFootballData;

  return fromFootballData.map((row) =>
    overlayScores(row, findSameFixture(row, espn)),
  );
}

export async function fetchAllCompetitionMatches(): Promise<SyncedMatchRow[]> {
  const ids = resolvedSyncLeagues();
  const bigLeagueIds = ids.filter((id) => FOOTBALL_DATA_CODES[id]);
  const espnIds = ids.filter((id) => id === "mls" || id === "friendlies");

  const [fromBigLeagues, fromEspn] = await Promise.all([
    Promise.all(bigLeagueIds.map((id) => fetchBigLeague(id))).then((batches) =>
      batches.flat(),
    ),
    fetchEspnCompetitionMatches(espnIds),
  ]);

  return [...fromBigLeagues, ...fromEspn];
}

/**
 * Light status reconciliation only — prefer the API status.
 * Never invent "live" before kickoff; only auto-finish very late unfinished games.
 */
export function applyKickoffHeuristics(
  row: Pick<
    SyncedMatchRow,
    "kickoff_at" | "status" | "home_score" | "away_score"
  >,
): "upcoming" | "live" | "finished" {
  const kickoff = new Date(row.kickoff_at).getTime();
  const now = Date.now();
  const minutesSinceKickoff = (now - kickoff) / 60000;

  if (minutesSinceKickoff < 0) return "upcoming";
  if (row.status === "finished") return "finished";
  // A "live" row nobody has updated for 4h is a stale feed, not extra time
  if (row.status === "live") return minutesSinceKickoff >= 240 ? "finished" : "live";

  // API still says upcoming but kickoff was > 3h ago — treat as finished
  if (minutesSinceKickoff >= 180) return "finished";

  return row.status;
}
