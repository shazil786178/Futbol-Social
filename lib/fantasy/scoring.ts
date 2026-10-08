import type { SupabaseClient } from "@supabase/supabase-js";
import { similarity } from "@/lib/football-api/live-scores";
import { fantasyPlayer, type FantasyPlayer } from "./players";

export type FantasyPick = { slug: string; added_at: string };

export type FantasySquadRow = {
  user_id: string;
  team_name: string;
  picks: FantasyPick[];
  captain: string | null;
  banked_points: number;
  updated_at: string;
};

export type UclResult = {
  id: string;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  status: "live" | "finished";
  home_score: number;
  away_score: number;
};

export type GoalEvent = {
  match_id: string;
  event_type: string;
  team_side: "home" | "away" | null;
  player_name: string | null;
};

export type FantasyData = {
  results: UclResult[];
  goals: GoalEvent[];
};

export type PlayerScore = {
  points: number;
  matches: number;
  goals: number;
  live: boolean;
};

function normName(s: string): string[] {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** "Alisson" ≈ "Alisson Becker", but "Gabriel Jesus" ≠ "Gabriel Magalhães". */
function samePlayer(a: string, b: string): boolean {
  const ta = normName(a);
  const tb = normName(b);
  if (!ta.length || !tb.length) return false;
  if (ta.join(" ") === tb.join(" ")) return true;
  if (ta.length > 1 && tb.length > 1) return ta[ta.length - 1] === tb[tb.length - 1];
  const single = ta.length === 1 ? ta[0] : tb[0];
  const other = ta.length === 1 ? tb : ta;
  return other.includes(single);
}

function clubSide(club: string, match: UclResult): "home" | "away" | null {
  const home = similarity(club, match.home_team);
  const away = similarity(club, match.away_team);
  if (home < 0.6 && away < 0.6) return null;
  return home >= away ? "home" : "away";
}

function pointsInMatch(
  player: FantasyPlayer,
  match: UclResult,
  goals: GoalEvent[],
): { points: number; goals: number } | null {
  const side = clubSide(player.club, match);
  if (!side) return null;

  const scored = side === "home" ? match.home_score : match.away_score;
  const conceded = side === "home" ? match.away_score : match.home_score;
  const defensive = player.position === "GK" || player.position === "DEF";

  let points = 2;
  if (match.status === "finished" && scored > conceded) points += 1;

  const goalCount = goals.filter(
    (g) =>
      g.match_id === match.id &&
      g.event_type !== "own_goal" &&
      (g.team_side == null || g.team_side === side) &&
      g.player_name &&
      samePlayer(g.player_name, player.name),
  ).length;
  const perGoal = player.position === "FWD" ? 4 : player.position === "MID" ? 5 : 6;
  points += goalCount * perGoal;

  if (match.status === "finished" && conceded === 0) {
    if (defensive) points += 4;
    else if (player.position === "MID") points += 1;
  }
  if (defensive) points -= Math.floor(conceded / 2);

  return { points, goals: goalCount };
}

export function scoreSquad(
  squad: Pick<FantasySquadRow, "picks" | "captain" | "banked_points">,
  data: FantasyData,
): { total: number; live: number; perPlayer: Map<string, PlayerScore> } {
  const perPlayer = new Map<string, PlayerScore>();
  let fresh = 0;

  for (const pick of squad.picks) {
    const player = fantasyPlayer(pick.slug);
    if (!player) continue;
    const since = new Date(pick.added_at).getTime();
    const score: PlayerScore = { points: 0, matches: 0, goals: 0, live: false };

    for (const match of data.results) {
      if (new Date(match.kickoff_at).getTime() < since) continue;
      const got = pointsInMatch(player, match, data.goals);
      if (!got) continue;
      score.points += got.points;
      score.goals += got.goals;
      score.matches += 1;
      if (match.status === "live") score.live = true;
    }

    if (squad.captain === pick.slug) score.points *= 2;
    perPlayer.set(pick.slug, score);
    fresh += score.points;
  }

  return { total: squad.banked_points + fresh, live: fresh, perPlayer };
}

export async function loadFantasyData(
  supabase: SupabaseClient,
  since: string,
): Promise<FantasyData> {
  const { data: rows } = await supabase
    .from("matches")
    .select("id, home_team, away_team, kickoff_at, status, home_score, away_score")
    .eq("competition_id", "ucl")
    .in("status", ["live", "finished"])
    .gte("kickoff_at", since)
    .not("home_score", "is", null)
    .not("away_score", "is", null)
    .order("kickoff_at", { ascending: true })
    .limit(500);

  const results = (rows ?? []) as UclResult[];
  if (results.length === 0) return { results, goals: [] };

  const { data: goals } = await supabase
    .from("match_events")
    .select("match_id, event_type, team_side, player_name")
    .in(
      "match_id",
      results.map((r) => r.id),
    )
    .in("event_type", ["goal", "penalty", "own_goal"]);

  return { results, goals: (goals ?? []) as GoalEvent[] };
}

export function normalizePicks(raw: unknown): FantasyPick[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (p): p is FantasyPick =>
        typeof p === "object" &&
        p != null &&
        typeof (p as FantasyPick).slug === "string" &&
        typeof (p as FantasyPick).added_at === "string",
    )
    .map((p) => ({ slug: p.slug, added_at: p.added_at }));
}
