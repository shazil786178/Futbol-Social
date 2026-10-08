import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loadFantasyData,
  normalizePicks,
  scoreSquad,
  type FantasySquadRow,
  type PlayerScore,
} from "./scoring";

export type RankedSquad = {
  userId: string;
  username: string;
  teamName: string;
  total: number;
};

export type MySquad = FantasySquadRow & {
  total: number;
  perPlayer: Map<string, PlayerScore>;
  rank: number | null;
};

/** Leaderboard + the viewer's squad, scored from stored UCL results. */
export async function loadFantasyBoard(
  supabase: SupabaseClient,
  userId: string | null,
): Promise<{ ready: boolean; board: RankedSquad[]; mine: MySquad | null }> {
  const { data, error } = await supabase
    .from("fantasy_squads")
    .select("user_id, team_name, picks, captain, banked_points, updated_at")
    .order("updated_at", { ascending: false })
    .limit(300);

  if (error) return { ready: false, board: [], mine: null };

  const squads: FantasySquadRow[] = (data ?? []).map((r) => ({
    ...r,
    picks: normalizePicks(r.picks),
  }));
  if (squads.length === 0) return { ready: true, board: [], mine: null };

  const since = squads
    .flatMap((s) => s.picks.map((p) => p.added_at))
    .reduce((min, t) => (t < min ? t : min), new Date().toISOString());
  const fantasyData = await loadFantasyData(supabase, since);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username")
    .in(
      "id",
      squads.map((s) => s.user_id),
    );
  const names = new Map((profiles ?? []).map((p) => [p.id, p.username as string]));

  let mine: MySquad | null = null;
  const board = squads
    .map((s) => {
      const scored = scoreSquad(s, fantasyData);
      if (s.user_id === userId) {
        mine = { ...s, total: scored.total, perPlayer: scored.perPlayer, rank: null };
      }
      return {
        userId: s.user_id,
        username: names.get(s.user_id) ?? "fan",
        teamName: s.team_name,
        total: scored.total,
      };
    })
    .sort((a, b) => b.total - a.total);

  if (mine) {
    (mine as MySquad).rank = board.findIndex((b) => b.userId === userId) + 1;
  }

  return { ready: true, board, mine };
}
