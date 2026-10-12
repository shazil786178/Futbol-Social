import type { SyncedHighlight } from "@/lib/football-api/scorebat";
import { mapCompetition, teamsLikelyMatch } from "@/lib/football-api/scorebat";

/**
 * Free, daily match highlights straight from official league / rights-holder
 * channels on YouTube. Uses the YouTube Data API v3 (free quota: 10,000
 * units/day — about 2 units per channel per refresh), so set YOUTUBE_API_KEY.
 *
 * Everything here is embedded through YouTube's own player, which is the
 * licensed way to show these videos — we never download or re-host anything.
 */

type YouTubeChannel = {
  id: string;
  /** Same "COUNTRY: League" shape ScoreBat uses so mapCompetition() works. */
  label: string;
  /** 1 = always pulled. 2 = pulled when the day is thin (< MIN_FRESH new clips). */
  tier: 1 | 2;
};

export const YOUTUBE_CHANNELS: YouTubeChannel[] = [
  // Tier 1 — the leagues the app is built around
  { id: "UCG5qGWdu8nIRZqJ_GgDwQ-w", label: "ENGLAND: Premier League", tier: 1 },
  { id: "UCTv-XvfzLX3i4IGWAm4sbmA", label: "SPAIN: La Liga", tier: 1 },
  { id: "UC6UL29enLNe4mqwTfAyeNuw", label: "GERMANY: Bundesliga", tier: 1 },
  { id: "UCBJeMCIeLQos7wacox4hmLQ", label: "ITALY: Serie A", tier: 1 },
  { id: "UCET00YnetHT7tOpu12v8jxg", label: "UEFA: Champions League", tier: 1 }, // CBS Sports Golazo
  { id: "UCyGa1YEx9ST66rYrJTGIKOw", label: "UEFA: Champions League", tier: 1 }, // UEFA
  { id: "UCSZbXT5TLLW_i-5W8FZpFsg", label: "USA: MLS", tier: 1 },
  // Tier 2 — more official leagues + rights-holding broadcasters
  { id: "UCQsH5XtIc9hONE1BQjucM0g", label: "FRANCE: Ligue 1", tier: 2 },
  { id: "UC3CXMy61P5WQMLiDDJn8nNA", label: "UEFA: Europa League", tier: 2 },
  { id: "UCq8BPLXtFeiSFOvmJrknWGg", label: "MEXICO: Liga MX", tier: 2 },
  { id: "UCrf4Fr6uTCoU9RkYa5CbzcA", label: "BRAZIL: Brasileirão", tier: 2 },
  { id: "UCkgm4b5n3QsMUgB9FjA8S2w", label: "ENGLAND: EFL", tier: 2 },
  { id: "UCnQpt1UxLq00NFULxTDHMww", label: "ENGLAND: Women's Super League", tier: 2 },
  { id: "UCpcTrCXblq78GZrTUTLWeBw", label: "WORLD: FIFA", tier: 2 },
  { id: "UCqn7r-so0mBLaJTtTms9dAQ", label: "CONCACAF", tier: 2 },
  { id: "UCXTRFt1vLvZpahQtiKJjLaQ", label: "ASIA: AFC", tier: 2 },
  { id: "UCqZQlzSHbVJrwrn5XvzrzcA", label: "ENGLAND: Premier League", tier: 2 }, // NBC Sports
  { id: "UCZ7wY7MRDSygp63HIEfdQZA", label: "ENGLAND: Premier League", tier: 2 }, // Sky Sports Football
  { id: "UClhp9g6TPiqCTOlcw0ROfNg", label: "UEFA: Champions League", tier: 2 }, // TNT Sports
  { id: "UC6c1z7bA__85CIWZ_jpCK-Q", label: "WORLD: ESPN FC", tier: 2 },
  { id: "UCooTLkxcpnTNx6vfOovfBFA", label: "WORLD: FOX Soccer", tier: 2 },
  { id: "UCSZ21xyG8w_33KriMM69IxQ", label: "WORLD: DAZN Football", tier: 2 },
  { id: "UC0YatYmg5JRYzXJPxIdRd8g", label: "WORLD: beIN SPORTS", tier: 2 },
];

/** Below this many clips from the last 24h we go looking for more. */
export const MIN_FRESH_PER_DAY = 10;

export type YouTubeHighlight = {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string | null;
  competitionLabel: string;
  durationSec: number;
  channelTitle?: string;
};

const API = "https://www.googleapis.com/youtube/v3";
const REVALIDATE_SEC = 15 * 60;

const HIGHLIGHT_WORDS =
  /\bhighlights?\b|\bresumen\b|\bextended\b|\bevery goal\b|\ball (the )?goals\b|\bbest goals\b|\bgoals? of the\b|\bzusammenfassung\b|\bsintesi\b|\brecap\b|\bmatchday\b|\bmatchweek\b|\bmelhores momentos\b|\brésumé\b|\bresumo\b/i;
const SCORELINE = /\b\d{1,2}\s*[-–:]\s*\d{1,2}\b/;
const NOISE =
  /#shorts|\bshorts\b|\bpress conference\b|\binterview\b|\bpodcast\b|\bfull show\b|\bfull match\b|\blive stream\b|\breaction\b|\bpreview\b|\bprediction|\btrailer\b|\bdraw\b/i;

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
      const r = clean(scored[1], scored[2]);
      if (r) return r;
    }
    const versus = seg.match(/^(.+?)\s+(?:vs?\.?|v|-|–|x)\s+(.+?)$/i);
    if (versus?.[1] && versus[2]) {
      const r = clean(versus[1], versus[2]);
      if (r) return r;
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

type Snippet = {
  publishedAt?: string;
  title?: string;
  channelTitle?: string;
  resourceId?: { videoId?: string };
  thumbnails?: Record<string, { url?: string }>;
};

type PlaylistItemsResponse = { items?: { snippet?: Snippet }[] };
type SearchResponse = {
  items?: { id?: { videoId?: string }; snippet?: Snippet }[];
};
type VideosResponse = {
  items?: {
    id?: string;
    status?: { embeddable?: boolean; privacyStatus?: string };
    contentDetails?: { duration?: string };
  }[];
};

type Candidate = {
  videoId: string;
  title: string;
  publishedAt: string;
  channelTitle?: string;
  thumbs?: Record<string, { url?: string }>;
};

async function getJson<T>(url: string, revalidate = REVALIDATE_SEC): Promise<T | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate },
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

function apiKey() {
  return process.env.YOUTUBE_API_KEY?.trim() || null;
}

/** Latest uploads of a channel (1 quota unit). */
async function fetchUploads(key: string, channelId: string, max = 30): Promise<Candidate[]> {
  const uploads = `UU${channelId.slice(2)}`;
  const list = await getJson<PlaylistItemsResponse>(
    `${API}/playlistItems?part=snippet&maxResults=${max}&playlistId=${uploads}&key=${encodeURIComponent(key)}`,
  );
  return (list?.items ?? [])
    .map((it) => ({
      videoId: it.snippet?.resourceId?.videoId ?? "",
      title: it.snippet?.title ?? "",
      publishedAt: it.snippet?.publishedAt ?? "",
      channelTitle: it.snippet?.channelTitle,
      thumbs: it.snippet?.thumbnails,
    }))
    .filter((c) => c.videoId && c.title);
}

/** Embeddable + public + sane duration (1 unit per 50 ids). */
async function enrich(
  key: string,
  candidates: Candidate[],
  bounds: { min: number; max: number },
): Promise<(Candidate & { durationSec: number })[]> {
  const out: (Candidate & { durationSec: number })[] = [];
  for (let i = 0; i < candidates.length; i += 50) {
    const chunk = candidates.slice(i, i + 50);
    const details = await getJson<VideosResponse>(
      `${API}/videos?part=status,contentDetails&id=${chunk
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
    for (const c of chunk) {
      const m = meta.get(c.videoId);
      if (!m || !m.embeddable || m.pub !== "public") continue;
      if (m.duration < bounds.min || m.duration > bounds.max) continue;
      out.push({ ...c, durationSec: m.duration });
    }
  }
  return out;
}

const HIGHLIGHT_BOUNDS = { min: 60, max: 30 * 60 };

async function fetchChannelHighlights(
  key: string,
  channel: YouTubeChannel,
): Promise<YouTubeHighlight[]> {
  const candidates = (await fetchUploads(key, channel.id)).filter((c) =>
    looksLikeHighlight(c.title),
  );
  if (!candidates.length) return [];
  const ok = await enrich(key, candidates, HIGHLIGHT_BOUNDS);
  return ok.map((c) => ({
    videoId: c.videoId,
    title: c.title,
    publishedAt: c.publishedAt,
    thumbnailUrl: pickThumb(c.thumbs, c.videoId),
    competitionLabel: channel.label,
    durationSec: c.durationSec,
    channelTitle: c.channelTitle,
  }));
}

/**
 * Last resort when the day is thin: YouTube search (100 units per query).
 * Restricted to embeddable, medium-length videos from the last 36 hours.
 */
async function searchRecentHighlights(key: string): Promise<YouTubeHighlight[]> {
  const after = new Date(Date.now() - 36 * 3_600_000).toISOString();
  const queries = ["football highlights", "soccer highlights goals"];
  const found: Candidate[] = [];
  for (const q of queries) {
    const res = await getJson<SearchResponse>(
      `${API}/search?part=snippet&type=video&videoEmbeddable=true&videoSyndicated=true&videoDuration=medium&order=date&maxResults=25&publishedAfter=${encodeURIComponent(after)}&q=${encodeURIComponent(q)}&key=${encodeURIComponent(key)}`,
      60 * 60,
    );
    for (const it of res?.items ?? []) {
      const id = it.id?.videoId;
      const title = it.snippet?.title ?? "";
      if (!id || !looksLikeHighlight(title)) continue;
      found.push({
        videoId: id,
        title,
        publishedAt: it.snippet?.publishedAt ?? "",
        channelTitle: it.snippet?.channelTitle,
        thumbs: it.snippet?.thumbnails,
      });
    }
  }
  if (!found.length) return [];
  const ok = await enrich(key, found, HIGHLIGHT_BOUNDS);
  return ok.map((c) => ({
    videoId: c.videoId,
    title: c.title,
    publishedAt: c.publishedAt,
    thumbnailUrl: pickThumb(c.thumbs, c.videoId),
    competitionLabel: c.channelTitle ? `WORLD: ${c.channelTitle}` : "WORLD: Football",
    durationSec: c.durationSec,
    channelTitle: c.channelTitle,
  }));
}

export function hasYouTubeKey(): boolean {
  return Boolean(apiKey());
}

function countFresh(videos: YouTubeHighlight[], hours = 24) {
  const cutoff = Date.now() - hours * 3_600_000;
  return videos.filter((v) => +new Date(v.publishedAt) >= cutoff).length;
}

function dedupe(videos: YouTubeHighlight[]) {
  const seen = new Set<string>();
  const out: YouTubeHighlight[] = [];
  for (const v of videos) {
    if (seen.has(v.videoId)) continue;
    seen.add(v.videoId);
    out.push(v);
  }
  out.sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
  return out;
}

/**
 * Tier-1 channels first. If fewer than MIN_FRESH_PER_DAY clips landed in the
 * last 24h we widen to tier-2 channels, and if it is still thin we search.
 */
export async function fetchYouTubeHighlights(): Promise<
  YouTubeHighlight[]
> {
  const key = apiKey();
  if (!key) return [];

  const tier1 = YOUTUBE_CHANNELS.filter((c) => c.tier === 1);
  let videos = dedupe(
    (
      await Promise.all(tier1.map((c) => fetchChannelHighlights(key, c).catch(() => [])))
    ).flat(),
  );

  if (countFresh(videos) < MIN_FRESH_PER_DAY) {
    const tier2 = YOUTUBE_CHANNELS.filter((c) => c.tier === 2);
    const more = (
      await Promise.all(tier2.map((c) => fetchChannelHighlights(key, c).catch(() => [])))
    ).flat();
    videos = dedupe([...videos, ...more]);
  }

  if (countFresh(videos) < MIN_FRESH_PER_DAY) {
    const searched = await searchRecentHighlights(key).catch(() => []);
    videos = dedupe([...videos, ...searched]);
  }

  return videos;
}

// ---------------------------------------------------------------------------
// Training videos (the Train tab)
// ---------------------------------------------------------------------------

export type TrainingVideo = {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string | null;
  channelTitle: string;
  durationSec: number;
};

export const TRAINING_CHANNELS: { id: string; name: string }[] = [
  { id: "UC0Ik25PHaiHCbfGrzu-lBFQ", name: "AllAttack" },
  { id: "UC9xRcqG8V6yNi6Hum92EoGg", name: "7mlc" },
  { id: "UC5SQGzkWyQSW_fe-URgq7xw", name: "Unisport" },
  { id: "UCFfFE-6nfCHz4uDZ-08o6ng", name: "Become Elite" },
  { id: "UCkZM4O__WAhfWIsuH9BeRHw", name: "Progressive Soccer" },
  { id: "UC5wlBUZsx1r2IsO9-rvON6Q", name: "Joner Football" },
  { id: "UC2nxiSem4cVcNxUqlGf8YVg", name: "Soccer Drills" },
];

const TRAINING_BOUNDS = { min: 90, max: 45 * 60 };

/** Latest coaching videos from trusted training channels (2 units/channel). */
export async function fetchTrainingVideos(): Promise<TrainingVideo[]> {
  const key = apiKey();
  if (!key) return [];
  const per = await Promise.all(
    TRAINING_CHANNELS.map(async (ch) => {
      const cands = (await fetchUploads(key, ch.id, 25)).filter(
        (c) => !/#shorts|\bshorts\b|\bpodcast\b/i.test(c.title),
      );
      const ok = await enrich(key, cands, TRAINING_BOUNDS);
      return ok.map((c) => ({
        videoId: c.videoId,
        title: c.title,
        publishedAt: c.publishedAt,
        thumbnailUrl: pickThumb(c.thumbs, c.videoId),
        channelTitle: ch.name,
        durationSec: c.durationSec,
      }));
    }),
  );
  const seen = new Set<string>();
  return per
    .flat()
    .filter((v) => (seen.has(v.videoId) ? false : (seen.add(v.videoId), true)))
    .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
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
