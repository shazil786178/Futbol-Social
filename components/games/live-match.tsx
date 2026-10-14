"use client";

import { useEffect, useRef, useState } from "react";
import type { ChaosId, KeeperKind } from "@/lib/games/arcade";
import {
  PITCH_H,
  PITCH_W,
  createMatch,
  step,
  type LiveEvent,
  type LiveInput,
  type LiveMods,
  type LiveRole,
  type LiveRules,
  type LiveState,
} from "@/lib/games/live";
import { loadSave, writeSave } from "@/lib/games/save";
import {
  SKILLS,
  SKILL_BOOK_FALLBACK,
  SKILL_KEY,
  levelForXp,
  nextSkill,
  unlockedSkills,
  xpToNext,
  type SkillId,
} from "@/lib/games/skills";

const CW = 640;
const CH = 860;

const EMPTY_INPUT: LiveInput = {
  moveX: 0,
  moveY: 0,
  shoot: false,
  sprint: false,
  jump: false,
  flickX: 0,
  flickY: 0,
  trick: null,
};

function project(x: number, y: number, camX: number, camY: number) {
  const t = Math.max(0, Math.min(1, y / PITCH_H));
  const depth = 0.46 + t * 0.92;
  return {
    x: CW / 2 + (x - PITCH_W / 2 - camX) * depth * 1.62,
    y: 132 + t * (CH - 230) - camY,
    s: depth,
  };
}

function darken(hex: string, amount: number) {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return hex;
  const channel = (index: number) =>
    Math.max(0, Math.min(255, parseInt(raw.slice(index, index + 2), 16) + amount));
  return `rgb(${channel(0)}, ${channel(2)}, ${channel(4)})`;
}

function capsule(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  radius: number,
  color: string,
) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const length = Math.hypot(x2 - x1, y2 - y1);
  ctx.save();
  ctx.translate(x1, y1);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, radius, Math.PI / 2, -Math.PI / 2);
  ctx.arc(length, 0, radius, -Math.PI / 2, Math.PI / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function limb(
  ctx: CanvasRenderingContext2D,
  hipX: number,
  hipY: number,
  swing: number,
  s: number,
  upper: number,
  lower: number,
  thick: number,
  skin: string,
  sock: string,
  boot: string,
) {
  const out = hipX >= 0 ? 1 : -1;
  const thigh = -swing * 0.9;
  const bend = 0.5 + Math.max(0, -swing) * 0.85;
  const kneeX = hipX + Math.sin(thigh) * upper + out * 3.4 * s;
  const kneeY = hipY + Math.cos(thigh) * upper;
  const shin = thigh + bend;
  const footX = kneeX + Math.sin(shin) * lower;
  const footY = kneeY + Math.cos(shin) * lower;
  const sockY = kneeY + (footY - kneeY) * 0.42;
  const sockX = kneeX + (footX - kneeX) * 0.42;
  capsule(ctx, hipX, hipY, kneeX, kneeY, thick, skin);
  capsule(ctx, kneeX, kneeY, sockX, sockY, thick * 0.82, skin);
  capsule(ctx, sockX, sockY, footX, footY, thick * 0.72, sock);
  ctx.fillStyle = "#f4f1e8";
  ctx.fillRect(sockX - thick * 0.7, sockY - 1.2 * s, thick * 1.4, 2.2 * s);
  ctx.save();
  ctx.translate(footX, footY);
  ctx.rotate(shin * 0.35);
  ctx.fillStyle = boot;
  ctx.beginPath();
  ctx.ellipse(2.2 * s, 1.4 * s, 6.2 * s, 2.6 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f4f1e8";
  ctx.fillRect(-1 * s, 0.2 * s, 3.2 * s, 1.1 * s);
  ctx.restore();
}

function arm(
  ctx: CanvasRenderingContext2D,
  shoulderX: number,
  shoulderY: number,
  swing: number,
  s: number,
  shirt: string,
  skin: string,
  glove: string | null,
) {
  const out = shoulderX >= 0 ? 1 : -1;
  const upper = -swing * 0.7 + out * 0.35;
  const elbowX = shoulderX + Math.sin(upper) * 12 * s;
  const elbowY = shoulderY + Math.cos(upper) * 12 * s;
  const handX = elbowX + Math.sin(upper + out * 0.45) * 11 * s;
  const handY = elbowY + Math.cos(upper + out * 0.45) * 11 * s;
  capsule(ctx, shoulderX, shoulderY, elbowX, elbowY, 4.2 * s, shirt);
  capsule(ctx, elbowX, elbowY, handX, handY, 3.2 * s, skin);
  ctx.fillStyle = glove ?? skin;
  ctx.beginPath();
  ctx.arc(handX, handY, (glove ? 4.2 : 3.1) * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawAthlete(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  camX: number,
  camY: number,
  opts: {
    shirt: string;
    shorts: string;
    stride: number;
    kick: number;
    hop: number;
    slide: number;
    scale?: number;
    sway?: number;
    facing?: number;
    gloves?: boolean;
    number?: string;
    extraArms?: boolean;
  },
) {
  const p = project(x, y, camX, camY);
  const s = p.s * (opts.scale ?? 1) * 1.22;
  const lift = opts.hop * 34 * s;
  const skin = "#c68642";
  const skinShade = "#a56b32";
  const sock = "#f7f4ea";
  const boot = "#141414";
  const shirtDark = darken(opts.shirt, -38);
  const cycle = opts.stride;
  const kick = opts.kick > 0 ? Math.min(1, (0.46 - opts.kick) / 0.46) : 0;
  const leftSwing = Math.sin(cycle);
  const rightSwing = kick > 0 ? -0.2 - kick * 1.35 : Math.sin(cycle + Math.PI);

  ctx.save();
  ctx.translate(p.x + (opts.sway ?? 0) * 18 * s, p.y);
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.beginPath();
  ctx.ellipse(0, 5 * s, 16 * s, 5.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(0, -lift);
  if ((opts.facing ?? 0) < -8) ctx.scale(-1, 1);
  if (opts.slide > 0.05) {
    ctx.rotate(-1.05);
    ctx.translate(6 * s, 10 * s);
  }

  limb(ctx, -9 * s, -40 * s, leftSwing, s, 18 * s, 16 * s, 5.4 * s, skinShade, sock, boot);
  limb(ctx, 9 * s, -40 * s, rightSwing, s, 18 * s, 16 * s, 5.4 * s, skin, sock, boot);

  ctx.fillStyle = opts.shorts;
  ctx.beginPath();
  ctx.moveTo(-11 * s, -44 * s);
  ctx.lineTo(-12 * s, -30 * s);
  ctx.quadraticCurveTo(-6 * s, -27 * s, 0, -31 * s);
  ctx.quadraticCurveTo(6 * s, -27 * s, 12 * s, -30 * s);
  ctx.lineTo(11 * s, -44 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(-11.5 * s, -36 * s, 2 * s, 8 * s);

  ctx.fillStyle = opts.shirt;
  ctx.beginPath();
  ctx.moveTo(-15 * s, -64 * s);
  ctx.quadraticCurveTo(-17 * s, -52 * s, -12 * s, -42 * s);
  ctx.lineTo(12 * s, -42 * s);
  ctx.quadraticCurveTo(17 * s, -52 * s, 15 * s, -64 * s);
  ctx.quadraticCurveTo(0, -68 * s, -15 * s, -64 * s);
  ctx.fill();
  ctx.fillStyle = shirtDark;
  ctx.beginPath();
  ctx.moveTo(-4 * s, -66 * s);
  ctx.lineTo(-7 * s, -42 * s);
  ctx.lineTo(0, -42 * s);
  ctx.lineTo(2 * s, -66 * s);
  ctx.fill();
  if (opts.number) {
    const raw = opts.shirt.replace("#", "");
    const bright =
      raw.length === 6
        ? (parseInt(raw.slice(0, 2), 16) + parseInt(raw.slice(2, 4), 16) + parseInt(raw.slice(4, 6), 16)) / 3
        : 80;
    ctx.fillStyle = bright > 150 ? "#141820" : "#f4f1e8";
    ctx.font = `700 ${Math.max(8, 11 * s)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(opts.number, 1.5 * s, -52 * s);
  }

  arm(ctx, -15 * s, -60 * s, -leftSwing, s, opts.shirt, skin, opts.gloves ? "#f3d27a" : null);
  arm(ctx, 15 * s, -60 * s, -rightSwing, s, opts.shirt, skin, opts.gloves ? "#f3d27a" : null);
  if (opts.extraArms) {
    arm(ctx, -12 * s, -56 * s, -leftSwing + 1.1, s, opts.shirt, skin, "#f3d27a");
    arm(ctx, 12 * s, -56 * s, -rightSwing - 1.1, s, opts.shirt, skin, "#f3d27a");
  }

  capsule(ctx, 0, -70 * s, 0, -64 * s, 3.1 * s, skinShade);
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(0, -78 * s, 9.2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1c140e";
  ctx.beginPath();
  ctx.arc(0, -80 * s, 9.2 * s, Math.PI * 0.95, Math.PI * 2.05);
  ctx.fill();
  ctx.fillStyle = skinShade;
  ctx.beginPath();
  ctx.ellipse(-8.2 * s, -76 * s, 2.1 * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, spin: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.clip();
  const shine = ctx.createRadialGradient(-radius * 0.35, -radius * 0.4, radius * 0.1, 0, 0, radius);
  shine.addColorStop(0, "#ffffff");
  shine.addColorStop(0.55, "#f4f1e8");
  shine.addColorStop(1, "#b9b3a6");
  ctx.fillStyle = shine;
  ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
  ctx.fillStyle = "#171717";
  const patch = (cx: number, cy: number, size: number, turn: number) => {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = turn + (i * Math.PI * 2) / 5;
      const px = cx + Math.cos(angle) * size;
      const py = cy + Math.sin(angle) * size;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  };
  patch(0, 0, radius * 0.34, -Math.PI / 2);
  patch(-radius * 0.62, -radius * 0.08, radius * 0.24, 0.5);
  patch(radius * 0.58, radius * 0.22, radius * 0.22, 1.1);
  ctx.restore();
}

function paint(ctx: CanvasRenderingContext2D, state: LiveState, rules: LiveRules, color: string, camX: number, camY: number) {
  ctx.clearRect(0, 0, CW, CH);
  const sky = ctx.createLinearGradient(0, 0, 0, CH);
  sky.addColorStop(0, "#070b14");
  sky.addColorStop(0.45, "#122033");
  sky.addColorStop(1, "#07110e");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CW, CH);

  ctx.fillStyle = "#121826";
  ctx.fillRect(0, 40, CW, 120);
  for (let row = 0; row < 4; row++) {
    for (let i = 0; i < 42; i++) {
      const tw = 0.35 + ((i * 17 + row * 9) % 5) / 10;
      ctx.globalAlpha = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(state.t * 3 + i + row));
      ctx.fillStyle = i % 7 === 0 ? "#ffc65c" : "#d7e2f2";
      ctx.fillRect(18 + i * 15, 52 + row * 18, 4, 3 + tw);
    }
  }
  ctx.globalAlpha = 1;

  const lamp = ctx.createRadialGradient(80, 40, 10, 80, 180, 280);
  lamp.addColorStop(0, "rgba(255,214,140,0.28)");
  lamp.addColorStop(1, "rgba(255,214,140,0)");
  ctx.fillStyle = lamp;
  ctx.fillRect(0, 0, CW, CH);
  const lamp2 = ctx.createRadialGradient(CW - 80, 40, 10, CW - 80, 180, 280);
  lamp2.addColorStop(0, "rgba(180,210,255,0.18)");
  lamp2.addColorStop(1, "rgba(180,210,255,0)");
  ctx.fillStyle = lamp2;
  ctx.fillRect(0, 0, CW, CH);

  const nearL = project(8, PITCH_H - 8, camX, camY);
  const nearR = project(PITCH_W - 8, PITCH_H - 8, camX, camY);
  const farL = project(28, 28, camX, camY);
  const farR = project(PITCH_W - 28, 28, camX, camY);
  ctx.beginPath();
  ctx.moveTo(nearL.x, nearL.y);
  ctx.lineTo(nearR.x, nearR.y);
  ctx.lineTo(farR.x, farR.y);
  ctx.lineTo(farL.x, farL.y);
  ctx.closePath();
  ctx.fillStyle = "#0f6b45";
  ctx.fill();

  for (let i = 0; i < 8; i++) {
    const y0 = 40 + i * 52;
    const a = project(18, y0, camX, camY);
    const b = project(PITCH_W - 18, y0, camX, camY);
    const c = project(PITCH_W - 14, y0 + 26, camX, camY);
    const d = project(14, y0 + 26, camX, camY);
    ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(244,241,232,0.75)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const shift = rules.chaos === "moving-goal" ? Math.sin(state.t * 2.4) * 34 : 0;
  const g1 = project(108 + shift, 36, camX, camY);
  const g2 = project(212 + shift, 36, camX, camY);
  const n1 = project(108 + shift, 8, camX, camY);
  const n2 = project(212 + shift, 8, camX, camY);
  ctx.strokeStyle = "rgba(244,241,232,0.35)";
  ctx.beginPath();
  ctx.moveTo(g1.x, g1.y);
  ctx.lineTo(n1.x, n1.y);
  ctx.lineTo(n2.x, n2.y);
  ctx.lineTo(g2.x, g2.y);
  ctx.stroke();
  ctx.strokeStyle = "#f4f1e8";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(g1.x, g1.y);
  ctx.lineTo(n1.x, n1.y);
  ctx.lineTo(n2.x, n2.y);
  ctx.lineTo(g2.x, g2.y);
  ctx.stroke();

  for (const coin of state.coins) {
    if (coin.got) continue;
    const c = project(coin.x, coin.y, camX, camY);
    ctx.fillStyle = "#ffc65c";
    ctx.beginPath();
    ctx.arc(c.x, c.y, 5 * c.s, 0, Math.PI * 2);
    ctx.fill();
  }

  const keeperScale = rules.keeper === "giant" ? 1.85 : 1;
  drawAthlete(ctx, state.keeperX, 50, camX, camY, {
    shirt: "#f3d27a",
    shorts: "#1a1a1a",
    stride: state.t * 2.2,
    kick: 0,
    hop: 0,
    slide: rules.keeper === "teleport" && state.tele > 0.8 ? 0.2 : 0,
    scale: keeperScale,
    gloves: true,
    number: "1",
    extraArms: rules.keeper === "arms",
  });
  if (rules.chaos === "duplicate") {
    drawAthlete(ctx, state.keeper2, 54, camX, camY, {
      shirt: "#9ec0ff",
      shorts: "#1a1a1a",
      stride: state.t * 2.2,
      kick: 0,
      hop: 0,
      slide: 0,
      gloves: true,
      number: "13",
    });
  }

  for (const def of state.defs) {
    drawAthlete(ctx, def.x, def.y, camX, camY, {
      shirt: "#c53646",
      shorts: "#141414",
      stride: state.t * 7 + def.x * 0.02,
      kick: 0,
      hop: 0,
      slide: def.slide,
      facing: def.vx,
      number: "4",
    });
  }

  drawAthlete(ctx, state.player.x, state.player.y, camX, camY, {
    shirt: color,
    shorts: "#101820",
    stride: state.stride,
    kick: state.kick,
    hop: state.hop,
    slide: state.stun > 0.2 ? 0.4 : 0,
    sway: state.skillSide * state.skillAnim,
    facing: state.player.vx,
    number: "10",
  });

  const bodies = [state.ball, ...state.extras];
  bodies.forEach((ball, index) => {
    const z = index === 0 ? state.ballZ : 0;
    const atFeet = index === 0 && state.possessed ? ball.y + 20 : ball.y;
    const ground = project(ball.x, atFeet, camX, camY);
    const air = project(ball.x, atFeet - z, camX, camY);
    const r = (rules.mods.giant || rules.chaos === "giant-ball" ? 16 : 9) * ground.s;
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(ground.x, ground.y + 2, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    drawBall(ctx, air.x, air.y, r, state.t * 4 + index);
  });
}

export function LiveMatch({
  active,
  resetKey,
  role,
  keeper,
  skill,
  defenders,
  mods,
  chaos,
  color = "#f4f1e8",
  onEvent,
}: {
  active: boolean;
  resetKey: string;
  role: LiveRole;
  keeper: KeeperKind;
  skill: number;
  defenders: number;
  mods: LiveMods;
  chaos: ChaosId | null;
  color?: string;
  onEvent: (event: LiveEvent) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sim = useRef<LiveState | null>(null);
  const input = useRef<LiveInput>({ ...EMPTY_INPUT });
  const keys = useRef(new Set<string>());
  const samples = useRef<{ x: number; y: number; t: number }[]>([]);
  const cam = useRef({ x: 0, y: 0 });
  const rulesRef = useRef<LiveRules>({ role, keeper, skill, defenders, mods, chaos });
  const onEventRef = useRef(onEvent);
  const colorRef = useRef(color);
  const [banner, setBanner] = useState("");
  const [bookXp, setBookXp] = useState(0);
  const bookRef = useRef(0);
  const openRef = useRef<SkillId[]>(["power", "croqueta"]);
  const bannerTimer = useRef(0);

  const level = levelForXp(bookXp);
  const owned = unlockedSkills(level);
  const coming = nextSkill(level);
  openRef.current = owned.map((skill) => skill.id);

  rulesRef.current = { role, keeper, skill, defenders, mods, chaos };
  onEventRef.current = onEvent;
  colorRef.current = color;

  useEffect(() => {
    const book = loadSave(SKILL_KEY, SKILL_BOOK_FALLBACK);
    bookRef.current = book.xp;
    setBookXp(book.xp);
  }, []);

  useEffect(() => {
    sim.current = createMatch(rulesRef.current, resetKey.length * 17 + defenders * 3);
    setBanner("");
  }, [resetKey, defenders, role]);

  useEffect(() => {
    if (!active) return;
    const down = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keys.current.add(key);
      if (e.key === " " || e.key === "Shift") e.preventDefault();
      if (key === " " || key === "enter") input.current.shoot = true;
      if (key === "j") input.current.jump = true;
      const slot = Number(e.key);
      if (slot >= 1 && slot <= 9) {
        const trick = openRef.current[slot - 1];
        if (trick) input.current.trick = trick;
      }
    };
    const up = (e: KeyboardEvent) => {
      keys.current.delete(e.key.toLowerCase());
      if (e.key === "Shift") input.current.sprint = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      keys.current.clear();
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.034, (now - last) / 1000);
      last = now;
      const state = sim.current;
      if (state) {
        const k = keys.current;
        let mx = (k.has("arrowright") || k.has("d") ? 1 : 0) - (k.has("arrowleft") || k.has("a") ? 1 : 0);
        let my = (k.has("arrowdown") || k.has("s") ? 1 : 0) - (k.has("arrowup") || k.has("w") ? 1 : 0);
        const pointer = input.current;
        if (mx === 0 && my === 0 && Math.hypot(pointer.moveX, pointer.moveY) > 0.2) {
          mx = pointer.moveX;
          my = pointer.moveY;
        }
        const frame: LiveInput = {
          moveX: mx,
          moveY: my,
          shoot: pointer.shoot,
          sprint: pointer.sprint || k.has("shift"),
          jump: pointer.jump,
          flickX: pointer.flickX,
          flickY: pointer.flickY,
          trick: pointer.trick,
        };
        const events = step(state, frame, dt, rulesRef.current);
        pointer.shoot = false;
        pointer.jump = false;
        pointer.flickX = 0;
        pointer.flickY = 0;
        pointer.trick = null;
        let gained = 0;
        for (const event of events) {
          if (event.type === "nutmeg") gained += 8;
          if (event.type === "goal") gained += 12;
          if (event.type === "clear") gained += 10;
          onEventRef.current(event);
        }
        let freshName = "";
        if (gained > 0) {
          const before = levelForXp(bookRef.current);
          bookRef.current += gained;
          const after = levelForXp(bookRef.current);
          writeSave(SKILL_KEY, { xp: bookRef.current });
          setBookXp(bookRef.current);
          const fresh = SKILLS.find((skill) => skill.unlock === after && skill.unlock > before);
          if (fresh) freshName = fresh.name;
        }
        const line = freshName ? `${freshName} unlocked` : state.banner;
        if (line) {
          setBanner(line);
          window.clearTimeout(bannerTimer.current);
          bannerTimer.current = window.setTimeout(() => setBanner(""), freshName ? 1600 : 700);
        }
        cam.current.x += ((state.player.x - 160) * 0.22 - cam.current.x) * 0.08;
        cam.current.y += ((state.player.y - 320) * 0.05 - cam.current.y) * 0.08;
        paint(ctx, state, rulesRef.current, colorRef.current, cam.current.x, cam.current.y);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, resetKey]);

  function worldPoint(e: React.PointerEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * CW;
    const sy = ((e.clientY - rect.top) / rect.height) * CH;
    const player = sim.current?.player;
    if (!player) return null;
    let best = { x: player.x, y: player.y, d: 1e9 };
    for (let y = 20; y <= PITCH_H; y += 8) {
      for (let x = 16; x <= PITCH_W; x += 8) {
        const p = project(x, y, cam.current.x, cam.current.y);
        const dist = (p.x - sx) ** 2 + (p.y - sy) ** 2;
        if (dist < best.d) best = { x, y, d: dist };
      }
    }
    return { x: best.x, y: best.y, t: performance.now() };
  }

  function aimAt(p: { x: number; y: number }) {
    const player = sim.current?.player;
    if (!player) return;
    const dx = p.x - player.x;
    const dy = p.y - player.y;
    const n = Math.hypot(dx, dy) || 1;
    if (n < 12) {
      input.current.moveX = 0;
      input.current.moveY = 0;
      return;
    }
    input.current.moveX = dx / n;
    input.current.moveY = dy / n;
  }

  function onDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const p = worldPoint(e);
    if (!p) return;
    samples.current = [p];
    aimAt(p);
  }

  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.buttons === 0 && e.pointerType === "mouse") return;
    const p = worldPoint(e);
    if (!p) return;
    samples.current = [...samples.current, p].filter((s) => p.t - s.t < 140);
    aimAt(p);
  }

  function onUp(e: React.PointerEvent<HTMLCanvasElement>) {
    const p = worldPoint(e);
    const recent = samples.current;
    input.current.moveX = 0;
    input.current.moveY = 0;
    if (p && recent.length) {
      const a = recent[0]!;
      const dx = p.x - a.x;
      const dy = p.y - a.y;
      const dist = Math.hypot(dx, dy);
      if (p.t - a.t < 180 && dist > 28) {
        input.current.flickX = dx / dist;
        input.current.flickY = dy / dist;
        input.current.shoot = true;
      }
    }
    samples.current = [];
  }

  return (
    <div className="fs-live">
      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        className="fs-live__canvas"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />
      {banner ? <p className="fs-live__banner">{banner}</p> : null}
      {role === "keeper" ? null : (
        <div className="fs-skills">
          {SKILLS.map((skill, index) => {
            const open = skill.unlock <= level;
            return (
              <button
                key={skill.id}
                type="button"
                className={open ? "fs-skill" : "fs-skill fs-skill--locked"}
                disabled={!open}
                title={open ? skill.blurb : `Unlocks at level ${skill.unlock}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  if (open) input.current.trick = skill.id;
                }}
              >
                <span>{index + 1}</span>
                {skill.name}
                {open ? null : <em>Lv {skill.unlock}</em>}
              </button>
            );
          })}
        </div>
      )}
      <p className="fs-skills__meta">
        Level {level}
        {coming ? ` · ${xpToNext(bookXp)} xp to ${coming.name}` : " · every move is open"}
      </p>
      <div className="fs-live__actions">
        <button
          type="button"
          className="fs-chip fs-chip--ghost"
          onPointerDown={(e) => {
            e.preventDefault();
            input.current.sprint = true;
          }}
          onPointerUp={() => {
            input.current.sprint = false;
          }}
          onPointerLeave={() => {
            input.current.sprint = false;
          }}
        >
          Sprint
        </button>
        {role === "keeper" ? null : (
          <button
            type="button"
            className="fs-chip fs-chip--ghost"
            onPointerDown={(e) => {
              e.preventDefault();
              input.current.jump = true;
            }}
          >
            Jump
          </button>
        )}
        {role === "carry" ? null : (
          <button
            type="button"
            className="fs-chip fs-chip--mint"
            onPointerDown={(e) => {
              e.preventDefault();
              input.current.shoot = true;
            }}
          >
            Shoot
          </button>
        )}
      </div>
      <p className="fs-live__hint">
        {role === "keeper"
          ? "You are on the line. Slide with the shot and get a hand to it."
          : role === "carry"
            ? "Drag to run. Throw a skill to beat the slide, or jump it. Carry the ball into the box."
            : "Drag to run. Tap a skill to beat the defender. Shoot, or flick, when you have the angle."}
      </p>
    </div>
  );
}
