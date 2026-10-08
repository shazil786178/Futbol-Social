import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_SKIT_BYTES = 50 * 1024 * 1024;
const MAX_HIGHLIGHT_BYTES = 100 * 1024 * 1024;
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
const ALLOWED_VIDEO = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);
const ALLOWED_IMAGE = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export type UploadBucket = "skits" | "highlights" | "photos";

export async function uploadVideoFile(
  supabase: SupabaseClient,
  bucket: "skits" | "highlights",
  userId: string,
  file: File,
): Promise<{ path: string; url: string }> {
  if (!ALLOWED_VIDEO.has(file.type)) {
    throw new Error("Upload MP4, WebM, or MOV only.");
  }

  const maxBytes = bucket === "skits" ? MAX_SKIT_BYTES : MAX_HIGHLIGHT_BYTES;
  if (file.size > maxBytes) {
    throw new Error(
      `File too large (max ${bucket === "skits" ? "50" : "100"} MB).`,
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "mp4";
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

export async function uploadImageFile(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<{ path: string; url: string }> {
  if (!ALLOWED_IMAGE.has(file.type)) {
    throw new Error("Upload JPG, PNG, or WebP only.");
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error("Photo too large (max 15 MB).");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from("photos").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from("photos").getPublicUrl(path);
  return { path, url: data.publicUrl };
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
