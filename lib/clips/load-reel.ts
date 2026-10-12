import { buildClipReel } from "@/lib/clips/build-reel";
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

/** Live sources first so Clips always has today's official videos with audio. */
export async function loadClipReel(): Promise<ClipReelItem[]> {
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

  // Stored rows carry DB ids; live rows carry external ids — dedupe on the
  // player URL so the same video never shows twice.
  const byKey = new Map<string, Highlight>();
  const keyOf = (h: Highlight) => {
    const url = h.embedUrl || h.videoUrl;
    if (!url) return h.id;
    try {
      const u = new URL(url);
      return `${u.hostname}${u.pathname}`;
    } catch {
      return url;
    }
  };
  for (const h of stored) {
    if (h.embedUrl || h.videoUrl) byKey.set(keyOf(h), h);
  }
  for (const h of scorebat) byKey.set(keyOf(h), h);
  for (const h of youtube) byKey.set(keyOf(h), h);

  return buildClipReel([...byKey.values()], matches);
}
