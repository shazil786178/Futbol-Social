"use server";

import { revalidatePath } from "next/cache";
import { entitySlug } from "@/lib/entities/slug";
import { uploadImageFile } from "@/lib/storage/upload";
import { createClient } from "@/lib/supabase/server";

export type ShotActionState = { error?: string; success?: string };

export async function publishShot(
  _prev: ShotActionState,
  formData: FormData,
): Promise<ShotActionState> {
  const caption = formData.get("caption")?.toString().trim() ?? "";
  const playerLabel = formData.get("playerLabel")?.toString().trim() || null;
  const teamLabel = formData.get("teamLabel")?.toString().trim() || null;
  const rights = formData.get("rightsAttested")?.toString();
  const file = formData.get("image");

  if (rights !== "yes") {
    return { error: "Confirm you have rights to share this photo." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Pick a photo to publish." };
  }
  if (caption.length > 500) {
    return { error: "Caption max 500 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to publish." };

  try {
    const uploaded = await uploadImageFile(supabase, user.id, file);
    const { error } = await supabase.from("photo_posts").insert({
      user_id: user.id,
      caption,
      image_url: uploaded.url,
      storage_path: uploaded.path,
      player_key: playerLabel ? entitySlug(playerLabel) : null,
      player_label: playerLabel,
      team_key: teamLabel ? entitySlug(teamLabel) : null,
      team_label: teamLabel,
    });

    if (error) {
      if (error.code === "42P01") {
        return { error: "Run supabase/migrations/014_photos_and_ratings.sql" };
      }
      return { error: error.message };
    }

    revalidatePath("/shots");
    if (playerLabel) revalidatePath(`/players/${entitySlug(playerLabel)}`);
    if (teamLabel) revalidatePath(`/teams/${entitySlug(teamLabel)}`);
    return { success: "Published to Shots." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed." };
  }
}

export type RateActionState = { error?: string; success?: string };

export async function rateEntity(
  _prev: RateActionState,
  formData: FormData,
): Promise<RateActionState> {
  const entityType = formData.get("entityType")?.toString();
  const entityKey = formData.get("entityKey")?.toString();
  const entityLabel = formData.get("entityLabel")?.toString()?.trim();
  const ratingRaw = formData.get("rating")?.toString();
  const rating = Number(ratingRaw);

  if (entityType !== "player" && entityType !== "team") {
    return { error: "Invalid entity." };
  }
  if (!entityKey || !entityLabel) return { error: "Missing entity." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
    return { error: "Rate 1–10." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to rate." };

  const { error } = await supabase.from("entity_ratings").upsert(
    {
      user_id: user.id,
      entity_type: entityType,
      entity_key: entityKey,
      entity_label: entityLabel,
      rating,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,entity_type,entity_key" },
  );

  if (error) {
    if (error.code === "42P01") {
      return { error: "Run supabase/migrations/014_photos_and_ratings.sql" };
    }
    return { error: error.message };
  }

  revalidatePath(entityType === "player" ? `/players/${entityKey}` : `/teams/${entityKey}`);
  revalidatePath("/follow");
  revalidatePath("/shots");
  return { success: `Rated ${rating}/10.` };
}
