"use server";

import { recordDailyActivity, type DailyMissionId } from "@/lib/streaks/daily";
import { createClient } from "@/lib/supabase/server";

export async function completeDailyMission(mission: DailyMissionId) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const };

  const state = await recordDailyActivity(supabase, user.id, mission);
  return { ok: Boolean(state), streak: state?.streakCount ?? 0 };
}
