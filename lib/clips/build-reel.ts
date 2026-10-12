import type { ClipReelItem } from "@/components/clips/clips-reel";
import { isYouTubeEmbed } from "@/lib/football-api/scorebat";
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

/** Player URLs that may be stored in video_url when migration 013 is missing. */
function isPlayerEmbed(url: string | null | undefined) {
  return isScoreBatEmbed(url) || isYouTubeEmbed(url);
}

/** Official YouTube/ScoreBat embeds + fan uploads only — no scenery stock. */
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
    const aTime = a.happenedAt ? +new Date(a.happenedAt) : 0;
    const bTime = b.happenedAt ? +new Date(b.happenedAt) : 0;
    if (bTime !== aTime) return bTime - aTime;
    const aEmbed = a.embedUrl || (isPlayerEmbed(a.videoUrl) ? a.videoUrl : null);
    const bEmbed = b.embedUrl || (isPlayerEmbed(b.videoUrl) ? b.videoUrl : null);
    const official = (h: Highlight, embed: string | null) =>
      h.source === "youtube" ||
      h.source === "scorebat" ||
      isYouTubeEmbed(embed) ||
      isScoreBatEmbed(embed);
    const aScore = (official(a, aEmbed) ? 2 : 0) + (aEmbed ? 1 : 0);
    const bScore = (official(b, bEmbed) ? 2 : 0) + (bEmbed ? 1 : 0);
    return bScore - aScore;
  });

  const newest = playable[0]?.happenedAt
    ? +new Date(playable[0].happenedAt)
    : 0;
  const freshWindow = 12 * 86_400_000;
  const fresh = playable.filter((h) => {
    if (!h.happenedAt) return true;
    return newest - +new Date(h.happenedAt) < freshWindow;
  });
  const pool = fresh.length >= 6 ? fresh : playable;

  return pool.slice(0, 48).map((h, i) => {
    const match = h.matchId ? byId.get(h.matchId) : undefined;
    const embedUrl =
      h.embedUrl || (isPlayerEmbed(h.videoUrl) ? h.videoUrl : null);
    const fileUrl =
      h.videoUrl && !isPlayerEmbed(h.videoUrl) ? h.videoUrl : null;
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
      author:
        h.source === "youtube" || h.source === "scorebat" || embedUrl
          ? "official"
          : "fan",
      likes: 800 + ((i * 97) % 4200),
      accent: ACCENTS[i % ACCENTS.length]!,
      competitionLabel: h.competitionLabel,
      happenedAt: h.happenedAt ?? null,
    };
  });
}
