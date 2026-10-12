import type { SupabaseClient } from "@supabase/supabase-js";
import { loadCallBoard } from "@/lib/call/today";
import { loadFantasyBoard } from "@/lib/fantasy/data";
import { similarity } from "@/lib/football-api/live-scores";
import { listMatches } from "@/lib/matches/data";
import { hasScore } from "@/lib/matches/format";
import type { Match } from "@/lib/matches/types";

export type PunditProfile = {
  username: string;
  supportedTeam: string | null;
  favoritePlayer: string | null;
  favoriteLeague: string | null;
  footballIq: number;
  isPro: boolean;
};

export type PunditContext = {
  profile: PunditProfile | null;
  live: Match[];
  today: Match[];
  upcoming: Match[];
  recent: Match[];
  myTeam: {
    name: string;
    form: Match[];
    next: Match | null;
    live: Match | null;
  } | null;
  callQuestion: string | null;
  fantasy: { teamName: string; total: number; rank: number; picks: string[] } | null;
};

function isTeam(team: string, m: Match) {
  return similarity(team, m.homeTeam) >= 0.9 || similarity(team, m.awayTeam) >= 0.9;
}

function sameDay(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString();
}

export async function buildPunditContext(
  supabase: SupabaseClient,
  userId: string | null,
): Promise<PunditContext> {
  const matches = await listMatches();
  let profile: PunditProfile | null = null;
  let fantasy: PunditContext["fantasy"] = null;
  let callQuestion: string | null = null;

  if (userId) {
    const [{ data }, fb, call] = await Promise.all([
      supabase
        .from("profiles")
        .select("username, supported_team, favorite_player, favorite_league, football_iq, is_pro")
        .eq("id", userId)
        .maybeSingle(),
      loadFantasyBoard(supabase, userId).catch(() => null),
      loadCallBoard(supabase, userId).catch(() => null),
    ]);
    if (data) {
      const d = data as Record<string, unknown>;
      profile = {
        username: String(d.username ?? "fan"),
        supportedTeam: (d.supported_team as string | null) ?? null,
        favoritePlayer: (d.favorite_player as string | null) ?? null,
        favoriteLeague: (d.favorite_league as string | null) ?? null,
        footballIq: Number(d.football_iq ?? 100),
        isPro: Boolean(d.is_pro),
      };
    }
    if (fb?.mine) {
      fantasy = {
        teamName: fb.mine.team_name,
        total: fb.mine.total,
        rank: fb.mine.rank ?? 0,
        picks: (fb.mine.picks ?? [])
          .map((p) => (p as { slug?: string }).slug ?? "")
          .filter(Boolean)
          .map((s) => s.replace(/-/g, " ")),
      };
    }
    callQuestion = call?.call.question ?? null;
  } else {
    const call = await loadCallBoard(supabase, null).catch(() => null);
    callQuestion = call?.call.question ?? null;
  }

  const now = Date.now();
  const live = matches.filter((m) => m.status === "live");
  const today = matches.filter((m) => sameDay(m.kickoffAt));
  const upcoming = matches
    .filter((m) => m.status === "upcoming" && +new Date(m.kickoffAt) > now)
    .sort((a, b) => +new Date(a.kickoffAt) - +new Date(b.kickoffAt))
    .slice(0, 12);
  const recent = matches
    .filter((m) => m.status === "finished" && hasScore(m))
    .sort((a, b) => +new Date(b.kickoffAt) - +new Date(a.kickoffAt))
    .slice(0, 16);

  let myTeam: PunditContext["myTeam"] = null;
  const teamName = profile?.supportedTeam;
  if (teamName) {
    const mine = matches.filter((m) => isTeam(teamName, m));
    myTeam = {
      name: teamName,
      form: mine
        .filter((m) => m.status === "finished" && hasScore(m))
        .sort((a, b) => +new Date(b.kickoffAt) - +new Date(a.kickoffAt))
        .slice(0, 5),
      next:
        mine
          .filter((m) => m.status === "upcoming" && +new Date(m.kickoffAt) > now)
          .sort((a, b) => +new Date(a.kickoffAt) - +new Date(b.kickoffAt))[0] ?? null,
      live: mine.find((m) => m.status === "live") ?? null,
    };
  }

  return { profile, live, today, upcoming, recent, myTeam, callQuestion, fantasy };
}

function line(m: Match) {
  const score = hasScore(m) ? `${m.homeScore}-${m.awayScore}` : "v";
  const when = new Date(m.kickoffAt).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
  const st = m.status === "live" ? `LIVE ${m.minute ? m.minute + "'" : ""}` : m.status === "finished" ? "FT" : when + " UTC";
  return `${m.competitionName}: ${m.homeTeam} ${score} ${m.awayTeam} (${st})`;
}

/** Compact, factual grounding for the model — never let it invent scores. */
export function contextToText(ctx: PunditContext): string {
  const parts: string[] = [];
  parts.push(`Date: ${new Date().toUTCString()}`);
  if (ctx.profile) {
    parts.push(
      `User: @${ctx.profile.username}, supports ${ctx.profile.supportedTeam ?? "no club yet"}, favourite player ${ctx.profile.favoritePlayer ?? "unknown"}, Futbol IQ ${ctx.profile.footballIq}${ctx.profile.isPro ? ", Pro member" : ""}.`,
    );
  }
  if (ctx.myTeam) {
    parts.push(
      `${ctx.myTeam.name} recent results (newest first): ${ctx.myTeam.form.map(line).join("; ") || "none in window"}.`,
    );
    if (ctx.myTeam.live) parts.push(`${ctx.myTeam.name} LIVE NOW: ${line(ctx.myTeam.live)}`);
    if (ctx.myTeam.next) parts.push(`${ctx.myTeam.name} next: ${line(ctx.myTeam.next)}`);
  }
  if (ctx.live.length) parts.push(`Live right now: ${ctx.live.map(line).join("; ")}`);
  if (ctx.today.length) parts.push(`Today's fixtures: ${ctx.today.slice(0, 14).map(line).join("; ")}`);
  if (ctx.upcoming.length) parts.push(`Coming up: ${ctx.upcoming.slice(0, 8).map(line).join("; ")}`);
  if (ctx.recent.length) parts.push(`Recent results: ${ctx.recent.slice(0, 10).map(line).join("; ")}`);
  if (ctx.fantasy) {
    parts.push(
      `User's UCL fantasy team "${ctx.fantasy.teamName}": ${ctx.fantasy.total} pts, rank ${ctx.fantasy.rank}. Picks: ${ctx.fantasy.picks.join(", ") || "none"}.`,
    );
  }
  if (ctx.callQuestion) parts.push(`Today's "The Call" question in the app: ${ctx.callQuestion}`);
  return parts.join("\n");
}
