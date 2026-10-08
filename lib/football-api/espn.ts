import type { CompetitionId } from "@/lib/brand";
import type { SyncedMatchRow } from "./types";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";

type EspnCompetitor = {
  homeAway: "home" | "away";
  score?: string;
  team?: { displayName?: string };
};

type EspnEvent = {
  id: string;
  date: string;
  status?: {
    displayClock?: string;
    period?: number;
    type?: {
      name?: string;
      state?: "pre" | "in" | "post";
      completed?: boolean;
      shortDetail?: string;
    };
  };
  competitions?: {
    venue?: { fullName?: string };
    competitors?: EspnCompetitor[];
    status?: {
      displayClock?: string;
      period?: number;
      type?: {
        state?: "pre" | "in" | "post";
        completed?: boolean;
      };
    };
  }[];
};

type EspnScoreboard = {
  events?: EspnEvent[];
};

type EspnArticle = {
  headline?: string;
  description?: string;
  published?: string;
  links?: { web?: { href?: string } };
  images?: { url?: string }[];
};

/** MLS full season window + club/intl friendlies across leagues. */
const ESPN_LEAGUES: {
  competitionId: CompetitionId;
  slug: string;
  daysBack: number;
  daysForward: number;
}[] = [
  { competitionId: "mls", slug: "usa.1", daysBack: 45, daysForward: 90 },
  // International friendlies (national teams)
  { competitionId: "friendlies", slug: "fifa.friendly", daysBack: 90, daysForward: 120 },
  // Club friendlies / preseason tours (all clubs — PL, La Liga, etc.)
  { competitionId: "friendlies", slug: "club.friendly", daysBack: 60, daysForward: 45 },
];

/** News feeds for the leagues we cover. */
export const ESPN_NEWS_SLUGS = [
  { slug: "eng.1", leagueHint: "epl" },
  { slug: "esp.1", leagueHint: "laliga" },
  { slug: "ger.1", leagueHint: "bundesliga" },
  { slug: "uefa.champions", leagueHint: "ucl" },
  { slug: "usa.1", leagueHint: "mls" },
] as const;

function formatEspnDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function mapEspnStatus(
  state?: string,
  completed?: boolean,
): SyncedMatchRow["status"] {
  if (completed || state === "post") return "finished";
  if (state === "in") return "live";
  return "upcoming";
}

function scoreOrNull(raw?: string): number | null {
  if (raw == null || raw === "") return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

/** ESPN scoreboard slugs for every competition we show. */
export const ESPN_SCORE_SLUGS: Record<CompetitionId, string[]> = {
  epl: ["eng.1"],
  laliga: ["esp.1"],
  bundesliga: ["ger.1"],
  ucl: ["uefa.champions"],
  mls: ["usa.1"],
  friendlies: ["fifa.friendly", "club.friendly"],
};

async function fetchScoreboard(slug: string, dates: string): Promise<EspnEvent[]> {
  const url = `${ESPN_BASE}/${slug}/scoreboard?dates=${dates}&limit=1000`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      console.error(`ESPN ${slug} ${dates} failed:`, res.status);
      return [];
    }
    const json = (await res.json()) as EspnScoreboard;
    return json.events ?? [];
  } catch (err) {
    console.error(`ESPN ${slug} fetch error:`, err);
    return [];
  }
}

/**
 * ESPN rejects `dates=YYYYMMDD-YYYYMMDD` ranges (HTTP 400), but accepts a
 * single day (YYYYMMDD) or a whole month (YYYYMM). Short windows go day by
 * day; longer ones fetch whole months and trim to the window.
 */
export async function fetchEspnRangeChunked(
  slug: string,
  dateFrom: Date,
  dateTo: Date,
): Promise<EspnEvent[]> {
  const spanDays = (dateTo.getTime() - dateFrom.getTime()) / 86_400_000;
  const keys: string[] = [];

  if (spanDays <= 4) {
    const cursor = new Date(dateFrom);
    cursor.setUTCHours(0, 0, 0, 0);
    while (cursor <= dateTo) {
      keys.push(formatEspnDate(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  } else {
    const cursor = new Date(
      Date.UTC(dateFrom.getUTCFullYear(), dateFrom.getUTCMonth(), 1),
    );
    while (cursor <= dateTo) {
      keys.push(formatEspnDate(cursor).slice(0, 6));
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
  }

  const batches = await Promise.all(keys.map((k) => fetchScoreboard(slug, k)));
  const from = dateFrom.getTime();
  const to = dateTo.getTime();
  const seen = new Set<string>();
  const events: EspnEvent[] = [];
  for (const e of batches.flat()) {
    if (seen.has(e.id)) continue;
    const t = new Date(e.date.endsWith("Z") ? e.date : `${e.date}Z`).getTime();
    if (keys[0].length === 6 && (t < from || t > to)) continue;
    seen.add(e.id);
    events.push(e);
  }
  return events;
}

function parseClockMinute(clock?: string): number | null {
  if (!clock) return null;
  const m = clock.match(/(\d+)/);
  return m ? Number.parseInt(m[1], 10) : null;
}

export function mapEspnEvent(
  competitionId: CompetitionId,
  event: EspnEvent,
  now: string,
): SyncedMatchRow | null {
  const competition = event.competitions?.[0];
  const competitors = competition?.competitors ?? [];
  const home = competitors.find((c) => c.homeAway === "home");
  const away = competitors.find((c) => c.homeAway === "away");

  if (!home?.team?.displayName || !away?.team?.displayName || !event.date) {
    return null;
  }

  const status = mapEspnStatus(
    competition?.status?.type?.state ?? event.status?.type?.state,
    competition?.status?.type?.completed ?? event.status?.type?.completed,
  );

  const homeScore = scoreOrNull(home.score);
  const awayScore = scoreOrNull(away.score);
  const kickoff = event.date.endsWith("Z") ? event.date : `${event.date}Z`;
  const clock =
    competition?.status?.displayClock ?? event.status?.displayClock;
  const minute =
    status === "live"
      ? parseClockMinute(clock) ?? estimateFromKickoff(kickoff)
      : null;

  return {
    id: `${competitionId}-espn-${event.id}`,
    competition_id: competitionId,
    external_id: `espn-${event.id}`,
    home_team: home.team.displayName,
    away_team: away.team.displayName,
    kickoff_at: kickoff,
    status,
    home_score: status === "upcoming" ? null : homeScore,
    away_score: status === "upcoming" ? null : awayScore,
    venue: competition?.venue?.fullName ?? null,
    minute,
    last_synced_at: now,
  };
}

function estimateFromKickoff(kickoffAt: string): number | null {
  const mins = Math.floor((Date.now() - new Date(kickoffAt).getTime()) / 60000);
  if (mins < 0) return null;
  if (mins <= 45) return mins;
  if (mins <= 60) return 45;
  return Math.min(90, 45 + (mins - 60));
}

/** MLS + international/club friendlies (covers clubs from every league). */
export async function fetchEspnCompetitionMatches(
  competitionIds: CompetitionId[],
): Promise<SyncedMatchRow[]> {
  const wanted = new Set(competitionIds);
  const leagues = ESPN_LEAGUES.filter((l) => wanted.has(l.competitionId));
  if (leagues.length === 0) return [];

  const stamped = new Date().toISOString();
  const batches = await Promise.all(
    leagues.map(async ({ competitionId, slug, daysBack, daysForward }) => {
      const from = new Date();
      from.setUTCDate(from.getUTCDate() - daysBack);
      const to = new Date();
      to.setUTCDate(to.getUTCDate() + daysForward);

      const events = await fetchEspnRangeChunked(slug, from, to);
      return events
        .map((event) => mapEspnEvent(competitionId, event, stamped))
        .filter((row): row is SyncedMatchRow => row != null);
    }),
  );

  const byExternal = new Map<string, SyncedMatchRow>();
  for (const row of batches.flat()) {
    byExternal.set(row.external_id, row);
  }
  return [...byExternal.values()];
}

export type SyncedNewsArticle = {
  external_id: string;
  title: string;
  summary: string | null;
  source_name: string;
  source_url: string | null;
  image_url: string | null;
  league_hint: string | null;
  published_at: string;
};

export async function fetchEspnNews(): Promise<SyncedNewsArticle[]> {
  const articles: SyncedNewsArticle[] = [];

  for (const { slug, leagueHint } of ESPN_NEWS_SLUGS) {
    try {
      const res = await fetch(`${ESPN_BASE}/${slug}/news`, {
        headers: { Accept: "application/json" },
        next: { revalidate: 0 },
      });
      if (!res.ok) continue;
      const json = (await res.json()) as { articles?: EspnArticle[] };
      for (const article of json.articles ?? []) {
        if (!article.headline) continue;
        const externalId = `espn-${slug}-${article.headline.slice(0, 80)}-${article.published ?? ""}`;
        articles.push({
          external_id: externalId,
          title: article.headline,
          summary: article.description ?? null,
          source_name: "ESPN",
          source_url: article.links?.web?.href ?? null,
          image_url: article.images?.[0]?.url ?? null,
          league_hint: leagueHint,
          published_at: article.published ?? new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(`ESPN news ${slug} failed:`, err);
    }
  }

  const byId = new Map(articles.map((a) => [a.external_id, a]));
  return [...byId.values()];
}
