import type { SupabaseClient } from "@supabase/supabase-js";

export type ClipStats = {
  likes: number;
  views: number;
  completes: number;
};

export type ViewerContext = {
  userId: string | null;
  supportedTeam: string | null;
  favoriteLeague: string | null;
  followedTeams: string[];
  /** People this viewer follows (friends) */
  friendIds: Set<string>;
  likedKeys: Set<string>;
  /** clip_key → completed? */
  seen: Map<string, boolean>;
};

export const EMPTY_VIEWER: ViewerContext = {
  userId: null,
  supportedTeam: null,
  favoriteLeague: null,
  followedTeams: [],
  friendIds: new Set(),
  likedKeys: new Set(),
  seen: new Map(),
};

/** Stats for every clip that has ever been liked/viewed (view is cheap). */
export async function loadClipStats(
  supabase: SupabaseClient,
): Promise<Map<string, ClipStats>> {
  const { data, error } = await supabase
    .from("clip_stats")
    .select("clip_key, likes, views, completes")
    .limit(5000);
  const map = new Map<string, ClipStats>();
  if (error || !data) return map;
  for (const r of data) {
    map.set(r.clip_key, {
      likes: r.likes ?? 0,
      views: r.views ?? 0,
      completes: r.completes ?? 0,
    });
  }
  return map;
}

export async function loadViewerContext(
  supabase: SupabaseClient,
  userId: string | null,
): Promise<ViewerContext> {
  if (!userId) return EMPTY_VIEWER;

  const [profile, teams, follows, likes, views] = await Promise.all([
    supabase
      .from("profiles")
      .select("supported_team, favorite_league")
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("followed_teams").select("team_name").eq("user_id", userId),
    supabase.from("user_follows").select("followee_id").eq("follower_id", userId),
    supabase
      .from("clip_likes")
      .select("clip_key")
      .eq("user_id", userId)
      .limit(2000),
    supabase
      .from("clip_views")
      .select("clip_key, completed")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1500),
  ]);

  const seen = new Map<string, boolean>();
  for (const v of views.data ?? []) {
    seen.set(v.clip_key, Boolean(v.completed) || seen.get(v.clip_key) === true);
  }

  return {
    userId,
    supportedTeam: profile.data?.supported_team ?? null,
    favoriteLeague:
      profile.data && "favorite_league" in profile.data
        ? ((profile.data as { favorite_league?: string | null }).favorite_league ?? null)
        : null,
    followedTeams: (teams.data ?? []).map((t) => t.team_name),
    friendIds: new Set((follows.data ?? []).map((f) => f.followee_id)),
    likedKeys: new Set((likes.data ?? []).map((l) => l.clip_key)),
    seen,
  };
}

export async function loadUploaderNames(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, string>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, string>();
  if (!ids.length) return map;
  const { data } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", ids);
  for (const p of data ?? []) map.set(p.id, p.username);
  return map;
}
