"use server";

import { revalidatePath } from "next/cache";
import { utcDayKey } from "@/lib/games/top-bins";
import { recordDailyActivity } from "@/lib/streaks/daily";
import { createClient } from "@/lib/supabase/server";

const GAMES = new Set(["rogue", "zero", "pets"]);

/** Best score today. Missing table or a signed-out player just skips the board. */
export async function submitArcadeBest(game: string, score: number) {
  if (!GAMES.has(game)) return { ok: false };
  const clean = Math.max(0, Math.min(9999, Math.round(score)));
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false };

    const dayKey = utcDayKey();
    const { data: existing } = await supabase
      .from("game_scores")
      .select("id, score")
      .eq("game", game)
      .eq("day_key", dayKey)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) {
      await supabase.from("game_scores").insert({
        game,
        day_key: dayKey,
        user_id: user.id,
        score: clean,
        detail: {},
      });
    } else if ((existing.score ?? 0) < clean) {
      await supabase.from("game_scores").update({ score: clean }).eq("id", existing.id);
    }

    void recordDailyActivity(supabase, user.id, "game");
    revalidatePath("/games");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
