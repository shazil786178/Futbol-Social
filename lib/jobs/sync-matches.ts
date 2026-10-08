import { COMPETITIONS, type CompetitionId } from "@/lib/brand";
import { runFanBotChatter } from "@/lib/bots/fan-bots";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { fetchEspnNews } from "@/lib/football-api/espn";
import {
  backfillMissingScores,
  refreshLiveScores,
} from "@/lib/football-api/live-scores";
import { syncScoreBatHighlights } from "@/lib/football-api/sync-highlights";
import {
  applyKickoffHeuristics,
  fetchAllCompetitionMatches,
  hasFootballDataApi,
} from "@/lib/football-api/sync";
import { syncAllLiveIncidents } from "@/lib/features/incidents";
import { notifyFollowersOfMatchUpdates } from "@/lib/features/follows";
import { closeOpenTribunalsForMatch } from "@/lib/features/tribunals";
import { processOracleSeason } from "@/lib/iq/oracle-score";
import { processFinishedMatches } from "@/lib/iq/process-match";
import { syncUclGoalEvents } from "@/lib/fantasy/sync-goals";

export type SyncJobResult = {
  ok: boolean;
  apiUsed: boolean;
  matchesUpserted: number;
  statusesUpdated: number;
  liveUpdated?: number;
  scoresBackfilled?: number;
  fantasyGoalsStored?: number;
  tribunalsOpened: number;
  newsUpserted: number;
  highlightsUpserted: number;
  followNotifications: number;
  bots?: {
    botsReady: number;
    chatPosted: number;
    roomPosted: number;
    feedPosted: number;
    predictionsPosted: number;
  };
  iqProcessed: { matchId: string; usersScored: number }[];
  oracle?: {
    scored: number;
    badgesAwarded: number;
    skipped?: string;
    seasonLabel?: string;
  };
  message?: string;
  byCompetition?: Record<string, number>;
};

export type SyncJobMode = "full" | "live";

export async function runSyncJob(
  mode: SyncJobMode = "full",
): Promise<SyncJobResult> {
  if (!hasAdminClient()) {
    return {
      ok: false,
      apiUsed: false,
      matchesUpserted: 0,
      statusesUpdated: 0,
      tribunalsOpened: 0,
      newsUpserted: 0,
      highlightsUpserted: 0,
      followNotifications: 0,
      iqProcessed: [],
      message: "Set SUPABASE_SERVICE_ROLE_KEY in .env.local",
    };
  }

  const supabase = createAdminClient();
  let matchesUpserted = 0;
  let statusesUpdated = 0;
  let newsUpserted = 0;
  let followNotifications = 0;
  const byCompetition: Record<string, number> = {};

  const { error: compsError } = await supabase.from("competitions").upsert(
    COMPETITIONS.active.map((c) => ({ id: c.id, name: c.name })),
    { onConflict: "id" },
  );
  if (compsError) {
    throw new Error(`Competition upsert failed: ${compsError.message}`);
  }

  const seedIds = [
    "epl-ars-liv",
    "epl-mci-che",
    "laliga-rm-bar",
    "laliga-atm-sev",
    "bund-bay-dor",
    "bund-lei-rbl",
    "ucl-rma-mci",
    "ucl-bay-int",
  ];
  await supabase.from("matches").delete().in("id", seedIds);

  const scoreBefore = new Map<
    string,
    { home: number | null; away: number | null; status?: string }
  >();

  const { data: beforeRows } = await supabase
    .from("matches")
    .select("id, home_score, away_score, status");
  for (const row of beforeRows ?? []) {
    scoreBefore.set(row.id, {
      home: row.home_score,
      away: row.away_score,
      status: row.status,
    });
  }

  let liveUpdated = 0;
  if (mode === "live") {
    const live = await refreshLiveScores(supabase);
    liveUpdated = live.updated;
  }

  const rows = mode === "full" ? await fetchAllCompetitionMatches() : [];

  if (rows.length > 0) {
    for (const row of rows) {
      byCompetition[row.competition_id] =
        (byCompetition[row.competition_id] ?? 0) + 1;
    }

    const payload = rows.map((row) => ({
      id: row.id,
      competition_id: row.competition_id,
      external_id: row.external_id,
      home_team: row.home_team,
      away_team: row.away_team,
      kickoff_at: row.kickoff_at,
      status: row.status,
      home_score: row.home_score,
      away_score: row.away_score,
      venue: row.venue,
      minute: row.minute,
      last_synced_at: row.last_synced_at,
    }));

    let { error } = await supabase
      .from("matches")
      .upsert(payload, { onConflict: "id" });

    // If migration 011 isn't applied yet, retry without minute
    if (error?.message?.toLowerCase().includes("minute")) {
      const withoutMinute = payload.map(({ minute: _m, ...rest }) => rest);
      ({ error } = await supabase
        .from("matches")
        .upsert(withoutMinute, { onConflict: "id" }));
    }

    if (error) {
      throw new Error(`Match upsert failed: ${error.message}`);
    }

    matchesUpserted = rows.length;

    for (const row of rows) {
      const prev = scoreBefore.get(row.id);
      const goalScored =
        prev &&
        row.home_score != null &&
        row.away_score != null &&
        (row.home_score > (prev.home ?? 0) ||
          row.away_score > (prev.away ?? 0));

      if (goalScored) {
        await closeOpenTribunalsForMatch(supabase, row.id);
      }
    }

    followNotifications = await notifyFollowersOfMatchUpdates(
      supabase,
      rows.map((r) => ({
        id: r.id,
        home_team: r.home_team,
        away_team: r.away_team,
        status: r.status,
        home_score: r.home_score,
        away_score: r.away_score,
      })),
      scoreBefore,
    );
  }

  // Only rows that could still need a status change (keeps us under the 1000-row cap)
  const { data: existing, error: loadError } = await supabase
    .from("matches")
    .select("id, kickoff_at, status, home_score, away_score")
    .neq("status", "finished")
    .lt("kickoff_at", new Date().toISOString())
    .limit(1000);

  if (loadError) {
    throw new Error(`Match load failed: ${loadError.message}`);
  }

  for (const match of existing ?? []) {
    const nextStatus = applyKickoffHeuristics({
      kickoff_at: match.kickoff_at,
      status: match.status,
      home_score: match.home_score,
      away_score: match.away_score,
    });

    if (nextStatus !== match.status) {
      // Leave scores null when unknown — a fake 0–0 would also score IQ predictions
      await supabase
        .from("matches")
        .update({ status: nextStatus, minute: null })
        .eq("id", match.id);
      statusesUpdated += 1;
    }
  }

  let scoresBackfilled = 0;
  if (mode === "full") {
    try {
      scoresBackfilled = await backfillMissingScores(supabase);
    } catch (err) {
      console.error("Score backfill skipped:", err);
    }
  }

  // Football news for discussion threads
  if (mode === "full") {
    try {
      const news = await fetchEspnNews();
      if (news.length > 0) {
        const { error: newsError, count } = await supabase
          .from("news_articles")
          .upsert(
            news.map((n) => ({
              external_id: n.external_id,
              title: n.title,
              // Short teaser only — never store full article body or publisher photos
              summary: n.summary
                ? n.summary.slice(0, 220) + (n.summary.length > 220 ? "…" : "")
                : null,
              source_name: n.source_name,
              source_url: n.source_url,
              image_url: null,
              body: null,
              league_hint: n.league_hint,
              published_at: n.published_at,
            })),
            { onConflict: "external_id", count: "exact" },
          );
        if (!newsError) {
          newsUpserted = count ?? news.length;
        }
      }
    } catch (err) {
      console.error("News sync skipped:", err);
    }
  }

  const tribunalsOpened = hasFootballDataApi()
    ? await syncAllLiveIncidents(supabase)
    : 0;

  let highlightsUpserted = 0;
  if (mode === "full") {
    try {
      const hl = await syncScoreBatHighlights(supabase);
      highlightsUpserted = hl.highlightsUpserted;
    } catch (err) {
      console.error("ScoreBat highlights sync skipped:", err);
    }
  }

  const iqProcessed = await processFinishedMatches(supabase);

  let fantasyGoalsStored = 0;
  try {
    fantasyGoalsStored = await syncUclGoalEvents(supabase);
  } catch (err) {
    console.error("UCL goal events sync skipped:", err);
  }

  const oracle =
    mode === "full" && hasFootballDataApi()
      ? await processOracleSeason(supabase)
      : { scored: 0, badgesAwarded: 0, skipped: "live_pulse" as const };

  let bots: SyncJobResult["bots"];
  try {
    bots = await runFanBotChatter(supabase);
  } catch (err) {
    console.error("Fan bot chatter skipped:", err);
  }

  return {
    ok: true,
    apiUsed: hasFootballDataApi() || matchesUpserted > 0,
    matchesUpserted,
    statusesUpdated,
    tribunalsOpened,
    newsUpserted,
    highlightsUpserted,
    followNotifications,
    bots,
    iqProcessed,
    byCompetition,
    oracle: {
      scored: oracle.scored,
      badgesAwarded: oracle.badgesAwarded ?? 0,
      skipped: "skipped" in oracle ? oracle.skipped : undefined,
      seasonLabel: "seasonLabel" in oracle ? oracle.seasonLabel : undefined,
    },
    liveUpdated,
    scoresBackfilled,
    fantasyGoalsStored,
    message:
      mode === "full" && matchesUpserted === 0
        ? "No fixtures returned. Check FOOTBALL_DATA_API_KEY and network access to ESPN."
        : undefined,
  };
}

export function competitionName(id: CompetitionId) {
  return COMPETITIONS.active.find((c) => c.id === id)?.name ?? id;
}
