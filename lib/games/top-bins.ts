import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Top Bins — the daily free kick. Everyone on the planet gets the same wall,
 * the same keeper tendencies and the same wind for 24 hours. Five attempts.
 */

export const TOP_BINS_GAME = "topbins";
export const ATTEMPTS_PER_DAY = 5;
export const MAX_ATTEMPT_SCORE = 160;

export type DailyKick = {
  dayKey: string;
  /** Distance from ball to goal line, metres (18–30) */
  distance: number;
  /** Lateral offset of the ball from goal centre, metres (−9..9) */
  offsetX: number;
  /** Wall: number of players and their lateral centre relative to goal centre */
  wall: { count: number; centerX: number; jumps: boolean };
  /** Keeper: starting bias (−1 left … 1 right), reaction seconds, dive speed m/s */
  keeper: { bias: number; reaction: number; speed: number; reach: number };
  /** Wind: lateral m/s² acting on the ball */
  wind: number;
  /** Flavour text */
  title: string;
  stadium: string;
};

export type AttemptResult =
  | "topbins"
  | "corner"
  | "goal"
  | "post"
  | "saved"
  | "wall"
  | "wide"
  | "over";

export type AttemptLog = { result: AttemptResult; points: number; speed: number };

function mulberry(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function utcDayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

const STADIUMS = [
  "Under the lights at the Bernabéu",
  "Anfield, Kop end",
  "Signal Iduna Park, Yellow Wall behind you",
  "La Bombonera, the stands shaking",
  "Wembley, last minute of the final",
  "San Siro, fog rolling in",
  "Camp Nou, 90+4",
  "Maracanã, Sunday night",
  "The Etihad, rain sideways",
  "Allianz Arena, stoppage time",
];

const TITLES = [
  "The impossible angle",
  "Dead centre, five-man wall",
  "Swing it round the wall",
  "Keeper's cheating left",
  "Wind off the sea",
  "Thirty yards, no fear",
  "Top bins or nothing",
  "The one you've practised",
];

export function dailyKick(dayKey = utcDayKey()): DailyKick {
  const rnd = mulberry(hashStr(`topbins:${dayKey}`));
  const distance = 18 + Math.round(rnd() * 12);
  const offsetX = Math.round((rnd() * 2 - 1) * 9 * 10) / 10;
  const count = 3 + Math.floor(rnd() * 3);
  // Wall covers the near post side of the ball, slightly toward centre
  const centerX = Math.round((offsetX * 0.55 + (rnd() - 0.5) * 2) * 10) / 10;
  const bias = Math.round((rnd() * 2 - 1) * 0.8 * 100) / 100;
  const reaction = 0.22 + rnd() * 0.2;
  const speed = 5.5 + rnd() * 2.5;
  const reach = 2.4 + rnd() * 0.5;
  const wind = Math.round((rnd() * 2 - 1) * 2.4 * 100) / 100;
  return {
    dayKey,
    distance,
    offsetX,
    wall: { count, centerX, jumps: rnd() > 0.35 },
    keeper: { bias, reaction, speed, reach },
    wind,
    title: TITLES[Math.floor(rnd() * TITLES.length)]!,
    stadium: STADIUMS[Math.floor(rnd() * STADIUMS.length)]!,
  };
}

export function pointsFor(result: AttemptResult, speedMs: number, streak: number) {
  const base =
    result === "topbins"
      ? 120
      : result === "corner"
        ? 80
        : result === "goal"
          ? 45
          : result === "post"
            ? 8
            : 0;
  if (!base) return 0;
  const speedBonus = result === "post" ? 0 : Math.round(Math.max(0, speedMs - 22) * 1.2);
  const mult = streak >= 3 ? 1.5 : streak === 2 ? 1.25 : 1;
  return Math.min(MAX_ATTEMPT_SCORE, Math.round((base + speedBonus) * mult));
}

export function resultEmoji(r: AttemptResult) {
  switch (r) {
    case "topbins":
      return "🎯";
    case "corner":
      return "⚽";
    case "goal":
      return "🥅";
    case "post":
      return "🧱";
    case "saved":
      return "🧤";
    case "wall":
      return "🚧";
    default:
      return "❌";
  }
}

export function resultLabel(r: AttemptResult) {
  switch (r) {
    case "topbins":
      return "TOP BINS!";
    case "corner":
      return "In the corner";
    case "goal":
      return "Goal";
    case "post":
      return "Off the post";
    case "saved":
      return "Saved";
    case "wall":
      return "Into the wall";
    case "wide":
      return "Wide";
    default:
      return "Over";
  }
}

export type TopBinsBoard = {
  dayKey: string;
  kick: DailyKick;
  players: number;
  top: { userId: string; username: string; score: number; attempts: AttemptLog[] }[];
  mine: { score: number; rank: number; attempts: AttemptLog[] } | null;
};

export async function loadTopBinsBoard(
  supabase: SupabaseClient,
  userId: string | null,
  dayKey = utcDayKey(),
): Promise<TopBinsBoard> {
  const kick = dailyKick(dayKey);
  const { data, error } = await supabase
    .from("game_scores")
    .select("user_id, score, detail")
    .eq("game", TOP_BINS_GAME)
    .eq("day_key", dayKey)
    .order("score", { ascending: false })
    .limit(200);

  if (error || !data) {
    return { dayKey, kick, players: 0, top: [], mine: null };
  }

  const ids = data.map((r) => r.user_id);
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", ids.slice(0, 200));
    for (const p of profs ?? []) names.set(p.id, p.username);
  }

  const rows = data.map((r) => ({
    userId: r.user_id as string,
    username: names.get(r.user_id) ?? "fan",
    score: r.score as number,
    attempts: Array.isArray((r.detail as { attempts?: AttemptLog[] })?.attempts)
      ? ((r.detail as { attempts: AttemptLog[] }).attempts ?? [])
      : [],
  }));

  const myIdx = userId ? rows.findIndex((r) => r.userId === userId) : -1;
  return {
    dayKey,
    kick,
    players: rows.length,
    top: rows.slice(0, 10),
    mine: myIdx >= 0 ? { score: rows[myIdx]!.score, rank: myIdx + 1, attempts: rows[myIdx]!.attempts } : null,
  };
}
