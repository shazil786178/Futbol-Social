import type { ClipReelItem } from "@/components/clips/clips-reel";
import type { Highlight, Match } from "@/lib/matches/types";

const ACCENTS: ClipReelItem["accent"][] = ["sky", "beige", "live"];

function matchLabel(m: Match | undefined, h: Highlight) {
  if (m) return `${m.homeTeam} vs ${m.awayTeam}`;
  if (h.competitionLabel) return h.competitionLabel;
  return "Match highlights";
}

function isScoreBatEmbed(url: string | null | undefined) {
  return Boolean(url && url.includes("scorebat.com/embed"));
}

/** Official ScoreBat embeds + fan uploads only — no scenery stock. */
export function buildClipReel(
  highlights: Highlight[],
  matches: Match[],
): ClipReelItem[] {
  const byId = new Map(matches.map((m) => [m.id, m]));

  const playable = highlights.filter((h) => {
    const url = h.embedUrl || h.videoUrl;
    return Boolean(url);
  });

  playable.sort((a, b) => {
    const aEmbed = a.embedUrl || (isScoreBatEmbed(a.videoUrl) ? a.videoUrl : null);
    const bEmbed = b.embedUrl || (isScoreBatEmbed(b.videoUrl) ? b.videoUrl : null);
    const aScore =
      (a.source === "scorebat" || isScoreBatEmbed(aEmbed) ? 2 : 0) +
      (aEmbed ? 1 : 0);
    const bScore =
      (b.source === "scorebat" || isScoreBatEmbed(bEmbed) ? 2 : 0) +
      (bEmbed ? 1 : 0);
    return bScore - aScore;
  });

  return playable.slice(0, 40).map((h, i) => {
    const match = h.matchId ? byId.get(h.matchId) : undefined;
    const embedUrl =
      h.embedUrl || (isScoreBatEmbed(h.videoUrl) ? h.videoUrl : null);
    const fileUrl =
      h.videoUrl && !isScoreBatEmbed(h.videoUrl) ? h.videoUrl : null;
    return {
      id: h.id,
      title: h.title,
      duration: h.duration || "HL",
      thumbnailLabel: h.thumbnailLabel || "HL",
      videoUrl: fileUrl,
      embedUrl,
      thumbnailUrl: h.thumbnailUrl,
      matchId: h.matchId ?? match?.id ?? "matches",
      matchLabel: matchLabel(match, h),
      author: h.source === "scorebat" || embedUrl ? "official" : "fan",
      likes: 800 + ((i * 97) % 4200),
      accent: ACCENTS[i % ACCENTS.length]!,
      competitionLabel: h.competitionLabel,
    };
  });
}
