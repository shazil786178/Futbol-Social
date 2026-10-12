import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { COMPETITIONS } from "@/lib/brand";
import { withResolvedStatus } from "./format";
import type {
  ChatMessage,
  CompetitionId,
  Highlight,
  Match,
  MatchPost,
  Prediction,
  ProfileRow,
  Skit,
  IqEvent,
  Notification,
} from "./types";

const COMP_NAMES = Object.fromEntries(
  COMPETITIONS.active.map((c) => [c.id, c.name]),
) as Record<CompetitionId, string>;

async function usernameMap(userIds: string[]) {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return new Map<string, string>();

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", unique);

  return new Map((data ?? []).map((row) => [row.id, row.username]));
}

function mapMatchRow(row: {
  id: string;
  competition_id: string;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  status: Match["status"];
  home_score: number | null;
  away_score: number | null;
  venue: string | null;
  minute?: number | null;
  external_id?: string | null;
}): Match {
  const competitionId = row.competition_id as CompetitionId;
  return withResolvedStatus({
    id: row.id,
    competitionId,
    competitionName: COMP_NAMES[competitionId] ?? row.competition_id,
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    kickoffAt: row.kickoff_at,
    status: row.status,
    homeScore: row.home_score,
    awayScore: row.away_score,
    venue: row.venue ?? "",
    minute: row.minute ?? null,
    externalId: row.external_id ?? null,
  });
}

/** Deduped per request — header, stay-loop and the page all read the board. */
export const listMatches = cache(async function listMatches(
  competitionId?: string,
): Promise<Match[]> {
  const supabase = await createClient();
  // PostgREST caps rows at 1000 — without a window the oldest games crowd out live ones
  const since = new Date(Date.now() - 10 * 86_400_000).toISOString();
  let query = supabase
    .from("matches")
    .select("*")
    .gte("kickoff_at", since)
    .order("kickoff_at", { ascending: true })
    .limit(1000);

  if (competitionId) {
    query = query.eq("competition_id", competitionId);
  }

  const { data, error } = await query;

  // Never fall back to demo seed fixtures — they show wrong dates/teams.
  // Run the sync job (npm run sync) to load real matches from the APIs.
  if (error || !data?.length) {
    return [];
  }

  return data.map(mapMatchRow);
});

export async function getMatch(id: string): Promise<Match | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return undefined;
  }

  return mapMatchRow(data);
}

export async function listHighlights(matchId?: string): Promise<Highlight[]> {
  const supabase = await createClient();
  let query = supabase
    .from("highlights")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (matchId) {
    query = query.eq("match_id", matchId);
  }

  const { data, error } = await query.limit(matchId ? 40 : 60);

  if (error || !data?.length) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    matchId: row.match_id ?? null,
    title: row.title,
    duration: row.duration,
    thumbnailLabel: row.thumbnail_label,
    videoUrl: row.video_url ?? null,
    embedUrl:
      row.embed_url ??
      (typeof row.video_url === "string" &&
      (row.video_url.includes("scorebat.com/embed") ||
        row.video_url.includes("youtube.com/embed"))
        ? row.video_url
        : null),
    embedHtml: row.embed_html ?? null,
    thumbnailUrl: row.thumbnail_url ?? null,
    source:
      row.source ??
      (typeof row.video_url === "string" && row.video_url.includes("scorebat.com")
        ? "scorebat"
        : typeof row.video_url === "string" &&
            row.video_url.includes("youtube.com")
          ? "youtube"
          : null),
    competitionLabel: row.competition_label ?? null,
  }));
}

export async function listSkits(): Promise<Skit[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("skits")
    .select("id, match_id, title, duration, tag, user_id, video_url")
    .order("created_at", { ascending: false })
    .limit(24);

  if (error || !data?.length) {
    return [];
  }

  const names = await usernameMap(data.map((row) => row.user_id));

  return data.map((row) => ({
    id: row.id,
    matchId: row.match_id,
    title: row.title,
    author: names.get(row.user_id) ?? "fan",
    duration: row.duration,
    tag: row.tag,
    videoUrl: row.video_url ?? null,
  }));
}

export async function listPredictions(matchId: string): Promise<Prediction[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("predictions")
    .select("id, match_id, user_id, home_score, away_score, created_at")
    .eq("match_id", matchId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) {
    return [];
  }

  const names = await usernameMap(data.map((row) => row.user_id));

  return data.map((row) => ({
    id: row.id,
    matchId: row.match_id,
    userId: row.user_id,
    username: names.get(row.user_id) ?? "fan",
    homeScore: row.home_score,
    awayScore: row.away_score,
    createdAt: row.created_at,
  }));
}

export async function listChatMessages(matchId: string): Promise<ChatMessage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, match_id, user_id, body, created_at")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true })
    .limit(80);

  if (error || !data) {
    return [];
  }

  const names = await usernameMap(data.map((row) => row.user_id));

  return data.map((row) => ({
    id: row.id,
    matchId: row.match_id,
    userId: row.user_id,
    username: names.get(row.user_id) ?? "fan",
    body: row.body,
    createdAt: row.created_at,
  }));
}

export async function listPosts(matchId: string): Promise<MatchPost[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("id, match_id, user_id, type, content, created_at")
    .eq("match_id", matchId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) {
    return [];
  }

  const names = await usernameMap(data.map((row) => row.user_id));

  return data.map((row) => ({
    id: row.id,
    matchId: row.match_id,
    userId: row.user_id,
    username: names.get(row.user_id) ?? "fan",
    type: row.type as MatchPost["type"],
    content: row.content,
    createdAt: row.created_at,
  }));
}

export async function getLeaderboard(limit = 20): Promise<ProfileRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, football_iq, oracle_badge, avatar_url")
    .order("football_iq", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data;
}

export async function getProfileByUsername(
  username: string,
): Promise<ProfileRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, football_iq, oracle_badge, avatar_url")
    .ilike("username", username)
    .maybeSingle();

  return data ?? null;
}

export async function listWallPredictions(): Promise<Prediction[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("predictions")
    .select("id, match_id, user_id, home_score, away_score, created_at")
    .order("created_at", { ascending: false })
    .limit(40);

  if (error || !data) {
    return [];
  }

  const names = await usernameMap(data.map((row) => row.user_id));

  return data.map((row) => ({
    id: row.id,
    matchId: row.match_id,
    userId: row.user_id,
    username: names.get(row.user_id) ?? "fan",
    homeScore: row.home_score,
    awayScore: row.away_score,
    createdAt: row.created_at,
  }));
}

export async function listIqEvents(userId: string): Promise<IqEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("football_iq_events")
    .select("id, match_id, delta, reason, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    matchId: row.match_id,
    delta: row.delta,
    reason: row.reason,
    createdAt: row.created_at,
  }));
}

export async function listNotifications(userId: string): Promise<Notification[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, body, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) return 0;
  return count ?? 0;
}

export async function listUniqueTeams(): Promise<string[]> {
  const matches = await listMatches();
  const teams = new Set<string>();
  for (const m of matches) {
    teams.add(m.homeTeam);
    teams.add(m.awayTeam);
  }
  return [...teams].sort((a, b) => a.localeCompare(b));
}
