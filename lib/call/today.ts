import type { SupabaseClient } from "@supabase/supabase-js";
import { loadClipReel } from "@/lib/clips/load-reel";
import { listMatches } from "@/lib/matches/data";
import type { Match } from "@/lib/matches/types";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";

export type CallChoice = "a" | "b";

export type DailyCall = {
  id: string;
  dayKey: string;
  question: string;
  optionA: string;
  optionB: string;
  matchId: string | null;
  clipEmbedUrl: string | null;
  clipTitle: string | null;
  closesAt: string;
  persisted: boolean;
};

export type CallBoard = {
  call: DailyCall;
  votesA: number;
  votesB: number;
  myChoice: CallChoice | null;
  closed: boolean;
  secondsLeft: number;
};

export function utcDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function endOfUtcDay(dayKey: string): string {
  return new Date(`${dayKey}T23:59:59.000Z`).toISOString();
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickMatch(matches: Match[], dayKey: string): Match | null {
  const live = matches.filter((m) => m.status === "live");
  if (live[0]) return live[0];

  const today = matches
    .filter((m) => m.kickoffAt.slice(0, 10) === dayKey)
    .sort((a, b) => +new Date(a.kickoffAt) - +new Date(b.kickoffAt));
  const upcomingToday = today.filter((m) => m.status === "upcoming");
  if (upcomingToday[0]) return upcomingToday[0];
  if (today[0]) return today[0];

  const upcoming = matches
    .filter((m) => m.status === "upcoming")
    .sort((a, b) => +new Date(a.kickoffAt) - +new Date(b.kickoffAt));
  if (upcoming[0]) return upcoming[0];

  const finished = matches
    .filter((m) => m.status === "finished")
    .sort((a, b) => +new Date(b.kickoffAt) - +new Date(a.kickoffAt));
  if (!finished.length) return null;
  return finished[hash(dayKey) % finished.length] ?? finished[0];
}

function composeQuestion(match: Match, dayKey: string): {
  question: string;
  optionA: string;
  optionB: string;
} {
  if (match.status === "live") {
    return {
      question: `Who is taking ${match.homeTeam} vs ${match.awayTeam} right now?`,
      optionA: match.homeTeam,
      optionB: match.awayTeam,
    };
  }
  if (match.status === "upcoming") {
    const templates = [
      `Who wins ${match.homeTeam} vs ${match.awayTeam}?`,
      `If you had to live with one result tonight — who are you on?`,
      `Main character of ${match.homeTeam} vs ${match.awayTeam}?`,
    ];
    return {
      question: templates[hash(dayKey) % templates.length]!,
      optionA: match.homeTeam,
      optionB: match.awayTeam,
    };
  }
  return {
    question: `Who was better over 90 minutes — ${match.homeTeam} vs ${match.awayTeam}?`,
    optionA: match.homeTeam,
    optionB: match.awayTeam,
  };
}

async function generateCall(dayKey: string): Promise<DailyCall> {
  const [matches, clips] = await Promise.all([
    listMatches(),
    loadClipReel().catch(() => []),
  ]);
  const match = pickMatch(matches, dayKey);
  const clip =
    clips.find((c) => match && c.matchId === match.id && c.embedUrl) ??
    clips.find((c) => c.embedUrl) ??
    null;

  if (!match) {
    return {
      id: `local-${dayKey}`,
      dayKey,
      question: "Who is the main character in world football today?",
      optionA: "The forwards",
      optionB: "The keepers",
      matchId: null,
      clipEmbedUrl: clip?.embedUrl ?? null,
      clipTitle: clip?.title ?? null,
      closesAt: endOfUtcDay(dayKey),
      persisted: false,
    };
  }

  const q = composeQuestion(match, dayKey);
  return {
    id: `local-${dayKey}`,
    dayKey,
    question: q.question,
    optionA: q.optionA,
    optionB: q.optionB,
    matchId: match.id,
    clipEmbedUrl: clip?.embedUrl ?? null,
    clipTitle: clip?.title ?? null,
    closesAt: endOfUtcDay(dayKey),
    persisted: false,
  };
}

function mapRow(row: {
  id: string;
  day_key: string;
  question: string;
  option_a: string;
  option_b: string;
  match_id: string | null;
  clip_embed_url: string | null;
  clip_title: string | null;
  closes_at: string;
}): DailyCall {
  return {
    id: row.id,
    dayKey: String(row.day_key).slice(0, 10),
    question: row.question,
    optionA: row.option_a,
    optionB: row.option_b,
    matchId: row.match_id,
    clipEmbedUrl: row.clip_embed_url,
    clipTitle: row.clip_title,
    closesAt: row.closes_at,
    persisted: true,
  };
}

let mem: { dayKey: string; call: DailyCall; at: number } | null = null;

export async function ensureTodayCall(
  supabase?: SupabaseClient,
): Promise<DailyCall> {
  const dayKey = utcDayKey();
  if (mem && mem.dayKey === dayKey && Date.now() - mem.at < 60_000) {
    return mem.call;
  }
  const fromDb = supabase
    ? await supabase
        .from("daily_calls")
        .select(
          "id, day_key, question, option_a, option_b, match_id, clip_embed_url, clip_title, closes_at",
        )
        .eq("day_key", dayKey)
        .maybeSingle()
    : { data: null, error: null };

  if (fromDb.data && !fromDb.error) {
    const mapped = mapRow(fromDb.data);
    mem = { dayKey, call: mapped, at: Date.now() };
    return mapped;
  }

  const generated = await generateCall(dayKey);
  if (!hasAdminClient()) {
    mem = { dayKey, call: generated, at: Date.now() };
    return generated;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("daily_calls")
    .upsert(
      {
        day_key: dayKey,
        question: generated.question,
        option_a: generated.optionA,
        option_b: generated.optionB,
        match_id: generated.matchId,
        clip_embed_url: generated.clipEmbedUrl,
        clip_title: generated.clipTitle,
        closes_at: generated.closesAt,
      },
      { onConflict: "day_key" },
    )
    .select(
      "id, day_key, question, option_a, option_b, match_id, clip_embed_url, clip_title, closes_at",
    )
    .maybeSingle();

  const mapped = error || !data ? generated : mapRow(data);
  mem = { dayKey, call: mapped, at: Date.now() };
  return mapped;
}

export async function loadCallBoard(
  supabase: SupabaseClient,
  userId: string | null,
): Promise<CallBoard> {
  const call = await ensureTodayCall(supabase);
  const now = Date.now();
  const closes = +new Date(call.closesAt);
  const closed = now >= closes;

  let votesA = 0;
  let votesB = 0;
  let myChoice: CallChoice | null = null;

  if (call.persisted) {
    const { data: votes } = await supabase
      .from("daily_call_votes")
      .select("choice, user_id")
      .eq("call_id", call.id);
    for (const v of votes ?? []) {
      if (v.choice === "a") votesA += 1;
      if (v.choice === "b") votesB += 1;
      if (userId && v.user_id === userId) myChoice = v.choice as CallChoice;
    }
  }

  return {
    call,
    votesA,
    votesB,
    myChoice,
    closed,
    secondsLeft: Math.max(0, Math.floor((closes - now) / 1000)),
  };
}
