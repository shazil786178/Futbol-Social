import type { SyncedHighlight } from "@/lib/football-api/scorebat";
import { mapCompetition, teamsLikelyMatch } from "@/lib/football-api/scorebat";

/**
 * Free, daily match highlights straight from the official league channels on
 * YouTube. Uses the YouTube Data API v3 (free quota: 10,000 units/day — we use
 * about 2 units per channel per refresh), so set YOUTUBE_API_KEY.
 */

type YouTubeChannel = {
  id: string;
  /** Same "COUNTRY: League" shape ScoreBat uses so mapCompetition() works. */
  label: string;
};

export const YOUTUBE_CHANNELS: YouTubeChannel[] = [
  { id: "UCG5qGWdu8nIRZqJ_GgDwQ-w", label: "ENGLAND: Premier League" },
  { id: "UCTv-XvfzLX3i4IGWAm4sbmA", label: "SPAIN: La Liga" },
  { id: "UC6UL29enLNe4mqwTfAyeNuw", label: "GERMANY: Bundesliga" },
  { id: "UCBJeMCIeLQos7wacox4hmLQ", label: "ITALY: Serie A" },
  { id: "UCET00YnetHT7tOpu12v8jxg", label: "UEFA: Champions League" }, // CBS Sports Golazo
  { id: "UCyGa1YEx9ST66rYrJTGIKOw", label: "UEFA: Champions League" }, // UEFA
  { id: "UCSZbXT5TLLW_i-5W8FZpFsg", label: "USA: MLS" },
];

export type YouTubeHighlight = {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string | null;
  competitionLabel: string;
  durationSec: number;
};

const API = "https://www.googleapis.com/youtube/v3";
const REVALIDATE_SEC = 15 * 60;

const HIGHLIGHT_WORDS =
  /\bhighlights?\b|\bresumen\b|\bextended\b|\bevery goal\b|\ball (the )?goals\b|\bbest goals\b|\bgoals? of the\b|\bzusammenfassung\b|\bsintesi\b|\brecap\b|\bmatchday\b|\bmatchweek\b/i;
const SCORELINE = /\b\d{1,2}\s*[-–:]\s*\d{1,2}\b/;
const NOISE =
  /#shorts|\bshorts\b|\bpress conference\b|\binterview\b|\bpodcast\b|\bfull show\b|\bfull match\b|\blive stream\b|\breaction\b|\bpreview\b|\bprediction/i;

export function looksLikeHighlight(title: string): boolean {
  if (NOISE.test(title)) return false;
  return HIGHLIGHT_WORDS.test(title) || SCORELINE.test(title);
}

/** "PT1H2M3S" → seconds */
export function parseIsoDuration(iso: string | undefined): number {
  if (!iso) return 0;
  const m = iso.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  const [, d, h, min, s] = m;
  return (
    (Number(d) || 0) * 86400 +
    (Number(h) || 0) * 3600 +
    (Number(min) || 0) * 60 +
    (Number(s) || 0)
  );
}

/**
 * Pull the two teams out of an official channel title.
 *   "Liverpool 2-1 Chelsea | Highlights"          → Liverpool / Chelsea
 *   "R. RACING CLUB 2 - 2 VALENCIA CF | RESUMEN"  → R. Racing Club / Valencia CF
 *   "HOFFENHEIM - HAMBURGER SV | Highlights"      → Hoffenheim / Hamburger SV
 *   "Arsenal vs Tottenham | Extended Highlights"  → Arsenal / Tottenham
 */
export function parseTeamsFromTitle(
  title: string,
): { homeTeam: string; awayTeam: string } | null {
  const segments = title.split(/\s*[|•·]\s*/).map((s) => s.trim());
  for (const seg of segments) {
    const scored = seg.match(/^(.+?)\s+\d{1,2}\s*[-–:]\s*\d{1,2}\s+(.+?)$/);
    if (scored?.[1] && scored[2]) {
      return clean(scored[1], scored[2]);
    }
    const versus = seg.match(/^(.+?)\s+(?:vs?\.?|v|-|–|x)\s+(.+?)$/i);
    if (versus?.[1] && versus[2]) {
      return clean(versus[1], versus[2]);
    }
  }
  return null;

  function clean(a: string, b: string) {
    const strip = (s: string) =>
      s
        .replace(/\b(extended|highlights?|resumen|recap|goals?)\b.*$/i, "")
        .replace(/[()[\]]/g, "")
        .trim();
    const homeTeam = titleCase(strip(a));
    const awayTeam = titleCase(strip(b));
    if (homeTeam.length < 2 || awayTeam.length < 2) return null;
    if (homeTeam.split(" ").length > 5 || awayTeam.split(" ").length > 5) {
      return null;
    }
    if (NOT_A_TEAM.test(homeTeam) || NOT_A_TEAM.test(awayTeam)) return null;
    return { homeTeam, awayTeam };
  }
}

/** Segments like "Top 5 Saves - Matchweek 6" must not become fake fixtures. */
const NOT_A_TEAM =
  /\b(matchweek|matchday|jornada|spieltag|giornata|week|round|top\s*\d+|best|saves?|skills?|moments?|goals?|highlights?|resumen|recap|season|\d{4}\/\d{2})\b|^\d+$/i;

function titleCase(s: string) {
  if (s !== s.toUpperCase()) return s;
  return s
    .toLowerCase()
    .replace(/(^|\s|\.)([a-z])/g, (m) => m.toUpperCase())
    .replace(
      /\b(Fc|Cf|Sc|Sv|Afc|Rb|Ac|As|Ss|Us|Psg|Bvb|Vfb|Vfl|Tsg|Fsv|Rcd|Ud|Cd)\b/g,
      (m) => m.toUpperCase(),
    );
}

type PlaylistItemsResponse = {
  items?: {
    snippet?: {
      publishedAt?: string;
      title?: string;
      resourceId?: { videoId?: string };
      thumbnails?: Record<string, { url?: string }>;
    };
  }[];
};

type VideosResponse = {
  items?: {
    id?: string;
    status?: { embeddable?: boolean; privacyStatus?: string };
    contentDetails?: { duration?: string };
  }[];
};

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate: REVALIDATE_SEC },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      if (res.status === 403 || res.status === 400) {
        const body = await res.text().catch(() => "");
        console.warn(`YouTube API ${res.status}:`, body.slice(0, 200));
      }
      return null;
    }
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function pickThumb(
  thumbs: Record<string, { url?: string }> | undefined,
  videoId: string,
) {
  return (
    thumbs?.maxres?.url ||
    thumbs?.standard?.url ||
    thumbs?.high?.url ||
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
  );
}

async function fetchChannel(
  key: string,
  channel: YouTubeChannel,
): Promise<YouTubeHighlight[]> {
  // Uploads playlist id is the channel id with "UC" swapped for "UU" (1 unit)
  const uploads = `UU${channel.id.slice(2)}`;
  const list = await getJson<PlaylistItemsResponse>(
    `${API}/playlistItems?part=snippet&maxResults=30&playlistId=${uploads}&key=${encodeURIComponent(key)}`,
  );
  const candidates = (list?.items ?? [])
    .map((it) => ({
      videoId: it.snippet?.resourceId?.videoId ?? "",
      title: it.snippet?.title ?? "",
      publishedAt: it.snippet?.publishedAt ?? "",
      thumbs: it.snippet?.thumbnails,
    }))
    .filter((c) => c.videoId && c.title && looksLikeHighlight(c.title));
  if (!candidates.length) return [];

  // Drop shorts, full matches and anything the league disabled embedding for (1 unit)
  const details = await getJson<VideosResponse>(
    `${API}/videos?part=status,contentDetails&id=${candidates
      .map((c) => c.videoId)
      .join(",")}&key=${encodeURIComponent(key)}`,
  );
  const meta = new Map(
    (details?.items ?? []).map((v) => [
      v.id ?? "",
      {
        embeddable: v.status?.embeddable !== false,
        pub: v.status?.privacyStatus ?? "public",
        duration: parseIsoDuration(v.contentDetails?.duration),
      },
    ]),
  );

  const out: YouTubeHighlight[] = [];
  for (const c of candidates) {
    const m = meta.get(c.videoId);
    if (!m || !m.embeddable || m.pub !== "public") continue;
    if (m.duration < 60 || m.duration > 30 * 60) continue;
    out.push({
      videoId: c.videoId,
      title: c.title,
      publishedAt: c.publishedAt,
      thumbnailUrl: pickThumb(c.thumbs, c.videoId),
      competitionLabel: channel.label,
      durationSec: m.duration,
    });
  }
  return out;
}

export function hasYouTubeKey(): boolean {
  return Boolean(process.env.YOUTUBE_API_KEY?.trim());
}

export async function fetchYouTubeHighlights(): Promise<YouTubeHighlight[]> {
  const key = process.env.YOUTUBE_API_KEY?.trim();
  if (!key) return [];

  const perChannel = await Promise.all(
    YOUTUBE_CHANNELS.map((c) => fetchChannel(key, c).catch(() => [])),
  );

  const seen = new Set<string>();
  const out: YouTubeHighlight[] = [];
  for (const v of perChannel.flat()) {
    if (seen.has(v.videoId)) continue;
    seen.add(v.videoId);
    out.push(v);
  }
  out.sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
  return out;
}

export function youTubeEmbedUrl(videoId: string) {
  return `https://www.youtube.com/embed/${videoId}`;
}

function slugPart(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 28);
}

/** Same shape as flattenScoreBatHighlights so the reel + DB sync treat both alike. */
export function flattenYouTubeHighlights(
  videos: YouTubeHighlight[],
  localMatches: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    kickoffAt: string;
  }[],
): SyncedHighlight[] {
  return videos.map((v, i) => {
    const teams = parseTeamsFromTitle(v.title);
    const published = +new Date(v.publishedAt);
    const embedUrl = youTubeEmbedUrl(v.videoId);

    let matchId: string | null = null;
    let stubMatch: SyncedHighlight["stubMatch"] = null;

    if (teams) {
      // Highlights land within ~3 days after kick-off
      const linked = localMatches.find((lm) => {
        const ko = +new Date(lm.kickoffAt);
        const delta = published - ko;
        return (
          delta > -3 * 3_600_000 &&
          delta < 3 * 86_400_000 &&
          teamsLikelyMatch(lm.homeTeam, lm.awayTeam, teams.homeTeam, teams.awayTeam)
        );
      });
      if (linked) {
        matchId = linked.id;
      } else {
        const day = v.publishedAt.slice(0, 10);
        matchId = `yt-${slugPart(teams.homeTeam)}-${slugPart(teams.awayTeam)}-${day}`;
        stubMatch = {
          id: matchId,
          competitionId: mapCompetition(v.competitionLabel),
          homeTeam: teams.homeTeam,
          awayTeam: teams.awayTeam,
          kickoffAt: v.publishedAt,
        };
      }
    }

    const mins = Math.max(1, Math.round(v.durationSec / 60));
    return {
      externalId: `youtube-${v.videoId}`,
      matchId,
      stubMatch,
      title: v.title,
      competitionLabel: v.competitionLabel,
      thumbnailUrl: v.thumbnailUrl,
      embedHtml: `<iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe>`,
      embedUrl,
      videoTitle: `${mins} min`,
      sortOrder: i,
      happenedAt: v.publishedAt,
    };
  });
}
