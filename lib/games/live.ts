/** Real-time pitch. You run the player. The ball is a separate thing you have to keep. */

import type { ChaosId, KeeperKind } from "@/lib/games/arcade";
import type { SkillId } from "@/lib/games/skills";

export const PITCH_W = 320;
export const PITCH_H = 460;

export type LiveMods = {
  shot: number;
  curl: number;
  split: boolean;
  giant: boolean;
  magnet: number;
  pace: number;
  grace: number;
  sprint: number;
};

export const EMPTY_LIVE: LiveMods = {
  shot: 0,
  curl: 0,
  split: false,
  giant: false,
  magnet: 0,
  pace: 0,
  grace: 0,
  sprint: 0,
};

export type LiveRole = "attack" | "carry" | "keeper";

export type LiveRules = {
  role: LiveRole;
  keeper: KeeperKind;
  skill: number;
  defenders: number;
  mods: LiveMods;
  chaos: ChaosId | null;
};

export type LiveEvent =
  | { type: "goal"; long: boolean; dribbled: boolean }
  | { type: "save" }
  | { type: "tackle" }
  | { type: "nutmeg" }
  | { type: "coin" }
  | { type: "clear" }
  | { type: "concede" };

type Mover = { x: number; y: number; vx: number; vy: number };

export type LiveState = {
  player: Mover;
  ball: Mover;
  extras: Mover[];
  keeperX: number;
  keeper2: number;
  defs: (Mover & { passed: boolean; slide: number })[];
  coins: { x: number; y: number; got: boolean }[];
  facingX: number;
  facingY: number;
  possessed: boolean;
  kickLock: number;
  stun: number;
  freeze: number;
  spawn: number;
  tele: number;
  reversed: boolean;
  chipped: number;
  beaten: number;
  shotFromY: number;
  ballZ: number;
  ballVz: number;
  stride: number;
  kick: number;
  hop: number;
  skillCd: number;
  skillGrace: number;
  skillAnim: number;
  skillSide: number;
  croquetSide: number;
  rainbow: number;
  t: number;
  banner: string;
};

export type LiveInput = {
  moveX: number;
  moveY: number;
  shoot: boolean;
  sprint: boolean;
  jump: boolean;
  flickX: number;
  flickY: number;
  trick: SkillId | null;
};

export function createMatch(rules: LiveRules, seed = 1): LiveState {
  const defs = Array.from({ length: Math.max(0, rules.defenders) }, (_, i) => ({
    x: 48 + ((seed * (i + 3) * 47) % 220),
    y: 130 + i * 48,
    vx: 0,
    vy: 0,
    passed: false,
    slide: 0,
  }));
  const coins =
    rules.role === "carry"
      ? Array.from({ length: 5 }, (_, i) => ({
          x: 46 + ((i * 67 + seed) % 230),
          y: 78 + i * 62,
          got: false,
        }))
      : [];
  return {
    player: { x: 160, y: rules.role === "keeper" ? 62 : 400, vx: 0, vy: 0 },
    ball: { x: 160, y: rules.role === "keeper" ? 300 : 360, vx: 0, vy: rules.role === "keeper" ? -220 : 0 },
    extras: [],
    keeperX: 160,
    keeper2: 210,
    defs,
    coins,
    facingX: 0,
    facingY: -1,
    possessed: false,
    kickLock: rules.role === "keeper" ? 8 : 0.15,
    stun: 0,
    freeze: 0,
    spawn: rules.role === "keeper" ? 1.4 : 8,
    tele: 0,
    reversed: false,
    chipped: 0,
    beaten: 0,
    shotFromY: 360,
    ballZ: 0,
    ballVz: 0,
    stride: 0,
    kick: 0,
    hop: 0,
    skillCd: 0,
    skillGrace: 0,
    skillAnim: 0,
    skillSide: 1,
    croquetSide: 1,
    rainbow: 0,
    t: 0,
    banner: "",
  };
}

function len(x: number, y: number) {
  return Math.hypot(x, y) || 1;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function closestDefender(state: LiveState) {
  let best: LiveState["defs"][number] | null = null;
  let bestD = 78;
  for (const def of state.defs) {
    const dist = Math.hypot(def.x - state.player.x, def.y - state.player.y);
    if (dist < bestD) {
      best = def;
      bestD = dist;
    }
  }
  return best;
}

function beatDefender(state: LiveState, events: LiveEvent[]) {
  const def = closestDefender(state);
  state.skillGrace = Math.max(state.skillGrace, 0.38);
  state.skillAnim = 0.36;
  if (!def || def.passed) return;
  def.passed = true;
  def.slide = 0.48;
  def.vx = (def.x - state.player.x) * 3;
  def.vy = 30;
  state.beaten += 1;
  events.push({ type: "nutmeg" });
}

function shove(state: LiveState, x: number, y: number, speed: number) {
  const n = len(x, y);
  const dx = (x / n) * 34;
  const dy = (y / n) * 34;
  state.player.x = clamp(state.player.x + dx, 18, PITCH_W - 18);
  state.player.y = clamp(state.player.y + dy, 36, PITCH_H - 18);
  state.player.vx = (x / n) * speed;
  state.player.vy = (y / n) * speed;
  state.facingX = x / n;
  state.facingY = y / n;
}

/** A chosen move. Power shot is handled by the strike. The rest beat a nearby body. */
function performSkill(state: LiveState, trick: SkillId, events: LiveEvent[]) {
  const side = state.croquetSide;
  const px = -state.facingY * side;
  const py = state.facingX * side;
  state.skillSide = side;
  state.croquetSide = -side;
  state.skillCd = 0.62;
  state.skillAnim = 0.36;

  if (trick === "croqueta") {
    shove(state, px + state.facingX * 0.35, py + state.facingY * 0.35, 210);
    state.banner = "LA CROQUETA";
    beatDefender(state, events);
    return;
  }
  if (trick === "stepover") {
    shove(state, state.facingX + px * 0.8, state.facingY + py * 0.8, 240);
    state.banner = "STEPOVER";
    beatDefender(state, events);
    return;
  }
  if (trick === "roll") {
    shove(state, px, py, 160);
    state.banner = "BALL ROLL";
    beatDefender(state, events);
    return;
  }
  if (trick === "cruyff") {
    shove(state, -state.facingX + px, -state.facingY + py, 200);
    state.banner = "CRUYFF";
    beatDefender(state, events);
    return;
  }
  if (trick === "elastico") {
    shove(state, -px + state.facingX, -py + state.facingY, 250);
    state.skillSide = -side;
    state.banner = "ELASTICO";
    beatDefender(state, events);
    return;
  }
  if (trick === "heel") {
    shove(state, -state.facingX * 0.2 + px, -state.facingY * 0.2 + py, 190);
    state.banner = "HEEL CHOP";
    beatDefender(state, events);
    return;
  }
  if (trick === "rainbow") {
    state.rainbow = 0.42;
    state.hop = Math.max(state.hop, 0.28);
    state.ballZ = 26;
    state.banner = "RAINBOW";
    beatDefender(state, events);
    return;
  }
  if (trick === "roulette") {
    shove(state, px * 0.4 + state.facingX, py * 0.4 + state.facingY, 150);
    state.stride += 4;
    state.skillGrace = 0.5;
    state.banner = "ROULETTE";
    beatDefender(state, events);
  }
}

export function step(state: LiveState, input: LiveInput, dt: number, rules: LiveRules): LiveEvent[] {
  const events: LiveEvent[] = [];
  const d = Math.min(0.034, Math.max(0.001, dt));
  state.t += d;
  state.banner = "";
  if (state.freeze > 0) {
    state.freeze -= d;
    state.ball.x += state.ball.vx * d;
    state.ball.y += state.ball.vy * d;
    state.ball.vx *= 0.92;
    state.ball.vy *= 0.92;
    return events;
  }

  const mods = rules.mods;
  const pace = 158 * (1 + mods.pace) * (input.sprint ? 1.28 + mods.sprint * 0.7 : 1);
  const keeperRole = rules.role === "keeper";

  if (keeperRole) {
    const wish = input.moveX;
    state.player.vx += (wish * 210 - state.player.vx) * Math.min(1, 14 * d);
    state.player.x = clamp(state.player.x + state.player.vx * d, 28, PITCH_W - 28);
    state.player.y = 62;
    state.player.vy = 0;
  } else if (state.stun > 0) {
    state.stun -= d;
    state.player.vx *= 0.86;
    state.player.vy *= 0.86;
    state.player.x = clamp(state.player.x + state.player.vx * d, 18, PITCH_W - 18);
    state.player.y = clamp(state.player.y + state.player.vy * d, 36, PITCH_H - 18);
  } else {
    const mx = input.moveX;
    const my = input.moveY;
    const moving = Math.hypot(mx, my) > 0.2;
    if (moving) {
      const n = len(mx, my);
      state.facingX = mx / n;
      state.facingY = my / n;
    }
    const tx = moving ? (mx / len(mx, my)) * pace : 0;
    const ty = moving ? (my / len(mx, my)) * pace : 0;
    state.player.vx += (tx - state.player.vx) * Math.min(1, 7 * d);
    state.player.vy += (ty - state.player.vy) * Math.min(1, 7 * d);
    state.player.x = clamp(state.player.x + state.player.vx * d, 18, PITCH_W - 18);
    state.player.y = clamp(state.player.y + state.player.vy * d, 36, PITCH_H - 18);
  }

  const speedNow = Math.hypot(state.player.vx, state.player.vy);
  state.stride += speedNow * d * 0.09;
  state.kick = Math.max(0, state.kick - d);
  state.skillCd = Math.max(0, state.skillCd - d);
  state.skillGrace = Math.max(0, state.skillGrace - d);
  state.skillAnim = Math.max(0, state.skillAnim - d);
  state.rainbow = Math.max(0, state.rainbow - d);
  if (input.jump && state.hop <= 0 && !keeperRole && state.stun <= 0) state.hop = 0.48;
  if (state.hop > 0) state.hop = Math.max(0, state.hop - d);

  state.kickLock = Math.max(0, state.kickLock - d);
  state.tele = Math.max(0, state.tele - d);
  state.chipped = Math.max(0, state.chipped - d);

  const catchR = 26 + mods.magnet * 22;
  const ballSpeed = Math.hypot(state.ball.vx, state.ball.vy);
  if (!keeperRole && state.kickLock <= 0 && state.stun <= 0) {
    const dx = state.player.x - state.ball.x;
    const dy = state.player.y - state.ball.y;
    if (Math.hypot(dx, dy) < catchR && (ballSpeed < 460 || mods.magnet > 0.25)) {
      state.possessed = true;
    }
  }

    if (state.possessed && !keeperRole) {
    const spd = Math.hypot(state.player.vx, state.player.vy);
    const fx = spd > 16 ? state.player.vx / spd : state.facingX;
    const fy = spd > 16 ? state.player.vy / spd : state.facingY;
    state.ball.x = state.player.x + fx * 16;
    state.ball.y = state.player.y + fy * 16;
    state.ball.vx = state.player.vx;
    state.ball.vy = state.player.vy;
    state.ballZ = state.rainbow > 0 ? 26 : 4 + Math.abs(Math.sin(state.stride * 2)) * 6;
    state.ballVz = 0;

    const powerShot = input.trick === "power" && state.skillCd <= 0;
    if (input.trick && input.trick !== "power" && state.skillCd <= 0) {
      performSkill(state, input.trick, events);
    }

    const flick = Math.hypot(input.flickX, input.flickY) > 0.4;
    if ((input.shoot || flick || powerShot) && (rules.role !== "carry" || powerShot)) {
      const far = state.keeperX > 160 ? 124 : 196;
      let dx = flick ? input.flickX : far - state.ball.x;
      let dy = flick ? input.flickY : 18 - state.ball.y;
      const n = len(dx, dy);
      const power = (flick ? 460 : 420) * (1 + mods.shot) * (powerShot ? 1.7 : 1);
      const chip = !flick && mods.grace > 0.45;
      state.shotFromY = state.player.y;
      state.ball.vx = (dx / n) * power * (chip ? 0.72 : 1);
      state.ball.vy = (dy / n) * power * (chip ? 0.72 : 1);
      state.ball.vx += -dy / n * mods.curl * 90;
      state.possessed = false;
      state.kickLock = 0.32;
      state.kick = powerShot ? 0.46 : 0.34;
      state.ballZ = chip ? 10 : powerShot ? 3 : 5;
      state.ballVz = chip ? 240 : powerShot ? 70 : 110;
      if (powerShot) {
        state.banner = "POWER SHOT";
        state.skillCd = 0.62;
      }
      state.chipped = chip ? 0.45 : 0;
      state.reversed = false;
      if (mods.split) {
        const ang = Math.atan2(state.ball.vy, state.ball.vx);
        state.extras = [-0.42, 0.42].map((a) => ({
          x: state.ball.x,
          y: state.ball.y,
          vx: Math.cos(ang + a) * power * 0.82,
          vy: Math.sin(ang + a) * power * 0.82,
        }));
      } else {
        state.extras = [];
      }
    }
  }

  if (!state.possessed) {
    fly(state.ball, d, rules, mods);
    state.ballVz -= 640 * d;
    state.ballZ += state.ballVz * d;
    if (state.ballZ <= 0) {
      state.ballZ = 0;
      state.ballVz *= -0.42;
      if (Math.abs(state.ballVz) < 28) state.ballVz = 0;
    }
  }
  for (const extra of state.extras) fly(extra, d, rules, mods);
  state.extras = state.extras.filter((b) => b.y < PITCH_H && b.y > -20);

  const shift = rules.chaos === "moving-goal" ? Math.sin(state.t * 2.4) * 34 : 0;
  const postL = 108 + shift;
  const postR = 212 + shift;
  const reach = keeperReach(rules, state.chipped > 0 || mods.giant || rules.chaos === "giant-ball");

  moveKeeper(state, rules, d, postL, postR);

  if (keeperRole) {
    const hit = Math.hypot(state.player.x - state.ball.x, state.player.y - state.ball.y) < 28;
    if (hit && state.ball.vy < 40) {
      events.push({ type: "save" });
      state.banner = "SAVE";
      launchAttack(state);
    } else if (state.ball.y < 18 && state.ball.x > postL && state.ball.x < postR) {
      events.push({ type: "concede" });
      state.banner = "GOAL";
      state.freeze = 0.45;
      launchAttack(state);
    }
    return events;
  }

  if (rules.role !== "carry") {
    const scored = tryGoal(state, state.ball, postL, postR, reach, rules, events, true);
    if (!scored) {
      for (const extra of state.extras) {
        if (tryGoal(state, extra, postL, postR, reach, rules, events, false)) break;
      }
    }
  }

  if (rules.role === "carry" && state.possessed && state.player.y < 58) {
    events.push({ type: "clear" });
    state.banner = "THROUGH";
    state.freeze = 0.7;
    resetAttack(state);
  }

  for (const coin of state.coins) {
    if (coin.got) continue;
    if (Math.hypot(coin.x - state.player.x, coin.y - state.player.y) < 18) {
      coin.got = true;
      events.push({ type: "coin" });
    }
  }

  const defSpeed = 62 + rules.skill * 78 + (rules.role === "carry" ? 10 : 0);
  for (const def of state.defs) {
    const tx = state.possessed ? state.player.x : state.ball.x;
    const ty = (state.possessed ? state.player.y : state.ball.y) + 18;
    const dx = tx - def.x;
    const dy = ty - def.y;
    const n = len(dx, dy);
    def.vx += ((dx / n) * defSpeed - def.vx) * Math.min(1, 3.1 * d);
    def.vy += ((dy / n) * defSpeed - def.vy) * Math.min(1, 3.1 * d);
    def.x = clamp(def.x + def.vx * d, 20, PITCH_W - 20);
    def.y = clamp(def.y + def.vy * d, 70, PITCH_H - 40);
    if (state.possessed && !def.passed && state.player.y < def.y - 8 && Math.abs(state.player.x - def.x) < 36) {
      def.passed = true;
      state.beaten += 1;
      events.push({ type: "nutmeg" });
      if (!state.banner) state.banner = "NUTMEG";
    }
    def.slide = Math.max(0, def.slide - d);
    const touch = Math.hypot(def.x - state.player.x, def.y - state.player.y) < 22;
    if (touch && state.possessed && state.stun <= 0) {
      def.slide = 0.32;
      const slip = state.hop > 0.12 || state.skillGrace > 0 || Math.random() < mods.grace * 0.65;
      if (!slip) {
        events.push({ type: "tackle" });
        state.banner = "TACKLED";
        state.possessed = false;
        state.stun = 0.55;
        state.kickLock = 0.35;
        state.ball.vx = (state.ball.x - def.x) * 8;
        state.ball.vy = -120;
        state.beaten = 0;
      }
    }
  }

  return events;
}

function fly(ball: Mover, d: number, rules: LiveRules, mods: LiveMods) {
  if (rules.keeper === "gravity" && ball.y < 200) {
    ball.vx += (ball.x < 160 ? -1 : 1) * 90 * d;
  }
  if (rules.chaos === "gravity") ball.vx += Math.sin(ball.y * 0.05) * 140 * d;
  if (mods.curl) ball.vx += mods.curl * 40 * d * (ball.vy < 0 ? 1 : -1);
  if (mods.magnet && ball.vy < 0) ball.vx += (160 - ball.x) * mods.magnet * 1.4 * d;
  ball.x += ball.vx * d;
  ball.y += ball.vy * d;
  ball.vx *= 0.992;
  ball.vy *= 0.992;
  const rest = rules.chaos === "bounce" ? 1.05 : 0.82;
  if (ball.x < 12) {
    ball.x = 12;
    ball.vx = Math.abs(ball.vx) * rest;
  }
  if (ball.x > PITCH_W - 12) {
    ball.x = PITCH_W - 12;
    ball.vx = -Math.abs(ball.vx) * rest;
  }
  if (ball.y > PITCH_H - 12) {
    ball.y = PITCH_H - 12;
    ball.vy = -Math.abs(ball.vy) * 0.7;
  }
}

function keeperReach(rules: LiveRules, fat: boolean) {
  let reach = 20 + rules.skill * 10;
  if (rules.keeper === "arms") reach += 16;
  if (rules.keeper === "giant") reach = 46;
  if (fat) reach *= 0.72;
  return reach;
}

function moveKeeper(state: LiveState, rules: LiveRules, d: number, postL: number, postR: number) {
  const speed = rules.keeper === "giant" ? 48 : rules.keeper === "teleport" ? 70 : 86 + rules.skill * 40;
  let target = state.ball.y < 240 || state.ball.vy < -40 ? state.ball.x : (postL + postR) / 2;
  if (rules.keeper === "teleport" && state.tele <= 0 && state.ball.y < 150 && state.ball.vy < -80) {
    state.keeperX = state.ball.x;
    state.tele = 1.15;
  } else {
    state.keeperX += clamp(target - state.keeperX, -speed * d, speed * d);
  }
  state.keeperX = clamp(state.keeperX, postL + 8, postR - 8);
  state.keeper2 = clamp(state.keeperX + 46, postL + 8, postR - 8);
}

function tryGoal(
  state: LiveState,
  ball: Mover,
  postL: number,
  postR: number,
  reach: number,
  rules: LiveRules,
  events: LiveEvent[],
  primary: boolean,
): boolean {
  if (ball.y > 36) return false;
  if (ball.x <= postL || ball.x >= postR) {
    if (ball.y < 14) {
      ball.y = 20;
      ball.vy = Math.abs(ball.vy) * 0.85;
    }
    return false;
  }
  if (ball.vy >= -20 && !state.possessed) return false;

  if (rules.keeper === "reverse" && !state.reversed && Math.hypot(ball.vx, ball.vy) > 360 && state.chipped <= 0) {
    ball.vy = Math.abs(ball.vy) * 0.8;
    ball.y = 40;
    state.reversed = true;
    if (primary) {
      events.push({ type: "save" });
      state.banner = "REVERSED";
      state.freeze = 0.35;
    }
    return true;
  }

  const spots = rules.chaos === "duplicate" ? [state.keeperX, state.keeper2] : [state.keeperX];
  const saved = spots.some((kx) => Math.abs(ball.x - kx) < reach && ball.y < 78);
  if (saved) {
    ball.vy = 220;
    ball.y = 48;
    ball.vx += (ball.x - state.keeperX) * 2;
    state.possessed = false;
    state.kickLock = 0.45;
    if (primary) {
      events.push({ type: "save" });
      state.banner = "SAVED";
      state.freeze = 0.28;
    }
    return true;
  }

  if (primary) {
    events.push({
      type: "goal",
      long: state.shotFromY > 280,
      dribbled: state.beaten > 0 && state.shotFromY <= 280,
    });
    state.banner = "GOAL";
  }
  state.freeze = 0.62;
  resetAttack(state);
  return true;
}

function resetAttack(state: LiveState) {
  state.ball.x = 160;
  state.ball.y = 340;
  state.ball.vx = 0;
  state.ball.vy = 0;
  state.extras = [];
  state.possessed = false;
  state.kickLock = 0.25;
  state.beaten = 0;
  state.player.x = 160;
  state.player.y = 400;
  state.player.vx = 0;
  state.player.vy = 0;
  state.ballZ = 0;
  state.ballVz = 0;
  state.kick = 0;
  state.reversed = false;
  state.defs.forEach((def, i) => {
    def.passed = false;
    def.slide = 0;
    def.x = 70 + ((i * 90) % 190);
    def.y = 150 + i * 46;
    def.vx = 0;
    def.vy = 0;
  });
}

function launchAttack(state: LiveState) {
  state.ball.x = 70 + Math.random() * 180;
  state.ball.y = 250 + Math.random() * 40;
  state.ball.vx = (160 - state.ball.x) * 0.55;
  state.ball.vy = -240 - Math.random() * 90;
  state.spawn = 0.2;
}
