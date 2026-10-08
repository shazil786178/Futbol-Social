import type { CompetitionId } from "@/lib/matches/types";

export type ScoreBatVideo = {
  id: string;
  title: string;
  embed: string;
};

export type ScoreBatMatch = {
  title: string;
  competition: string;
  matchviewUrl?: string;
  competitionUrl?: string;
  thumbnail: string;
  date: string;
  videos: ScoreBatVideo[];
};

export type SyncedHighlight = {
  externalId: string;
  matchId: string | null;
  stubMatch: {
    id: string;
    competitionId: CompetitionId;
    homeTeam: string;
    awayTeam: string;
    kickoffAt: string;
  } | null;
  title: string;
  competitionLabel: string;
  thumbnailUrl: string | null;
  embedHtml: string;
  embedUrl: string | null;
  videoTitle: string;
  sortOrder: number;
};

function extractEmbedUrl(embed: string): string | null {
  const m = embed.match(/src=['"]([^'"]+)['"]/i);
  if (!m?.[1]) return null;
  try {
    const url = new URL(m[1]);
    // Prefer autoplay when the slide is focused; keep publisher quality
    url.searchParams.set("autoplay", "1");
    return url.toString();
  } catch {
    return m[1];
  }
}

function slugPart(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 28);
}

export function parseScoreBatTitle(title: string): {
  homeTeam: string;
  awayTeam: string;
} {
  const parts = title.split(/\s+-\s+/);
  if (parts.length >= 2) {
    return {
      homeTeam: parts[0]!.trim(),
      awayTeam: parts.slice(1).join(" - ").trim(),
    };
  }
  return { homeTeam: title.trim(), awayTeam: "TBD" };
}

export function mapCompetition(label: string): CompetitionId {
  const u = label.toUpperCase();
  if (u.includes("PREMIER") || u.includes("ENGLAND:")) return "epl";
  if (u.includes("LA LIGA") || u.includes("SPAIN:")) return "laliga";
  if (u.includes("BUNDESLIGA") || u.includes("GERMANY:")) return "bundesliga";
  if (
    u.includes("CHAMPIONS") ||
    u.includes("UEFA") ||
    u.includes("EUROPA") ||
    u.includes("CONFERENCE")
  ) {
    return "ucl";
  }
  if (u.includes("MLS") || u.includes("MAJOR LEAGUE")) return "mls";
  return "friendlies";
}

/** Prefer top leagues we care about for the Clips feed. */
export function competitionPriority(label: string): number {
  const id = mapCompetition(label);
  const order: CompetitionId[] = [
    "epl",
    "laliga",
    "bundesliga",
    "ucl",
    "mls",
    "friendlies",
  ];
  return order.indexOf(id);
}

function normalizeTeam(name: string) {
  return name
    .toLowerCase()
    .replace(/\b(fc|cf|sc|afc|united|city|hotspur)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function teamsLikelyMatch(
  aHome: string,
  aAway: string,
  bHome: string,
  bAway: string,
): boolean {
  const ah = normalizeTeam(aHome);
  const aa = normalizeTeam(aAway);
  const bh = normalizeTeam(bHome);
  const ba = normalizeTeam(bAway);
  if (!ah || !aa || !bh || !ba) return false;
  const sameWay =
    (ah.includes(bh) || bh.includes(ah)) &&
    (aa.includes(ba) || ba.includes(aa));
  const swapped =
    (ah.includes(ba) || ba.includes(ah)) &&
    (aa.includes(bh) || bh.includes(aa));
  return sameWay || swapped;
}

async function fetchJson(url: string): Promise<ScoreBatMatch[] | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 0 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as
      | ScoreBatMatch[]
      | { response?: ScoreBatMatch[] };
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.response)) return data.response;
    return null;
  } catch {
    return null;
  }
}

/**
 * Official, embeddable match highlights via ScoreBat.
 * Set SCOREBAT_API_TOKEN for the live free/featured feed; falls back to public v3.
 */
export async function fetchScoreBatHighlights(): Promise<ScoreBatMatch[]> {
  const token = process.env.SCOREBAT_API_TOKEN?.trim();
  const urls: string[] = [];

  if (token) {
    urls.push(
      `https://www.scorebat.com/video-api/v3/feed/?token=${encodeURIComponent(token)}`,
      `https://www.scorebat.com/video-api/v3/free-feed/?token=${encodeURIComponent(token)}`,
    );
  }
  // Public (legacy) feed — real league highlights, embeddable from official sources
  urls.push("https://www.scorebat.com/video-api/v3/");

  for (const url of urls) {
    const rows = await fetchJson(url);
    if (rows && rows.length > 0) {
      return rows
        .filter((r) => r.videos?.length)
        .sort(
          (a, b) =>
            competitionPriority(a.competition) -
              competitionPriority(b.competition) ||
            +new Date(b.date) - +new Date(a.date),
        );
    }
  }

  return [];
}

export function flattenScoreBatHighlights(
  matches: ScoreBatMatch[],
  localMatches: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    kickoffAt: string;
  }[],
): SyncedHighlight[] {
  const out: SyncedHighlight[] = [];
  let sort = 0;

  for (const m of matches) {
    const { homeTeam, awayTeam } = parseScoreBatTitle(m.title);
    const day = m.date.slice(0, 10);
    const competitionId = mapCompetition(m.competition);

    const linked =
      localMatches.find((lm) => {
        const sameDay =
          Math.abs(+new Date(lm.kickoffAt) - +new Date(m.date)) <
          1000 * 60 * 60 * 36;
        return (
          sameDay &&
          teamsLikelyMatch(lm.homeTeam, lm.awayTeam, homeTeam, awayTeam)
        );
      }) ?? null;

    const stubId = `sb-${slugPart(homeTeam)}-${slugPart(awayTeam)}-${day}`;

    for (const video of m.videos) {
      const embedUrl = extractEmbedUrl(video.embed);
      const externalId = `scorebat-${video.id || `${stubId}-${sort}`}`;
      out.push({
        externalId,
        matchId: linked?.id ?? stubId,
        stubMatch: linked
          ? null
          : {
              id: stubId,
              competitionId,
              homeTeam,
              awayTeam,
              kickoffAt: m.date,
            },
        title: `${m.title} · ${video.title}`,
        competitionLabel: m.competition,
        thumbnailUrl: m.thumbnail || null,
        embedHtml: video.embed,
        embedUrl,
        videoTitle: video.title,
        sortOrder: sort++,
      });
    }
  }

  // Prefer extended / longer official packages first (usually sharper cuts)
  out.sort((a, b) => {
    const score = (t: string) => {
      const u = t.toLowerCase();
      if (u.includes("extended")) return 0;
      if (u.includes("highlight")) return 1;
      if (u.includes("goal")) return 2;
      return 3;
    };
    return score(a.videoTitle) - score(b.videoTitle) || a.sortOrder - b.sortOrder;
  });

  return out;
}
