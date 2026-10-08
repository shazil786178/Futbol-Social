"use server";

import { revalidatePath } from "next/cache";
import { resolveMatchStatus } from "@/lib/matches/format";
import { createClient } from "@/lib/supabase/server";

export type ActionState = {
  error?: string;
  success?: string;
};

export async function submitPrediction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const matchId = formData.get("matchId")?.toString();
  const homeRaw = formData.get("homeScore")?.toString();
  const awayRaw = formData.get("awayScore")?.toString();

  if (!matchId || homeRaw == null || awayRaw == null) {
    return { error: "Pick a score for both teams." };
  }

  const homeScore = Number.parseInt(homeRaw, 10);
  const awayScore = Number.parseInt(awayRaw, 10);

  if (
    Number.isNaN(homeScore) ||
    Number.isNaN(awayScore) ||
    homeScore < 0 ||
    awayScore < 0 ||
    homeScore > 20 ||
    awayScore > 20
  ) {
    return { error: "Scores must be whole numbers between 0 and 20." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sign in to lock in a prediction." };
  }

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("status, kickoff_at")
    .eq("id", matchId)
    .maybeSingle();

  if (matchError?.code === "42P01") {
    // Table missing — allow seed-only dev flow.
  } else if (match) {
    const status = resolveMatchStatus(match.kickoff_at, match.status);
    if (
      status !== "upcoming" ||
      new Date(match.kickoff_at).getTime() <= Date.now()
    ) {
      return { error: "Predictions are locked — this match has started." };
    }
  }

  const { error } = await supabase.from("predictions").upsert(
    {
      match_id: matchId,
      user_id: user.id,
      home_score: homeScore,
      away_score: awayScore,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "match_id,user_id" },
  );

  if (error) {
    if (error.message.includes("schema cache") || error.code === "42P01") {
      return {
        error:
          "Predictions table not set up yet. Run supabase/migrations/002_match_hub.sql in Supabase.",
      };
    }
    return { error: error.message };
  }

  try {
    const { recordDailyActivity } = await import("@/lib/streaks/daily");
    await recordDailyActivity(supabase, user.id, "predict");
  } catch {
    /* streak optional until migration 012 */
  }

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/predictor");
  revalidatePath("/wall");
  revalidatePath("/feed");
  return { success: "Prediction locked in." };
}

export async function sendChatMessage(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const matchId = formData.get("matchId")?.toString();
  const body = formData.get("body")?.toString().trim();

  if (!matchId) {
    return { error: "Missing match." };
  }

  if (!body || body.length < 1) {
    return { error: "Write something first." };
  }

  if (body.length > 280) {
    return { error: "Keep it under 280 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sign in to join the chatroom." };
  }

  const { error } = await supabase.from("chat_messages").insert({
    match_id: matchId,
    user_id: user.id,
    body,
  });

  if (error) {
    if (error.message.includes("schema cache") || error.code === "42P01") {
      return {
        error:
          "Chat table not set up yet. Run supabase/migrations/002_match_hub.sql in Supabase.",
      };
    }
    return { error: error.message };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  // Fans in the room reply so the convo keeps moving
  try {
    const { replyToUserChatMessage } = await import("@/lib/bots/fan-bots");
    await replyToUserChatMessage({
      matchId,
      userId: user.id,
      username: profile?.username ?? "you",
      body,
    });
  } catch (err) {
    console.error("Chat reply skipped:", err);
  }

  try {
    const { recordDailyActivity } = await import("@/lib/streaks/daily");
    await recordDailyActivity(supabase, user.id, "chat");
  } catch {
    /* optional */
  }

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/chat");
  revalidatePath("/feed");
  return { success: "Sent." };
}

export async function submitPost(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const matchId = formData.get("matchId")?.toString();
  const type = formData.get("type")?.toString();
  const content = formData.get("content")?.toString().trim();

  if (!matchId || !type || !content) {
    return { error: "Missing fields." };
  }

  if (!["reaction", "opinion", "verdict"].includes(type)) {
    return { error: "Invalid post type." };
  }

  if (content.length > 1000) {
    return { error: "Post is too long." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sign in to post." };
  }

  const { data: match } = await supabase
    .from("matches")
    .select("status, kickoff_at")
    .eq("id", matchId)
    .maybeSingle();

  if (match) {
    const status = resolveMatchStatus(match.kickoff_at, match.status);
    if (type === "verdict" && status !== "finished") {
      return { error: "Text verdicts unlock after full time." };
    }
  }

  const { error } = await supabase.from("posts").insert({
    match_id: matchId,
    user_id: user.id,
    type,
    content,
  });

  if (error) {
    if (error.code === "42P01") {
      return {
        error: "Posts table missing. Run supabase/migrations/003_bundesliga_social.sql.",
      };
    }
    return { error: error.message };
  }

  if (type === "reaction" || type === "opinion") {
    const { count } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("match_id", matchId)
      .eq("user_id", user.id)
      .in("type", ["reaction", "opinion"]);

    if ((count ?? 0) <= 5) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("football_iq")
        .eq("id", user.id)
        .maybeSingle();

      await supabase
        .from("profiles")
        .update({ football_iq: (profile?.football_iq ?? 100) + 1 })
        .eq("id", user.id);
    }
  }

  try {
    const { recordDailyActivity } = await import("@/lib/streaks/daily");
    await recordDailyActivity(supabase, user.id, "react");
  } catch {
    /* optional */
  }

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/feed");
  return { success: "Posted." };
}
