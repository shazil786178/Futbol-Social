import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchEspnRows, findSameFixture } from "@/lib/football-api/live-scores";
import { fetchMatchGameData } from "@/lib/football-api/match-detail";

const MAX_PER_RUN = 12;

/**
 * Store Champions League goal scorers in match_events so fantasy points can
 * credit the right player. Live games refresh every run; finished games once.
 */
export async function syncUclGoalEvents(supabase: SupabaseClient): Promise<number> {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data: matches } = await supabase
    .from("matches")
    .select("id, external_id, home_team, away_team, kickoff_at, status, home_score, away_score")
    .eq("competition_id", "ucl")
    .in("status", ["live", "finished"])
    .gte("kickoff_at", since)
    .order("kickoff_at", { ascending: false })
    .limit(60);

  if (!matches?.length) return 0;

  const { data: existing } = await supabase
    .from("match_events")
    .select("match_id")
    .in(
      "match_id",
      matches.map((m) => m.id),
    );
  const hasEvents = new Set((existing ?? []).map((e) => e.match_id));

  const todo = matches
    .filter((m) => {
      const goalsInGame = (m.home_score ?? 0) + (m.away_score ?? 0);
      if (m.status === "live") return true;
      return goalsInGame > 0 && !hasEvents.has(m.id);
    })
    .slice(0, MAX_PER_RUN);
  if (todo.length === 0) return 0;

  // football-data ids need their ESPN twin for the summary (scorers) endpoint
  const needEspn = todo.some((m) => !String(m.external_id ?? "").startsWith("espn-"));
  const espnRows = needEspn
    ? await fetchEspnRows(
        "ucl",
        new Date(Date.now() - 8 * 86_400_000),
        new Date(Date.now() + 86_400_000),
      )
    : [];

  let stored = 0;
  for (const m of todo) {
    const externalId = String(m.external_id ?? "").startsWith("espn-")
      ? String(m.external_id)
      : findSameFixture(m, espnRows)?.external_id ?? m.external_id;

    const game = await fetchMatchGameData({
      externalId,
      competitionId: "ucl",
      homeTeam: m.home_team,
      awayTeam: m.away_team,
      kickoffAt: m.kickoff_at,
    });

    const goals = game.events.filter((e) =>
      ["goal", "penalty", "own_goal"].includes(e.type),
    );
    if (goals.length === 0) continue;

    const { error } = await supabase.from("match_events").upsert(
      goals.map((g) => ({
        match_id: m.id,
        external_event_id: g.id,
        event_type: g.type,
        minute: g.minute,
        team_side: g.teamSide,
        player_name: g.playerName,
        detail: g.detail,
      })),
      { onConflict: "match_id,external_event_id" },
    );
    if (!error) stored += goals.length;
  }

  return stored;
}
