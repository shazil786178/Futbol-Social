"use server";

import { revalidatePath } from "next/cache";
import { validateSquad } from "@/lib/fantasy/players";
import {
  loadFantasyData,
  normalizePicks,
  scoreSquad,
} from "@/lib/fantasy/scoring";
import { createClient } from "@/lib/supabase/server";

export type FantasyActionState = { error?: string; success?: string };

export async function saveFantasySquad(
  _prev: FantasyActionState,
  formData: FormData,
): Promise<FantasyActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to build a squad." };

  let slugs: string[] = [];
  try {
    const parsed = JSON.parse(formData.get("picks")?.toString() ?? "[]");
    if (Array.isArray(parsed)) slugs = parsed.filter((s) => typeof s === "string");
  } catch {
    return { error: "Squad data was malformed — try again." };
  }
  const captain = formData.get("captain")?.toString() || null;
  const teamName =
    formData.get("team_name")?.toString().trim().slice(0, 32) || "My XI";

  const check = validateSquad(slugs, captain);
  if (!check.ok) return { error: check.error };

  const { data: existing, error: loadError } = await supabase
    .from("fantasy_squads")
    .select("picks, captain, banked_points, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (loadError) {
    return {
      error: loadError.message.includes("fantasy_squads")
        ? "Fantasy isn't set up yet — run migration 015 in Supabase."
        : loadError.message,
    };
  }

  // Bank what the old XI earned; the new XI scores from now on
  let banked = 0;
  if (existing) {
    const picks = normalizePicks(existing.picks);
    const since = picks.reduce(
      (min, p) => (p.added_at < min ? p.added_at : min),
      new Date().toISOString(),
    );
    const data = await loadFantasyData(supabase, since);
    banked = scoreSquad(
      { picks, captain: existing.captain, banked_points: existing.banked_points },
      data,
    ).total;
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("fantasy_squads").upsert(
    {
      user_id: user.id,
      team_name: teamName,
      picks: slugs.map((slug) => ({ slug, added_at: now })),
      captain,
      banked_points: banked,
    },
    { onConflict: "user_id" },
  );
  if (error) return { error: error.message };

  revalidatePath("/fantasy");
  revalidatePath("/");
  return {
    success: existing
      ? `Saved. ${banked} pts banked — your new XI scores from the next kick-off.`
      : "Squad locked in. Points start at the next Champions League kick-off.",
  };
}
