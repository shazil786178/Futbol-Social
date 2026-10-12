"use server";

import { revalidatePath } from "next/cache";
import { applyTouch, loadPitchBoard, type Shirt, type KickOutcome } from "@/lib/games/the-pitch";
import { recordDailyActivity } from "@/lib/streaks/daily";
import { createClient } from "@/lib/supabase/server";

export async function pickShirt(side: Shirt): Promise<{ ok: boolean; error?: string }> {
  if (side !== "mint" && side !== "gold") return { ok: false, error: "Pick a shirt." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to pick a shirt." };

  const { error } = await supabase.from("pitch_shirts").upsert(
    { user_id: user.id, side },
    { onConflict: "user_id" },
  );
  if (error) {
    return {
      ok: false,
      error: error.message.toLowerCase().includes("pitch_shirts")
        ? "Run supabase/migrations/018_the_pitch.sql in the SQL editor."
        : error.message,
    };
  }
  revalidatePath("/pitch");
  revalidatePath("/");
  return { ok: true };
}

export async function takeTouch(
  side: Shirt,
  angle: number,
  power: number,
): Promise<KickOutcome> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const empty = await loadPitchBoard(supabase, user?.id ?? null);
  if (!user) {
    return { board: empty, path: [], result: "roll", error: "Sign in to take the touch." };
  }
  if (!Number.isFinite(angle) || !Number.isFinite(power)) {
    return { board: empty, path: [], result: "roll", error: "Bad swipe." };
  }

  const out = await applyTouch(
    supabase,
    user.id,
    side,
    angle,
    Math.min(1, Math.max(0.08, power)),
  );
  if (!out.error) {
    void recordDailyActivity(supabase, user.id, "game");
    revalidatePath("/pitch");
    revalidatePath("/");
  }
  return out;
}
