"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formatDuration, uploadVideoFile } from "@/lib/storage/upload";
import { recordDailyActivity } from "@/lib/streaks/daily";
import { createClient } from "@/lib/supabase/server";

export type UploadState = { error?: string; success?: string };

export async function toggleClipLike(
  clipKey: string,
): Promise<{ liked: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { liked: false, error: "Sign in to like clips." };
  if (!clipKey || clipKey.length > 200) return { liked: false, error: "Bad clip." };

  const { data: existing } = await supabase
    .from("clip_likes")
    .select("clip_key")
    .eq("clip_key", clipKey)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("clip_likes")
      .delete()
      .eq("clip_key", clipKey)
      .eq("user_id", user.id);
    return { liked: false };
  }

  const { error } = await supabase
    .from("clip_likes")
    .insert({ clip_key: clipKey, user_id: user.id });
  if (error) {
    return {
      liked: false,
      error: error.message.toLowerCase().includes("clip_likes")
        ? "Run supabase/migrations/017 to enable likes."
        : error.message,
    };
  }
  void recordDailyActivity(supabase, user.id, "react");
  return { liked: true };
}

/** Called when a clip leaves the screen — what the algorithm learns from. */
export async function recordClipView(
  clipKey: string,
  watchedMs: number,
  completed: boolean,
): Promise<void> {
  if (!clipKey || watchedMs < 800) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.from("clip_views").insert({
    clip_key: clipKey.slice(0, 200),
    user_id: user?.id ?? null,
    watched_ms: Math.min(Math.round(watchedMs), 20 * 60_000),
    completed,
  });
}

export async function toggleFollowUser(
  followeeId: string,
): Promise<{ following: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { following: false, error: "Sign in to follow people." };
  if (followeeId === user.id) return { following: false, error: "That's you." };

  const { data: existing } = await supabase
    .from("user_follows")
    .select("followee_id")
    .eq("follower_id", user.id)
    .eq("followee_id", followeeId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("user_follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("followee_id", followeeId);
    revalidatePath("/clips");
    return { following: false };
  }
  const { error } = await supabase
    .from("user_follows")
    .insert({ follower_id: user.id, followee_id: followeeId });
  if (error) return { following: false, error: error.message };
  revalidatePath("/clips");
  return { following: true };
}

export async function uploadClip(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const title = formData.get("title")?.toString().trim();
  const caption = formData.get("caption")?.toString().trim() || null;
  const matchId = formData.get("matchId")?.toString().trim() || null;
  const teamTag = formData.get("teamTag")?.toString().trim() || null;
  const durationRaw = formData.get("duration")?.toString();
  const video = formData.get("video");

  if (!title || title.length < 3) return { error: "Give the clip a title." };
  if (formData.get("rightsAttested") !== "yes") {
    return { error: "Confirm it is your own footage before uploading." };
  }
  if (!(video instanceof File) || video.size === 0) {
    return { error: "Choose a video to upload." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to upload." };

  try {
    const { path, url } = await uploadVideoFile(supabase, "highlights", user.id, video);
    const secs = Number.parseInt(durationRaw ?? "", 10);
    const duration = Number.isFinite(secs) && secs > 0 ? formatDuration(secs) : "0:30";

    const base = {
      match_id: matchId,
      user_id: user.id,
      title: title.slice(0, 120),
      duration,
      thumbnail_label: "CLIP",
      video_url: url,
      storage_path: path,
      sort_order: Math.floor(Date.now() / 1000),
      source: "fan",
    };
    const rich = {
      ...base,
      caption: caption?.slice(0, 280) ?? null,
      team_tags: teamTag ? [teamTag.slice(0, 60)] : [],
      category: "fan",
      published_at: new Date().toISOString(),
    };

    let { error } = await supabase.from("highlights").insert(rich);
    if (error && /column|schema cache/i.test(error.message)) {
      ({ error } = await supabase.from("highlights").insert(base));
    }
    if (error) return { error: error.message };

    void recordDailyActivity(supabase, user.id, "clip");
    revalidatePath("/clips");
    if (matchId) revalidatePath(`/matches/${matchId}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed." };
  }
  redirect("/clips?tab=friends&posted=1");
}
