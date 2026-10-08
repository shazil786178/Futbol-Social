import type { SupabaseClient } from "@supabase/supabase-js";
import { processRivalWinners } from "./process-rival";
import { scorePrediction } from "./score-prediction";

type FinishedMatch = {
  id: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  iq_processed: boolean;
};

export async function processFinishedMatches(supabase: SupabaseClient) {
  const { data: matches, error } = await supabase
    .from("matches")
    .select(
      "id, home_team, away_team, home_score, away_score, status, iq_processed",
    )
    .eq("status", "finished")
    .eq("iq_processed", false);

  if (error) {
    throw new Error(`Failed to load finished matches: ${error.message}`);
  }

  const results: { matchId: string; usersScored: number }[] = [];

  for (const match of (matches ?? []) as FinishedMatch[]) {
    const scored = await processOneMatch(supabase, match);
    results.push({ matchId: match.id, usersScored: scored });
  }

  return results;
}

async function processOneMatch(
  supabase: SupabaseClient,
  match: FinishedMatch,
): Promise<number> {
  if (match.home_score == null || match.away_score == null) {
    return 0;
  }

  const { data: predictions, error } = await supabase
    .from("predictions")
    .select("user_id, home_score, away_score")
    .eq("match_id", match.id);

  if (error) {
    throw new Error(`Predictions load failed for ${match.id}: ${error.message}`);
  }

  let scored = 0;

  for (const prediction of predictions ?? []) {
    const { delta, reason } = scorePrediction(
      {
        homeScore: prediction.home_score,
        awayScore: prediction.away_score,
      },
      { homeScore: match.home_score, awayScore: match.away_score },
    );

    const { error: eventError } = await supabase.from("football_iq_events").upsert(
      {
        user_id: prediction.user_id,
        match_id: match.id,
        delta,
        reason,
      },
      { onConflict: "user_id,match_id" },
    );

    if (eventError) {
      console.error("IQ event error:", eventError.message);
      continue;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("football_iq")
      .eq("id", prediction.user_id)
      .maybeSingle();

    const nextIq = (profile?.football_iq ?? 100) + delta;

    await supabase
      .from("profiles")
      .update({ football_iq: nextIq })
      .eq("id", prediction.user_id);

    const sign = delta >= 0 ? "+" : "";
    await supabase.from("notifications").insert({
      user_id: prediction.user_id,
      title: "Prediction scored",
      body: `${sign}${delta} Futbol IQ — ${reason} (${match.home_team} vs ${match.away_team})`,
    });

    scored += 1;
  }

  await processRivalWinners(supabase, match);

  await supabase
    .from("matches")
    .update({ iq_processed: true })
    .eq("id", match.id);

  return scored;
}

export async function processMatchById(
  supabase: SupabaseClient,
  matchId: string,
) {
  const { data: match, error } = await supabase
    .from("matches")
    .select(
      "id, home_team, away_team, home_score, away_score, status, iq_processed",
    )
    .eq("id", matchId)
    .maybeSingle();

  if (error || !match) {
    throw new Error(error?.message ?? "Match not found");
  }

  if (match.status !== "finished") {
    return { matchId, usersScored: 0, skipped: "not_finished" as const };
  }

  if (match.iq_processed) {
    return { matchId, usersScored: 0, skipped: "already_processed" as const };
  }

  const usersScored = await processOneMatch(supabase, match as FinishedMatch);
  return { matchId, usersScored };
}
