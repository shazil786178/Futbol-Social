import type { SupabaseClient } from "@supabase/supabase-js";

/** Award Oracle Badge to top 1% by oracle accuracy_score after season scoring. */
export async function awardOracleBadgesByAccuracy(
  supabase: SupabaseClient,
  seasonLabel: string,
) {
  const { data: season } = await supabase
    .from("oracle_season_results")
    .select("badges_awarded")
    .eq("season_label", seasonLabel)
    .maybeSingle();

  if (season?.badges_awarded) {
    return { awarded: 0, skipped: "already_awarded" as const };
  }

  const { data: oracleUsers, error } = await supabase
    .from("oracle_predictions")
    .select("user_id, accuracy_score")
    .not("accuracy_score", "is", null)
    .order("accuracy_score", { ascending: false });

  if (error || !oracleUsers?.length) {
    return { awarded: 0, skipped: "no_scored_picks" as const };
  }

  const eligible = oracleUsers.filter((r) => (r.accuracy_score ?? 0) > 0);
  const topCount = Math.max(1, Math.ceil(eligible.length * 0.01));
  const winners = eligible.slice(0, topCount);

  for (const winner of winners) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("oracle_badge")
      .eq("id", winner.user_id)
      .maybeSingle();

    if (profile?.oracle_badge) continue;

    await supabase
      .from("profiles")
      .update({ oracle_badge: true })
      .eq("id", winner.user_id);

    await supabase.from("notifications").insert({
      user_id: winner.user_id,
      title: "Oracle Badge earned",
      body: `Top 1% Oracle accuracy for ${seasonLabel} — permanent badge unlocked.`,
    });
  }

  await supabase
    .from("oracle_season_results")
    .update({ badges_awarded: true })
    .eq("season_label", seasonLabel);

  return { awarded: winners.length };
}
