import { createClient } from "@/lib/supabase/server";

export type RivalPair = {
  id: string;
  matchId: string;
  userAId: string;
  userBId: string;
  teamA: string;
  teamB: string;
  userAName: string;
  userBName: string;
  winnerUserId: string | null;
};

export type Tribunal = {
  id: string;
  matchId: string;
  question: string;
  incidentType: string;
  status: string;
  yesCount: number;
  noCount: number;
};

export type VerdictStats = {
  matchId: string;
  count: number;
  avgMatch: number;
  avgReferee: number;
  avgHome: number;
  avgAway: number;
};

export type OraclePick = {
  username: string;
  uclWinner: string;
  topScorer: string;
  darkHorse: string | null;
  accuracyScore: number | null;
};

export type RoomPost = {
  id: string;
  username: string;
  content: string;
  createdAt: string;
};

async function namesFor(ids: string[]) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", [...new Set(ids)]);
  return new Map((data ?? []).map((r) => [r.id, r.username]));
}

export async function getRivalPair(
  matchId: string,
  userId: string,
): Promise<RivalPair | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("rival_pairs")
    .select("*")
    .eq("match_id", matchId)
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .maybeSingle();

  if (!data) return null;

  const names = await namesFor([data.user_a_id, data.user_b_id]);
  return {
    id: data.id,
    matchId: data.match_id,
    userAId: data.user_a_id,
    userBId: data.user_b_id,
    teamA: data.team_a,
    teamB: data.team_b,
    userAName: names.get(data.user_a_id) ?? "fan_a",
    userBName: names.get(data.user_b_id) ?? "fan_b",
    winnerUserId: data.winner_user_id,
  };
}

export async function getOpenTribunal(matchId: string): Promise<Tribunal | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tribunals")
    .select("*")
    .eq("match_id", matchId)
    .eq("status", "open")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    matchId: data.match_id,
    question: data.question,
    incidentType: data.incident_type,
    status: data.status,
    yesCount: data.yes_count,
    noCount: data.no_count,
  };
}

export async function getVerdictStats(matchId?: string): Promise<VerdictStats[]> {
  const supabase = await createClient();
  let query = supabase.from("structured_verdicts").select("*");
  if (matchId) query = query.eq("match_id", matchId);

  const { data, error } = await query;
  if (error || !data?.length) return [];

  const byMatch = new Map<string, typeof data>();
  for (const row of data) {
    const list = byMatch.get(row.match_id) ?? [];
    list.push(row);
    byMatch.set(row.match_id, list);
  }

  return [...byMatch.entries()].map(([id, rows]) => {
    const n = rows.length;
    const sum = rows.reduce(
      (acc, r) => ({
        match: acc.match + r.match_rating,
        ref: acc.ref + r.referee_rating,
        home: acc.home + r.home_team_rating,
        away: acc.away + r.away_team_rating,
      }),
      { match: 0, ref: 0, home: 0, away: 0 },
    );
    return {
      matchId: id,
      count: n,
      avgMatch: Math.round((sum.match / n) * 10) / 10,
      avgReferee: Math.round((sum.ref / n) * 10) / 10,
      avgHome: Math.round((sum.home / n) * 10) / 10,
      avgAway: Math.round((sum.away / n) * 10) / 10,
    };
  });
}

export async function getOraclePicks(): Promise<OraclePick[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("oracle_predictions")
    .select("ucl_winner, top_scorer, dark_horse, user_id, accuracy_score")
    .order("accuracy_score", { ascending: false, nullsFirst: false })
    .limit(50);

  if (error || !data) return [];

  const names = await namesFor(data.map((r) => r.user_id));
  return data.map((row) => ({
    username: names.get(row.user_id) ?? "fan",
    uclWinner: row.ucl_winner,
    topScorer: row.top_scorer,
    darkHorse: row.dark_horse,
    accuracyScore: row.accuracy_score,
  }));
}

export async function getUserOracle(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("oracle_predictions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function getRoomPosts(slug: string): Promise<RoomPost[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("country_room_posts")
    .select("id, content, created_at, user_id")
    .eq("room_slug", slug)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error || !data) return [];

  const names = await namesFor(data.map((r) => r.user_id));
  return data.map((row) => ({
    id: row.id,
    username: names.get(row.user_id) ?? "fan",
    content: row.content,
    createdAt: row.created_at,
  }));
}

export async function getSideBySideForRival(
  matchId: string,
  userAId: string,
  userBId: string,
) {
  const supabase = await createClient();
  const [{ data: preds }, { data: posts }] = await Promise.all([
    supabase
      .from("predictions")
      .select("user_id, home_score, away_score")
      .eq("match_id", matchId)
      .in("user_id", [userAId, userBId]),
    supabase
      .from("posts")
      .select("user_id, type, content, created_at")
      .eq("match_id", matchId)
      .in("user_id", [userAId, userBId])
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return { predictions: preds ?? [], posts: posts ?? [] };
}
