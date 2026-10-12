import { buildClipReel } from "@/lib/clips/build-reel";
import {
  fetchScoreBatHighlights,
  flattenScoreBatHighlights,
} from "@/lib/football-api/scorebat";
import { listHighlights, listMatches } from "@/lib/matches/data";
import type { Highlight } from "@/lib/matches/types";
import type { ClipReelItem } from "@/components/clips/clips-reel";

async function liveScoreBat(
  matches: Awaited<ReturnType<typeof listMatches>>,
): Promise<Highlight[]> {
  const feed = await fetchScoreBatHighlights();
  if (!feed.length) return [];
  const flat = flattenScoreBatHighlights(
    feed,
    matches.map((m) => ({
      id: m.id,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      kickoffAt: m.kickoffAt,
    })),
  );
  return flat.map((h) => ({
    id: h.externalId,
    matchId: h.matchId,
    title: h.title,
    duration: "HL",
    thumbnailLabel: h.videoTitle.slice(0, 24) || "HL",
    videoUrl: null,
    embedUrl: h.embedUrl,
    embedHtml: h.embedHtml,
    thumbnailUrl: h.thumbnailUrl,
    source: "scorebat",
    competitionLabel: h.competitionLabel,
    happenedAt: h.happenedAt,
  }));
}

/** Live ScoreBat first so Clips always has today's official videos with audio. */
export async function loadClipReel(): Promise<ClipReelItem[]> {
  const matches = await listMatches();
  const [live, stored] = await Promise.all([
    liveScoreBat(matches),
    listHighlights().catch(() => [] as Highlight[]),
  ]);

  const byId = new Map<string, Highlight>();
  for (const h of stored) {
    if (h.embedUrl || h.videoUrl) byId.set(h.id, h);
  }
  for (const h of live) {
    byId.set(h.id, h);
  }

  return buildClipReel([...byId.values()], matches);
}
