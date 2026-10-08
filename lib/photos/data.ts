import { createClient } from "@/lib/supabase/server";

export type PhotoPost = {
  id: string;
  userId: string;
  username: string;
  caption: string;
  imageUrl: string;
  matchId: string | null;
  playerKey: string | null;
  playerLabel: string | null;
  teamKey: string | null;
  teamLabel: string | null;
  createdAt: string;
};

export async function listPhotoPosts(limit = 40): Promise<PhotoPost[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("photo_posts")
      .select(
        "id, user_id, caption, image_url, match_id, player_key, player_label, team_key, team_label, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data?.length) return [];

    const userIds = [...new Set(data.map((r) => r.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", userIds);

    const nameById = new Map(
      (profiles ?? []).map((p) => [p.id, p.username as string]),
    );

    return data.map((r) => ({
      id: r.id,
      userId: r.user_id,
      username: nameById.get(r.user_id) ?? "fan",
      caption: r.caption ?? "",
      imageUrl: r.image_url,
      matchId: r.match_id,
      playerKey: r.player_key,
      playerLabel: r.player_label,
      teamKey: r.team_key,
      teamLabel: r.team_label,
      createdAt: r.created_at,
    }));
  } catch {
    return [];
  }
}

export async function listPhotosForEntity(
  kind: "player" | "team",
  key: string,
  limit = 24,
): Promise<PhotoPost[]> {
  try {
    const supabase = await createClient();
    const col = kind === "player" ? "player_key" : "team_key";
    const { data, error } = await supabase
      .from("photo_posts")
      .select(
        "id, user_id, caption, image_url, match_id, player_key, player_label, team_key, team_label, created_at",
      )
      .eq(col, key)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data?.length) return [];

    const userIds = [...new Set(data.map((r) => r.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", userIds);
    const nameById = new Map(
      (profiles ?? []).map((p) => [p.id, p.username as string]),
    );

    return data.map((r) => ({
      id: r.id,
      userId: r.user_id,
      username: nameById.get(r.user_id) ?? "fan",
      caption: r.caption ?? "",
      imageUrl: r.image_url,
      matchId: r.match_id,
      playerKey: r.player_key,
      playerLabel: r.player_label,
      teamKey: r.team_key,
      teamLabel: r.team_label,
      createdAt: r.created_at,
    }));
  } catch {
    return [];
  }
}
