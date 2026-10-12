import { buildClipReel, type ReelTab } from "@/lib/clips/build-reel";
import {
  loadClipStats,
  loadUploaderNames,
  loadViewerContext,
  type ClipStats,
  type ViewerContext,
  EMPTY_VIEWER,
} from "@/lib/clips/social";
import {
  fetchScoreBatHighlights,
  flattenScoreBatHighlights,
  type SyncedHighlight,
} from "@/lib/football-api/scorebat";
import {
  fetchYouTubeHighlights,
  flattenYouTubeHighlights,
} from "@/lib/football-api/youtube";
import { listHighlights, listMatches } from "@/lib/matches/data";
import type { Highlight } from "@/lib/matches/types";
import { createClient } from "@/lib/supabase/server";
import type { ClipReelItem } from "@/components/clips/clips-reel";

type LocalMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
};

function toHighlight(h: SyncedHighlight, source: string): Highlight {
  return {
    id: h.externalId,
    matchId: h.matchId,
    title: h.title,
    duration: "HL",
    thumbnailLabel: h.videoTitle.slice(0, 24) || "HL",
    videoUrl: null,
    embedUrl: h.embedUrl,
    embedHtml: h.embedHtml,
    thumbnailUrl: h.thumbnailUrl,
    source,
    competitionLabel: h.competitionLabel,
    happenedAt: h.happenedAt,
    userId: null,
  };
}

/** Official league channels on YouTube — free, new uploads every match day. */
async function liveYouTube(local: LocalMatch[]): Promise<Highlight[]> {
  const videos = await fetchYouTubeHighlights();
  if (!videos.length) return [];
  return flattenYouTubeHighlights(videos, local).map((h) =>
    toHighlight(h, "youtube"),
  );
}

/** ScoreBat: full feed with a paid token, otherwise their public sample. */
async function liveScoreBat(local: LocalMatch[]): Promise<Highlight[]> {
  const feed = await fetchScoreBatHighlights();
  if (!feed.length) return [];
  return flattenScoreBatHighlights(feed, local).map((h) =>
    toHighlight(h, "scorebat"),
  );
}

function keyOf(h: Highlight) {
  const url = h.embedUrl || h.videoUrl;
  if (!url) return h.id;
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`;
  } catch {
    return url;
  }
}

/** Every playable clip we know about, deduped on the player URL. */
export async function loadAllClips() {
  const matches = await listMatches();
  const local: LocalMatch[] = matches.map((m) => ({
    id: m.id,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    kickoffAt: m.kickoffAt,
  }));

  const [youtube, scorebat, stored] = await Promise.all([
    liveYouTube(local).catch(() => [] as Highlight[]),
    liveScoreBat(local).catch(() => [] as Highlight[]),
    listHighlights().catch(() => [] as Highlight[]),
  ]);

  // Live rows are freshest; stored rows add fan uploads and anything that has
  // dropped out of the live feeds. Same video → one entry.
  const byKey = new Map<string, Highlight>();
  for (const h of stored) {
    if (h.embedUrl || h.videoUrl) byKey.set(keyOf(h), h);
  }
  for (const h of scorebat) byKey.set(keyOf(h), h);
  for (const h of youtube) byKey.set(keyOf(h), h);

  return { matches, clips: [...byKey.values()] };
}

export type ReelLoad = {
  clips: ClipReelItem[];
  tab: ReelTab;
  viewer: ViewerContext;
  counts: Record<ReelTab, number>;
  reels: Record<ReelTab, ClipReelItem[]>;
};

/** Ranked reel for a tab. Signed-out viewers get the global For You feed. */
export async function loadClipReelFor(tab: ReelTab = "fyp"): Promise<ReelLoad> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ matches, clips }, viewer, stats] = await Promise.all([
    loadAllClips(),
    loadViewerContext(supabase, user?.id ?? null).catch(() => EMPTY_VIEWER),
    loadClipStats(supabase).catch(() => new Map<string, ClipStats>()),
  ]);
  const uploaderNames = await loadUploaderNames(
    supabase,
    clips.map((c) => c.userId ?? "").filter(Boolean),
  ).catch(() => new Map<string, string>());

  const opts = { ctx: viewer, stats, uploaderNames };
  const fyp = buildClipReel(clips, matches, { ...opts, tab: "fyp" });
  const following = buildClipReel(clips, matches, { ...opts, tab: "following" });
  const friends = buildClipReel(clips, matches, { ...opts, tab: "friends" });

  return {
    clips: tab === "following" ? following : tab === "friends" ? friends : fyp,
    tab,
    viewer,
    counts: {
      fyp: fyp.length,
      following: following.length,
      friends: friends.length,
    },
    reels: { fyp, following, friends },
  };
}

/** Backwards-compatible: the global For You reel. */
export async function loadClipReel(): Promise<ClipReelItem[]> {
  const { clips } = await loadClipReelFor("fyp");
  return clips;
}
