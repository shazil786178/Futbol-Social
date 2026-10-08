import type { SupabaseClient } from "@supabase/supabase-js";
import { awardOracleBadgesByAccuracy } from "./oracle-badge";

const BASE_URL = "https://api.football-data.org/v4";

type OraclePrediction = {
  user_id: string;
  ucl_winner: string;
  top_scorer: string;
  dark_horse: string | null;
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b(fc|cf|ac|sc|afc|bfc)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function namesMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  return na.includes(nb) || nb.includes(na);
}

function scorePrediction(
  pick: OraclePrediction,
  uclWinner: string,
  topScorer: string,
): number {
  let score = 0;
  if (namesMatch(pick.ucl_winner, uclWinner)) score += 50;
  if (namesMatch(pick.top_scorer, topScorer)) score += 40;
  if (
    pick.dark_horse &&
    (namesMatch(pick.dark_horse, uclWinner) ||
      namesMatch(pick.dark_horse, topScorer))
  ) {
    score += 20;
  }
  return score;
}

async function fetchUclSeasonResults(): Promise<{
  seasonLabel: string;
  uclWinner: string | null;
  topScorer: string | null;
  seasonComplete: boolean;
} | null> {
  const token = process.env.FOOTBALL_DATA_API_KEY;
  if (!token) return null;

  const [compRes, scorersRes] = await Promise.all([
    fetch(`${BASE_URL}/competitions/CL`, {
      headers: { "X-Auth-Token": token },
      next: { revalidate: 0 },
    }),
    fetch(`${BASE_URL}/competitions/CL/scorers?limit=5`, {
      headers: { "X-Auth-Token": token },
      next: { revalidate: 0 },
    }),
  ]);

  if (!compRes.ok) return null;

  const comp = (await compRes.json()) as {
    currentSeason?: { id?: number; winner?: { name?: string } | null };
  };

  const seasonLabel = String(comp.currentSeason?.id ?? new Date().getFullYear());
  const uclWinner = comp.currentSeason?.winner?.name ?? null;
  const seasonComplete = Boolean(uclWinner);

  let topScorer: string | null = null;
  if (scorersRes.ok) {
    const scorersJson = (await scorersRes.json()) as {
      scorers?: { player?: { name?: string } }[];
    };
    topScorer = scorersJson.scorers?.[0]?.player?.name ?? null;
  }

  return { seasonLabel, uclWinner, topScorer, seasonComplete };
}

export async function processOracleSeason(supabase: SupabaseClient) {
  const apiResults = await fetchUclSeasonResults();
  if (!apiResults?.seasonComplete || !apiResults.uclWinner) {
    return { scored: 0, badgesAwarded: 0, skipped: "season_not_complete" as const };
  }

  const { seasonLabel, uclWinner, topScorer } = apiResults;
  const topScorerName = topScorer ?? "";

  const { data: existingSeason } = await supabase
    .from("oracle_season_results")
    .select("id, badges_awarded, scored_at")
    .eq("season_label", seasonLabel)
    .maybeSingle();

  if (existingSeason?.scored_at && existingSeason.badges_awarded) {
    return { scored: 0, badgesAwarded: 0, skipped: "already_processed" as const };
  }

  const { data: predictions, error } = await supabase
    .from("oracle_predictions")
    .select("user_id, ucl_winner, top_scorer, dark_horse");

  if (error || !predictions?.length) {
    return { scored: 0, badgesAwarded: 0, skipped: "no_predictions" as const };
  }

  let scored = 0;
  for (const pick of predictions as OraclePrediction[]) {
    const accuracy = scorePrediction(pick, uclWinner, topScorerName);
    await supabase
      .from("oracle_predictions")
      .update({ accuracy_score: accuracy })
      .eq("user_id", pick.user_id);
    scored += 1;
  }

  await supabase.from("oracle_season_results").upsert(
    {
      season_label: seasonLabel,
      ucl_winner: uclWinner,
      top_scorer: topScorerName || null,
      scored_at: new Date().toISOString(),
      badges_awarded: false,
    },
    { onConflict: "season_label" },
  );

  const badgeResult = await awardOracleBadgesByAccuracy(supabase, seasonLabel);

  return {
    scored,
    badgesAwarded: badgeResult.awarded,
    seasonLabel,
    uclWinner,
    topScorer: topScorerName,
  };
}
