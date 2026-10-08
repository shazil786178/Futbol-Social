import type { SupabaseClient } from "@supabase/supabase-js";

type FinishedMatch = {
  id: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
};

export async function processRivalWinners(
  supabase: SupabaseClient,
  match: FinishedMatch,
) {
  if (match.home_score == null || match.away_score == null) return 0;

  const { data: pairs, error } = await supabase
    .from("rival_pairs")
    .select("id, user_a_id, user_b_id, team_a, team_b, winner_user_id")
    .eq("match_id", match.id)
    .is("winner_user_id", null);

  if (error || !pairs?.length) return 0;

  let winningTeam: string | null = null;
  if (match.home_score > match.away_score) winningTeam = match.home_team;
  else if (match.away_score > match.home_score) winningTeam = match.away_team;
  else return 0;

  let resolved = 0;

  for (const pair of pairs) {
    let winnerId: string | null = null;
    if (pair.team_a === winningTeam) winnerId = pair.user_a_id;
    else if (pair.team_b === winningTeam) winnerId = pair.user_b_id;

    if (!winnerId) continue;

    await supabase
      .from("rival_pairs")
      .update({ winner_user_id: winnerId })
      .eq("id", pair.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("football_iq")
      .eq("id", winnerId)
      .maybeSingle();

    await supabase
      .from("profiles")
      .update({ football_iq: (profile?.football_iq ?? 100) + 15 })
      .eq("id", winnerId);

    await supabase.from("football_iq_events").insert({
      user_id: winnerId,
      match_id: match.id,
      delta: 15,
      reason: "Rival Mode win",
    }).then(({ error: eventError }) => {
      if (eventError && eventError.code !== "23505") {
        console.error("Rival IQ event error:", eventError.message);
      }
    });

    await supabase.from("notifications").insert({
      user_id: winnerId,
      title: "Rival Mode win",
      body: `+15 Futbol IQ — your team won the rivalry (${match.home_team} vs ${match.away_team})`,
    });

    resolved += 1;
  }

  return resolved;
}
