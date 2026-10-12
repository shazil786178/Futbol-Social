"use server";

import { revalidatePath } from "next/cache";
import {
  ATTEMPTS_PER_DAY,
  MAX_ATTEMPT_SCORE,
  TOP_BINS_GAME,
  utcDayKey,
  type AttemptLog,
} from "@/lib/games/top-bins";
import { recordDailyActivity } from "@/lib/streaks/daily";
import { createClient } from "@/lib/supabase/server";

const RESULTS = new Set(["topbins", "corner", "goal", "post", "saved", "wall", "wide", "over"]);

export async function submitTopBins(
  attempts: AttemptLog[],
): Promise<{ ok: boolean; rank?: number; players?: number; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to get on the board." };

  if (!Array.isArray(attempts) || attempts.length === 0 || attempts.length > ATTEMPTS_PER_DAY) {
    return { ok: false, error: "Bad round." };
  }
  const clean: AttemptLog[] = attempts.map((a) => ({
    result: RESULTS.has(a.result) ? a.result : "wide",
    points: Math.max(0, Math.min(MAX_ATTEMPT_SCORE, Math.round(Number(a.points) || 0))),
    speed: Math.max(0, Math.min(45, Math.round((Number(a.speed) || 0) * 10) / 10)),
  }));
  const score = clean.reduce((s, a) => s + a.points, 0);
  const dayKey = utcDayKey();

  // One round per day — the first finished round stands.
  const { data: existing } = await supabase
    .from("game_scores")
    .select("id, score")
    .eq("game", TOP_BINS_GAME)
    .eq("day_key", dayKey)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase.from("game_scores").insert({
      game: TOP_BINS_GAME,
      day_key: dayKey,
      user_id: user.id,
      score,
      detail: { attempts: clean },
    });
    if (error) {
      return {
        ok: false,
        error: /game_scores|schema cache/i.test(error.message)
          ? "Run supabase/migrations/017 to enable the leaderboard."
          : error.message,
      };
    }
  }

  void recordDailyActivity(supabase, user.id, "game");

  const finalScore = existing?.score ?? score;
  const [{ count: better }, { count: players }] = await Promise.all([
    supabase
      .from("game_scores")
      .select("id", { count: "exact", head: true })
      .eq("game", TOP_BINS_GAME)
      .eq("day_key", dayKey)
      .gt("score", finalScore),
    supabase
      .from("game_scores")
      .select("id", { count: "exact", head: true })
      .eq("game", TOP_BINS_GAME)
      .eq("day_key", dayKey),
  ]);

  revalidatePath("/topbins");
  revalidatePath("/");
  return { ok: true, rank: (better ?? 0) + 1, players: players ?? 1 };
}
