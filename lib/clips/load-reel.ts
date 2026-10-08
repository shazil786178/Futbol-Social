import { buildClipReel } from "@/lib/clips/build-reel";
import {
  fetchScoreBatHighlights,
  flattenScoreBatHighlights,
} from "@/lib/football-api/scorebat";
import { listHighlights, listMatches } from "@/lib/matches/data";
import type { Highlight } from "@/lib/matches/types";
import type { ClipReelItem } from "@/components/clips/clips-reel";

async function liveScoreBatFallback(
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
  }));
}

/** Shared loader for home + /clips — official highlights first. */
export async function loadClipReel(): Promise<ClipReelItem[]> {
  const [highlights, matches] = await Promise.all([
    listHighlights(),
    listMatches(),
  ]);
  const fromDb = highlights.filter((h) => h.embedUrl || h.videoUrl);
  const source =
    fromDb.length > 0 ? fromDb : await liveScoreBatFallback(matches);
  return buildClipReel(source, matches);
}
