import type { ClipReelItem } from "@/components/clips/clips-reel";
import { similarity } from "@/lib/football-api/live-scores";
import { isYouTubeEmbed } from "@/lib/football-api/scorebat";
import type { Highlight, Match } from "@/lib/matches/types";
import type { ClipStats, ViewerContext } from "@/lib/clips/social";
import { EMPTY_VIEWER } from "@/lib/clips/social";

const ACCENTS: ClipReelItem["accent"][] = ["sky", "beige", "live"];

export type ReelTab = "fyp" | "following" | "friends";

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

function isOfficial(h: Highlight, embed: string | null) {
  return (
    h.source === "youtube" ||
    h.source === "scorebat" ||
    isYouTubeEmbed(embed) ||
    isScoreBatEmbed(embed)
  );
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/** Does this clip involve one of the viewer's teams? */
export function mentionsTeam(
  h: Highlight,
  match: Match | undefined,
  teams: string[],
): boolean {
  if (!teams.length) return false;
  const hay = [
    h.title,
    h.caption ?? "",
    ...(h.teamTags ?? []),
    match?.homeTeam ?? "",
    match?.awayTeam ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return teams.some((t) => {
    const lt = t.toLowerCase();
    if (hay.includes(lt)) return true;
    if (match && (similarity(t, match.homeTeam) >= 0.8 || similarity(t, match.awayTeam) >= 0.8)) {
      return true;
    }
    // Loose: first distinctive token ("Arsenal", "Bayern", "Inter")
    const token = lt.split(/\s+/).find((w) => w.length > 3 && !["real", "manchester", "athletic", "club", "united", "city"].includes(w));
    return token ? hay.includes(token) : false;
  });
}

/**
 * The For You score. Everything is additive so it is easy to reason about:
 * freshness, real engagement, taste (teams/league), friends, exploration for
 * brand-new fan uploads, and a penalty for things already watched.
 */
export function scoreClip(
  h: Highlight,
  match: Match | undefined,
  stats: ClipStats | undefined,
  ctx: ViewerContext,
  now: number,
): number {
  const embed = h.embedUrl || (isPlayerEmbed(h.videoUrl) ? h.videoUrl : null);
  const official = isOfficial(h, embed);
  const ageH = h.happenedAt
    ? Math.max(0, (now - +new Date(h.happenedAt)) / 3_600_000)
    : 24 * 14;

  let s = 0;
  // Freshness: today's clips dominate, two weeks later they are background noise
  s += 40 * Math.exp(-ageH / 36);
  // Engagement
  const likes = stats?.likes ?? 0;
  const views = stats?.views ?? 0;
  const completes = stats?.completes ?? 0;
  s += Math.log1p(likes) * 6 + Math.log1p(views) * 2;
  if (views >= 3) s += (completes / views) * 15;
  // Taste
  const teams = [ctx.supportedTeam ?? "", ...ctx.followedTeams].filter(Boolean);
  if (mentionsTeam(h, match, teams)) s += 25;
  if (ctx.favoriteLeague && match?.competitionId === ctx.favoriteLeague) s += 10;
  // Friends
  if (h.userId && ctx.friendIds.has(h.userId)) s += 20;
  // Source quality + exploration for new fan uploads
  if (official) s += 8;
  if (h.userId && ageH < 48) s += 12;
  // Already seen
  const seen = ctx.seen.get(h.id);
  if (seen === true) s -= 60;
  else if (seen === false) s -= 30;
  if (ctx.likedKeys.has(h.id)) s -= 10;
  // Per-user, per-day jitter so the feed is not identical for everyone
  const dayKey = new Date(now).toISOString().slice(0, 10);
  s += hash(`${ctx.userId ?? "anon"}:${h.id}:${dayKey}`) * 6;
  return s;
}

/** Avoid three-in-a-row from the same competition / uploader. */
function diversify(items: { h: Highlight; m: Match | undefined; s: number }[]) {
  const out: typeof items = [];
  const pool = [...items];
  while (pool.length) {
    let idx = 0;
    const last = out.slice(-2).map((o) => o.h.competitionLabel ?? o.h.userId ?? "");
    if (last.length === 2 && last[0] === last[1]) {
      const alt = pool.findIndex(
        (p) => (p.h.competitionLabel ?? p.h.userId ?? "") !== last[0],
      );
      if (alt > 0) idx = alt;
    }
    out.push(pool.splice(idx, 1)[0]!);
  }
  return out;
}

export function buildClipReel(
  highlights: Highlight[],
  matches: Match[],
  opts: {
    tab?: ReelTab;
    ctx?: ViewerContext;
    stats?: Map<string, ClipStats>;
    uploaderNames?: Map<string, string>;
    limit?: number;
  } = {},
): ClipReelItem[] {
  const tab = opts.tab ?? "fyp";
  const ctx = opts.ctx ?? EMPTY_VIEWER;
  const stats = opts.stats ?? new Map<string, ClipStats>();
  const names = opts.uploaderNames ?? new Map<string, string>();
  const byId = new Map(matches.map((m) => [m.id, m]));
  const now = Date.now();

  let playable = highlights.filter((h) => Boolean(h.embedUrl || h.videoUrl));

  if (tab === "following") {
    const teams = [ctx.supportedTeam ?? "", ...ctx.followedTeams].filter(Boolean);
    playable = playable.filter((h) =>
      mentionsTeam(h, h.matchId ? byId.get(h.matchId) : undefined, teams),
    );
  } else if (tab === "friends") {
    playable = playable.filter(
      (h) => h.userId && (ctx.friendIds.has(h.userId) || h.userId === ctx.userId),
    );
  }

  const scored = playable.map((h) => {
    const m = h.matchId ? byId.get(h.matchId) : undefined;
    return { h, m, s: scoreClip(h, m, stats.get(h.id), ctx, now) };
  });
  scored.sort((a, b) => b.s - a.s);

  // Keep the pool recent for the main feed; following/friends show everything
  let pool = scored;
  if (tab === "fyp") {
    const newest = scored.reduce(
      (acc, x) => Math.max(acc, x.h.happenedAt ? +new Date(x.h.happenedAt) : 0),
      0,
    );
    const fresh = scored.filter((x) => {
      if (!x.h.happenedAt) return true;
      return newest - +new Date(x.h.happenedAt) < 12 * 86_400_000;
    });
    pool = fresh.length >= 6 ? fresh : scored;
  }

  return diversify(pool)
    .slice(0, opts.limit ?? 48)
    .map(({ h, m }, i) => {
      const embedUrl = h.embedUrl || (isPlayerEmbed(h.videoUrl) ? h.videoUrl : null);
      const fileUrl = h.videoUrl && !isPlayerEmbed(h.videoUrl) ? h.videoUrl : null;
      const st = stats.get(h.id);
      const official = isOfficial(h, embedUrl) || (!h.userId && Boolean(embedUrl));
      return {
        id: h.id,
        title: h.title,
        duration: h.duration || "HL",
        thumbnailLabel: h.thumbnailLabel || "HL",
        videoUrl: fileUrl,
        embedUrl,
        thumbnailUrl: h.thumbnailUrl,
        matchId: h.matchId ?? m?.id ?? "matches",
        matchLabel: matchLabel(m, h),
        author: official ? "official" : (h.userId && names.get(h.userId)) || "fan",
        uploaderId: h.userId ?? null,
        likes: st?.likes ?? 0,
        views: st?.views ?? 0,
        liked: ctx.likedKeys.has(h.id),
        accent: ACCENTS[i % ACCENTS.length]!,
        competitionLabel: h.competitionLabel,
        happenedAt: h.happenedAt ?? null,
        caption: h.caption ?? null,
      };
    });
}
