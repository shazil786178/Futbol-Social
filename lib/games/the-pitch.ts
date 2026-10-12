import type { SupabaseClient } from "@supabase/supabase-js";

/** FIFA pitch, metres. Mint attacks +x (right). Gold attacks −x (left). */
export const PITCH_W = 105;
export const PITCH_H = 68;
export const GOAL_HALF = 3.66;
export const MAX_SPEED = 34;
export const FRICTION = 0.982;
export const DT = 0.05;

export type Shirt = "mint" | "gold";
export type TouchResult = "roll" | "goal-mint" | "goal-gold";

export type PitchPoint = { x: number; y: number };

export type PitchState = {
  ball: PitchPoint;
  mintScore: number;
  goldScore: number;
  moveNumber: number;
  lastTouchAt: string | null;
  lastTouchUser: string | null;
  lastGoalAt: string | null;
  lastGoalSide: Shirt | null;
};

export type PitchTouch = {
  id: string;
  userId: string;
  username: string;
  side: Shirt;
  from: PitchPoint;
  to: PitchPoint;
  result: TouchResult;
  moveNumber: number;
  createdAt: string;
};

export type PitchBoard = {
  state: PitchState;
  recent: PitchTouch[];
  players: number;
  mySide: Shirt | null;
  myTouchToday: boolean;
  touchesToday: number;
  touchLimit: number;
  dayKey: string;
  persisted: boolean;
};

export function utcDayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export function kickoffState(): PitchState {
  return {
    ball: { x: PITCH_W / 2, y: PITCH_H / 2 },
    mintScore: 0,
    goldScore: 0,
    moveNumber: 0,
    lastTouchAt: null,
    lastTouchUser: null,
    lastGoalAt: null,
    lastGoalSide: null,
  };
}

function inGoalMouth(y: number) {
  const mid = PITCH_H / 2;
  return y >= mid - GOAL_HALF && y <= mid + GOAL_HALF;
}

/** Same physics the client preview uses — keep them identical. */
export function simulateKick(
  from: PitchPoint,
  angle: number,
  power: number,
): { path: PitchPoint[]; end: PitchPoint; result: TouchResult } {
  const pwr = Math.min(1, Math.max(0.08, power));
  let vx = Math.cos(angle) * pwr * MAX_SPEED;
  let vy = Math.sin(angle) * pwr * MAX_SPEED;
  let x = from.x;
  let y = from.y;
  const path: PitchPoint[] = [{ x, y }];

  for (let i = 0; i < 480; i++) {
    x += vx * DT;
    y += vy * DT;
    vx *= FRICTION;
    vy *= FRICTION;

    if (y < 0) {
      y = 0;
      vy *= -0.52;
    } else if (y > PITCH_H) {
      y = PITCH_H;
      vy *= -0.52;
    }

    if (x <= 0) {
      if (inGoalMouth(y) && vx < 0) {
        path.push({ x: 0, y });
        return { path, end: { x: 0, y }, result: "goal-gold" };
      }
      x = 0;
      vx *= -0.42;
    } else if (x >= PITCH_W) {
      if (inGoalMouth(y) && vx > 0) {
        path.push({ x: PITCH_W, y });
        return { path, end: { x: PITCH_W, y }, result: "goal-mint" };
      }
      x = PITCH_W;
      vx *= -0.42;
    }

    path.push({ x, y });
    if (Math.hypot(vx, vy) < 0.38) break;
  }
  return { path, end: { x, y }, result: "roll" };
}

function applyResult(state: PitchState, end: PitchPoint, result: TouchResult, userId: string): PitchState {
  const now = new Date().toISOString();
  if (result === "goal-mint" || result === "goal-gold") {
    const side: Shirt = result === "goal-mint" ? "mint" : "gold";
    return {
      ...state,
      ball: { x: PITCH_W / 2, y: PITCH_H / 2 },
      mintScore: state.mintScore + (side === "mint" ? 1 : 0),
      goldScore: state.goldScore + (side === "gold" ? 1 : 0),
      moveNumber: state.moveNumber + 1,
      lastTouchAt: now,
      lastTouchUser: userId,
      lastGoalAt: now,
      lastGoalSide: side,
    };
  }
  return {
    ...state,
    ball: end,
    moveNumber: state.moveNumber + 1,
    lastTouchAt: now,
    lastTouchUser: userId,
  };
}

/** Local fallback so the street still plays before migration 018 is applied. */
const memory: { state: PitchState; shirts: Map<string, Shirt>; days: Map<string, number> } = {
  state: kickoffState(),
  shirts: new Map(),
  days: new Map(),
};

function mapState(row: {
  ball_x: number;
  ball_y: number;
  mint_score: number;
  gold_score: number;
  move_number: number;
  last_touch_at: string | null;
  last_touch_user: string | null;
  last_goal_at: string | null;
  last_goal_side: string | null;
}): PitchState {
  return {
    ball: { x: Number(row.ball_x), y: Number(row.ball_y) },
    mintScore: row.mint_score,
    goldScore: row.gold_score,
    moveNumber: row.move_number,
    lastTouchAt: row.last_touch_at,
    lastTouchUser: row.last_touch_user,
    lastGoalAt: row.last_goal_at,
    lastGoalSide: row.last_goal_side === "mint" || row.last_goal_side === "gold" ? row.last_goal_side : null,
  };
}

export async function loadPitchBoard(
  supabase: SupabaseClient,
  userId: string | null,
): Promise<PitchBoard> {
  const dayKey = utcDayKey();
  const empty: PitchBoard = {
    state: kickoffState(),
    recent: [],
    players: 0,
    mySide: null,
    myTouchToday: false,
    touchesToday: 0,
    touchLimit: 1,
    dayKey,
    persisted: false,
  };

  const stateRes = await supabase
    .from("pitch_state")
    .select("ball_x, ball_y, mint_score, gold_score, move_number, last_touch_at, last_touch_user, last_goal_at, last_goal_side")
    .eq("id", "earth")
    .maybeSingle();

  if (stateRes.error || !stateRes.data) {
    return {
      ...empty,
      state: memory.state,
      mySide: userId ? memory.shirts.get(userId) ?? null : null,
      touchesToday: userId ? memory.days.get(`${userId}:${dayKey}`) ?? 0 : 0,
      myTouchToday: userId ? (memory.days.get(`${userId}:${dayKey}`) ?? 0) >= 1 : false,
    };
  }

  const [touchesRes, shirtsCount, myShirt, myTouches, proRes] = await Promise.all([
    supabase
      .from("pitch_touches")
      .select("id, user_id, side, from_x, from_y, to_x, to_y, result, move_number, created_at")
      .order("created_at", { ascending: false })
      .limit(16),
    supabase.from("pitch_shirts").select("user_id", { count: "exact", head: true }),
    userId
      ? supabase.from("pitch_shirts").select("side").eq("user_id", userId).maybeSingle()
      : Promise.resolve({ data: null }),
    userId
      ? supabase
          .from("pitch_touches")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("day_key", dayKey)
      : Promise.resolve({ count: 0 }),
    userId
      ? supabase.from("profiles").select("is_pro").eq("id", userId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const rows = touchesRes.data ?? [];
  const touchLimit = proRes.data && "is_pro" in proRes.data && proRes.data.is_pro ? 2 : 1;
  const ids = rows.map((r) => r.user_id as string);
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: profs } = await supabase.from("profiles").select("id, username").in("id", ids);
    for (const p of profs ?? []) names.set(p.id, p.username);
  }

  return {
    state: mapState(stateRes.data),
    recent: rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      username: names.get(r.user_id) ?? "fan",
      side: r.side as Shirt,
      from: { x: Number(r.from_x), y: Number(r.from_y) },
      to: { x: Number(r.to_x), y: Number(r.to_y) },
      result: r.result as TouchResult,
      moveNumber: r.move_number,
      createdAt: r.created_at,
    })),
    players: shirtsCount.count ?? 0,
    mySide: myShirt.data?.side === "gold" ? "gold" : myShirt.data?.side === "mint" ? "mint" : null,
    myTouchToday: (myTouches.count ?? 0) >= touchLimit,
    touchesToday: myTouches.count ?? 0,
    touchLimit,
    dayKey,
    persisted: true,
  };
}

export type KickOutcome = {
  board: PitchBoard;
  path: PitchPoint[];
  result: TouchResult;
  error?: string;
};

export async function applyTouch(
  supabase: SupabaseClient,
  userId: string,
  side: Shirt,
  angle: number,
  power: number,
): Promise<KickOutcome> {
  const board = await loadPitchBoard(supabase, userId);
  if (!board.persisted) {
    const key = `${userId}:${board.dayKey}`;
    const used = memory.days.get(key) ?? 0;
    if (used >= 1) {
      return { board, path: [], result: "roll", error: "You already took today's touch (local street — run 018 to join Earth)." };
    }
    const from = memory.state.ball;
    const sim = simulateKick(from, angle, power);
    memory.state = applyResult(memory.state, sim.end, sim.result, userId);
    memory.shirts.set(userId, side);
    memory.days.set(key, used + 1);
    return {
      board: {
        ...board,
        state: memory.state,
        mySide: side,
        myTouchToday: true,
        touchesToday: 1,
        recent: [
          {
            id: `mem-${Date.now()}`,
            userId,
            username: "you",
            side,
            from,
            to: sim.end,
            result: sim.result,
            moveNumber: memory.state.moveNumber,
            createdAt: new Date().toISOString(),
          },
          ...board.recent,
        ],
      },
      path: sim.path,
      result: sim.result,
    };
  }
  if (board.myTouchToday) {
    return {
      board,
      path: [],
      result: "roll",
      error:
        board.touchLimit > 1
          ? "Both of today's touches are spent. The ball waits for you tomorrow."
          : "You already took today's touch. The ball waits for you tomorrow.",
    };
  }

  const from = board.state.ball;
  const { path, end, result } = simulateKick(from, angle, power);
  const next = applyResult(board.state, end, result, userId);

  const { data: updated, error: upErr } = await supabase
    .from("pitch_state")
    .update({
      ball_x: next.ball.x,
      ball_y: next.ball.y,
      mint_score: next.mintScore,
      gold_score: next.goldScore,
      move_number: next.moveNumber,
      last_touch_at: next.lastTouchAt,
      last_touch_user: next.lastTouchUser,
      last_goal_at: next.lastGoalAt,
      last_goal_side: next.lastGoalSide,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "earth")
    .eq("move_number", board.state.moveNumber)
    .select("move_number")
    .maybeSingle();

  if (upErr) {
    return { board, path, result, error: upErr.message };
  }
  if (!updated) {
    const fresh = await loadPitchBoard(supabase, userId);
    return { board: fresh, path: [], result: "roll", error: "Someone else just kicked. The ball moved — swipe again." };
  }

  await supabase.from("pitch_touches").insert({
    user_id: userId,
    day_key: board.dayKey,
    side,
    angle,
    power,
    from_x: from.x,
    from_y: from.y,
    to_x: end.x,
    to_y: end.y,
    result,
    move_number: next.moveNumber,
  });

  const fresh = await loadPitchBoard(supabase, userId);
  return { board: fresh, path, result };
}
