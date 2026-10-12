import type { SupabaseClient } from "@supabase/supabase-js";

export type DailyMissionId =
  | "predict"
  | "chat"
  | "clip"
  | "react"
  | "call"
  | "game";

export type DayProgress = Partial<Record<DailyMissionId, boolean>>;

export type DailyState = {
  streakCount: number;
  streakBest: number;
  lastActiveDate: string | null;
  todayKey: string;
  progress: DayProgress;
  completedToday: number;
  totalMissions: number;
  missions: {
    id: DailyMissionId;
    label: string;
    hint: string;
    href: string;
    done: boolean;
  }[];
};

const MISSIONS: {
  id: DailyMissionId;
  label: string;
  hint: string;
  href: string;
}[] = [
  {
    id: "game",
    label: "Take today's touch",
    hint: "The Pitch · one ball, the whole planet",
    href: "/pitch",
  },
  {
    id: "call",
    label: "Make The Call",
    hint: "One tap. The planet's split.",
    href: "/call",
  },
  {
    id: "predict",
    label: "Lock a score",
    hint: "Pick any upcoming match",
    href: "/predictor",
  },
  {
    id: "chat",
    label: "Talk in a match room",
    hint: "One message keeps you in it",
    href: "/matches",
  },
  {
    id: "clip",
    label: "Watch clips",
    hint: "Swipe at least one",
    href: "/clips",
  },
  {
    id: "react",
    label: "Post a take",
    hint: "Reaction or opinion",
    href: "/matches",
  },
];

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function yesterdayKey(d = new Date()): string {
  const y = new Date(d);
  y.setDate(y.getDate() - 1);
  return todayKey(y);
}

function parseProgress(raw: unknown, key: string): DayProgress {
  if (!raw || typeof raw !== "object") return {};
  const map = raw as Record<string, DayProgress>;
  return { ...(map[key] ?? {}) };
}

export function buildDailyState(input: {
  streakCount: number;
  streakBest: number;
  lastActiveDate: string | null;
  dailyProgress: unknown;
}): DailyState {
  const key = todayKey();
  const progress = parseProgress(input.dailyProgress, key);
  const missions = MISSIONS.map((m) => ({
    ...m,
    done: Boolean(progress[m.id]),
  }));

  return {
    streakCount: input.streakCount,
    streakBest: input.streakBest,
    lastActiveDate: input.lastActiveDate,
    todayKey: key,
    progress,
    completedToday: missions.filter((m) => m.done).length,
    totalMissions: missions.length,
    missions,
  };
}

export async function getDailyState(
  supabase: SupabaseClient,
  userId: string,
): Promise<DailyState | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("streak_count, streak_best, last_active_date, daily_progress")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return buildDailyState({
      streakCount: 0,
      streakBest: 0,
      lastActiveDate: null,
      dailyProgress: {},
    });
  }

  return buildDailyState({
    streakCount: data.streak_count ?? 0,
    streakBest: data.streak_best ?? 0,
    lastActiveDate: data.last_active_date ?? null,
    dailyProgress: data.daily_progress,
  });
}

/** Mark a mission + update streak on first activity of the calendar day. */
export async function recordDailyActivity(
  supabase: SupabaseClient,
  userId: string,
  mission: DailyMissionId,
): Promise<DailyState | null> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("streak_count, streak_best, last_active_date, daily_progress")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) {
    // Migration 012 not applied — fail quietly
    return null;
  }

  const key = todayKey();
  const yKey = yesterdayKey();
  const allProgress =
    profile.daily_progress && typeof profile.daily_progress === "object"
      ? { ...(profile.daily_progress as Record<string, DayProgress>) }
      : {};

  const day: DayProgress = { ...(allProgress[key] ?? {}) };
  day[mission] = true;
  allProgress[key] = day;

  const keys = Object.keys(allProgress).sort();
  while (keys.length > 14) {
    const drop = keys.shift();
    if (drop) delete allProgress[drop];
  }

  const last = profile.last_active_date as string | null;
  let streakCount = profile.streak_count ?? 0;

  if (last !== key) {
    if (last === yKey) {
      streakCount = Math.max(1, streakCount) + 1;
    } else {
      streakCount = 1;
    }
  }

  const streakBest = Math.max(profile.streak_best ?? 0, streakCount);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      streak_count: streakCount,
      streak_best: streakBest,
      last_active_date: key,
      daily_progress: allProgress,
    })
    .eq("id", userId);

  if (updateError) {
    console.error("recordDailyActivity:", updateError.message);
    return null;
  }

  return buildDailyState({
    streakCount,
    streakBest,
    lastActiveDate: key,
    dailyProgress: allProgress,
  });
}
