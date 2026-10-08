"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { findCatalogPlayer } from "@/lib/entities/catalog";
import { createClient } from "@/lib/supabase/server";

export type WelcomeState = { error?: string };

const clip = (v: FormDataEntryValue | null, max = 80) =>
  v?.toString().trim().slice(0, max) || null;

export async function completeOnboarding(
  _prev: WelcomeState,
  formData: FormData,
): Promise<WelcomeState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date().toISOString();

  if (formData.get("skip") === "1") {
    await supabase.from("profiles").update({ onboarded_at: now }).eq("id", user.id);
    redirect("/");
  }

  const team = clip(formData.get("team"));
  if (!team) return { error: "Pick your club first." };
  const player = clip(formData.get("player"));

  const { error } = await supabase
    .from("profiles")
    .update({
      supported_team: team,
      favorite_player: player,
      favorite_league: clip(formData.get("league"), 40),
      watch_style: clip(formData.get("watch"), 40),
      fan_since: clip(formData.get("since"), 40),
      onboarded_at: now,
    })
    .eq("id", user.id);

  if (error) {
    // Migration 015 not applied yet — keep the part that already works
    const { error: basicError } = await supabase
      .from("profiles")
      .update({ supported_team: team })
      .eq("id", user.id);
    if (basicError) return { error: basicError.message };
  }

  await supabase
    .from("followed_teams")
    .upsert({ user_id: user.id, team_name: team }, { onConflict: "user_id,team_name" });
  if (player) {
    await supabase.from("followed_players").upsert(
      {
        user_id: user.id,
        player_name: player,
        team_name: findCatalogPlayer(player)?.team ?? null,
      },
      { onConflict: "user_id,player_name" },
    );
  }

  revalidatePath("/");
  redirect("/");
}
