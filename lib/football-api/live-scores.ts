import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompetitionId } from "@/lib/brand";
import {
  ESPN_SCORE_SLUGS,
  fetchEspnRangeChunked,
  mapEspnEvent,
} from "./espn";
import type { SyncedMatchRow } from "./types";

const STOP_WORDS = new Set([
  "fc",
  "cf",
  "afc",
  "sc",
  "ac",
  "as",
  "ss",
  "sv",
  "vfb",
  "vfl",
  "tsg",
  "club",
  "de",
  "del",
  "la",
  "the",
  "and",
  "calcio",
  "football",
  "futbol",
  "hotspur",
  "1899",
  "1900",
  "1901",
  "1904",
  "1909",
  "1910",
]);

const ALIASES: Record<string, string> = {
  munchen: "munich",
  munchengladbach: "gladbach",
  internazionale: "inter",
  milano: "milan",
  utd: "united",
  man: "manchester",
  wolves: "wolverhampton",
  spurs: "tottenham",
  psg: "paris",
  koln: "cologne",
  bayer: "leverkusen",
};

function teamTokens(name: string): Set<string> {
  const cleaned = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ");

  const tokens = new Set<string>();
  for (const raw of cleaned.split(/\s+/)) {
    if (!raw || STOP_WORDS.has(raw)) continue;
    tokens.add(ALIASES[raw] ?? raw);
  }
  return tokens;
}

export function similarity(a: string, b: string): number {
  const ta = teamTokens(a);
  const tb = teamTokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) {
    if (tb.has(t)) {
      shared += 1;
      continue;
    }
    // "Barcelona" vs "Barça", "Leverkusen" vs "Bayer 04 Leverkusen" prefixes
    for (const u of tb) {
      if (t.length >= 4 && u.length >= 4 && (t.startsWith(u) || u.startsWith(t))) {
        shared += 0.8;
        break;
      }
    }
  }
  return shared / Math.min(ta.size, tb.size);
}

type ScoreCandidate = Pick<
  SyncedMatchRow,
  "home_team" | "away_team" | "kickoff_at" | "status" | "home_score" | "away_score" | "minute"
>;

/** Find the ESPN fixture that is the same real-world match as `row`. */
export function findSameFixture<T extends ScoreCandidate>(
  row: Pick<SyncedMatchRow, "home_team" | "away_team" | "kickoff_at">,
  candidates: T[],
): T | null {
  const kickoff = new Date(row.kickoff_at).getTime();
  let best: T | null = null;
  let bestScore = 0;

  for (const c of candidates) {
    const gapHours =
      Math.abs(new Date(c.kickoff_at).getTime() - kickoff) / 3_600_000;
    if (gapHours > 3) continue;

    const home = similarity(row.home_team, c.home_team);
    const away = similarity(row.away_team, c.away_team);
    if (home < 0.5 || away < 0.5 || home + away < 1.5) continue;

    const score = home + away - gapHours * 0.1;
    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }
  return best;
}

/**
 * ESPN is real-time; football-data's free tier lags and often returns null
 * scores mid-match. Take ESPN's live state/score whenever it has one.
 */
export function overlayScores(
  row: SyncedMatchRow,
  espn: ScoreCandidate | null,
): SyncedMatchRow {
  if (!espn || espn.status === "upcoming") return row;

  const hasEspnScore = espn.home_score != null && espn.away_score != null;
  const rowHasScore = row.home_score != null && row.away_score != null;

  if (espn.status === "live") {
    return {
      ...row,
      status: "live",
      home_score: hasEspnScore ? espn.home_score : row.home_score,
      away_score: hasEspnScore ? espn.away_score : row.away_score,
      minute: espn.minute ?? row.minute,
    };
  }

  // ESPN says finished
  return {
    ...row,
    status: "finished",
    home_score: rowHasScore && row.status === "finished" ? row.home_score : espn.home_score,
    away_score: rowHasScore && row.status === "finished" ? row.away_score : espn.away_score,
    minute: null,
  };
}

export async function fetchEspnRows(
  competitionId: CompetitionId,
  from: Date,
  to: Date,
): Promise<SyncedMatchRow[]> {
  const stamped = new Date().toISOString();
  const slugs = ESPN_SCORE_SLUGS[competitionId] ?? [];
  const batches = await Promise.all(
    slugs.map(async (slug) => {
      const events = await fetchEspnRangeChunked(slug, from, to);
      return events
        .map((e) => mapEspnEvent(competitionId, e, stamped))
        .filter((r): r is SyncedMatchRow => r != null);
    }),
  );
  return batches.flat();
}

type DbMatchRow = {
  id: string;
  competition_id: string;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  status: SyncedMatchRow["status"];
  home_score: number | null;
  away_score: number | null;
  minute: number | null;
};

/**
 * Finished games that never got a score (feed gap, or they slid out of the
 * sync window before full time). Look each one up on ESPN and patch it.
 */
export async function backfillMissingScores(
  supabase: SupabaseClient,
): Promise<number> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("matches")
    .select(
      "id, competition_id, home_team, away_team, kickoff_at, status, home_score, away_score, minute",
    )
    .eq("status", "finished")
    .is("home_score", null)
    .gte("kickoff_at", since)
    .lt("kickoff_at", new Date().toISOString())
    .limit(500);

  if (error || !data?.length) return 0;
  const rows = data as DbMatchRow[];

  const byComp = new Map<string, DbMatchRow[]>();
  for (const r of rows) {
    byComp.set(r.competition_id, [...(byComp.get(r.competition_id) ?? []), r]);
  }

  let fixed = 0;
  for (const [comp, compRows] of byComp) {
    if (!ESPN_SCORE_SLUGS[comp as CompetitionId]) continue;
    const oldest = Math.min(...compRows.map((r) => new Date(r.kickoff_at).getTime()));
    const espn = await fetchEspnRows(
      comp as CompetitionId,
      new Date(oldest - 86_400_000),
      new Date(),
    );

    for (const row of compRows) {
      const twin = findSameFixture(row, espn);
      if (!twin || twin.status !== "finished") continue;
      if (twin.home_score == null || twin.away_score == null) continue;
      const { error: updateError } = await supabase
        .from("matches")
        .update({
          home_score: twin.home_score,
          away_score: twin.away_score,
          minute: null,
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (!updateError) fixed += 1;
    }
  }
  return fixed;
}

export type LiveRefreshResult = {
  checked: number;
  updated: number;
  updatedIds: string[];
};

/**
 * Cheap refresh for games around right now: pulls ESPN scoreboards for
 * yesterday→tomorrow and patches any in-window match whose state changed.
 */
export async function refreshLiveScores(
  supabase: SupabaseClient,
): Promise<LiveRefreshResult> {
  const now = Date.now();
  const windowStart = new Date(now - 5 * 3_600_000).toISOString();
  const windowEnd = new Date(now + 30 * 60_000).toISOString();

  const { data, error } = await supabase
    .from("matches")
    .select(
      "id, competition_id, home_team, away_team, kickoff_at, status, home_score, away_score, minute",
    )
    .gte("kickoff_at", windowStart)
    .lte("kickoff_at", windowEnd);

  if (error || !data?.length) {
    return { checked: 0, updated: 0, updatedIds: [] };
  }

  const rows = data as DbMatchRow[];
  const needsCheck = rows.filter(
    (r) =>
      r.status !== "finished" || r.home_score == null || r.away_score == null,
  );
  if (needsCheck.length === 0) {
    return { checked: 0, updated: 0, updatedIds: [] };
  }

  const comps = [...new Set(needsCheck.map((r) => r.competition_id))] as CompetitionId[];
  const from = new Date(now - 24 * 3_600_000);
  const to = new Date(now + 24 * 3_600_000);
  const espnByComp = new Map<string, SyncedMatchRow[]>();
  await Promise.all(
    comps.map(async (c) => {
      espnByComp.set(c, await fetchEspnRows(c, from, to));
    }),
  );

  const stamped = new Date().toISOString();
  const updatedIds: string[] = [];

  for (const row of needsCheck) {
    const espn = findSameFixture(row, espnByComp.get(row.competition_id) ?? []);
    if (!espn) continue;

    const next = overlayScores(
      { ...row, competition_id: row.competition_id as CompetitionId, external_id: "", venue: null, last_synced_at: stamped },
      espn,
    );

    const changed =
      next.status !== row.status ||
      next.home_score !== row.home_score ||
      next.away_score !== row.away_score ||
      next.minute !== row.minute;
    if (!changed) continue;

    const { error: updateError } = await supabase
      .from("matches")
      .update({
        status: next.status,
        home_score: next.home_score,
        away_score: next.away_score,
        minute: next.minute,
        last_synced_at: stamped,
      })
      .eq("id", row.id);

    if (!updateError) updatedIds.push(row.id);
  }

  return { checked: needsCheck.length, updated: updatedIds.length, updatedIds };
}
