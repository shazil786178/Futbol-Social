"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FollowState = { error?: string; success?: string };

export async function followTeam(
  _prev: FollowState,
  formData: FormData,
): Promise<FollowState> {
  const teamName = formData.get("teamName")?.toString().trim();
  if (!teamName) return { error: "Pick a team." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to follow teams." };

  const { error } = await supabase.from("followed_teams").insert({
    user_id: user.id,
    team_name: teamName,
  });

  if (error) {
    if (error.code === "23505") return { success: "Already following." };
    if (error.code === "42P01") {
      return { error: "Run supabase/migrations/010_follows_and_news.sql" };
    }
    return { error: error.message };
  }

  revalidatePath("/follow");
  return { success: `Following ${teamName}.` };
}

export async function unfollowTeam(
  _prev: FollowState,
  formData: FormData,
): Promise<FollowState> {
  const id = formData.get("id")?.toString();
  if (!id) return { error: "Missing follow." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required." };

  const { error } = await supabase
    .from("followed_teams")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/follow");
  return { success: "Unfollowed." };
}

export async function followPlayer(
  _prev: FollowState,
  formData: FormData,
): Promise<FollowState> {
  const playerName = formData.get("playerName")?.toString().trim();
  const teamName = formData.get("teamName")?.toString().trim() || null;
  if (!playerName) return { error: "Enter a player name." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to follow players." };

  const { error } = await supabase.from("followed_players").insert({
    user_id: user.id,
    player_name: playerName,
    team_name: teamName,
  });

  if (error) {
    if (error.code === "23505") return { success: "Already following." };
    if (error.code === "42P01") {
      return { error: "Run supabase/migrations/010_follows_and_news.sql" };
    }
    return { error: error.message };
  }

  revalidatePath("/follow");
  return { success: `Following ${playerName}.` };
}

export async function unfollowPlayer(
  _prev: FollowState,
  formData: FormData,
): Promise<FollowState> {
  const id = formData.get("id")?.toString();
  if (!id) return { error: "Missing follow." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required." };

  const { error } = await supabase
    .from("followed_players")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/follow");
  return { success: "Unfollowed." };
}
