"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { submitTopBins } from "@/app/topbins/actions";
import {
  ATTEMPTS_PER_DAY,
  pointsFor,
  resultEmoji,
  resultLabel,
  type AttemptLog,
  type AttemptResult,
  type DailyKick,
} from "@/lib/games/top-bins";

type Vec3 = { x: number; y: number; z: number };

const GOAL_HALF = 3.66;
const GOAL_H = 2.44;
const WALL_Y = 9.15;
const POST_R = 0.14;
const G = 9.81;

type Phase = "aim" | "flight" | "result" | "done";

type Flight = {
  pos: Vec3;
  vel: Vec3;
  t: number;
  trail: Vec3[];
  result: AttemptResult | null;
  resultAt: number | null;
  keeperX: number;
  keeperDive: number; // 0..1 how far into the dive
  keeperTarget: number | null;
  wallJump: number;
  goalX: number | null;
  goalZ: number | null;
  launchSpeed: number;
};

function storageKey(dayKey: string) {
  return `fs-topbins-${dayKey}`;
}

export function TopBinsGame({
  kick,
  signedIn,
  alreadyPlayed,
}: {
  kick: DailyKick;
  signedIn: boolean;
  alreadyPlayed: { score: number; rank: number; attempts: AttemptLog[] } | null;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 390, h: 520 });
  const [phase, setPhase] = useState<Phase>("aim");
  const [attempts, setAttempts] = useState<AttemptLog[]>(alreadyPlayed?.attempts ?? []);
  const [loft, setLoft] = useState(0.45);
  const [curl, setCurl] = useState(0);
  const [drag, setDrag] = useState<{ sx: number; sy: number; x: number; y: number } | null>(null);
  const [banner, setBanner] = useState<{ text: string; sub: string; tone: string } | null>(null);
  const [submit, setSubmit] = useState<{ rank: number; players: number } | null>(
    alreadyPlayed ? { rank: alreadyPlayed.rank, players: 0 } : null,
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const flight = useRef<Flight | null>(null);
  const raf = useRef<number | null>(null);
  const lastTs = useRef<number | null>(null);
  const attemptsRef = useRef(attempts);
  attemptsRef.current = attempts;
  const curlRef = useRef(curl);
  curlRef.current = curl;

  const ballStart = useMemo<Vec3>(() => ({ x: kick.offsetX, y: 0, z: 0.11 }), [kick.offsetX]);

  // Restore today's round from this device
  useEffect(() => {
    if (alreadyPlayed) {
      setPhase("done");
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey(kick.dayKey));
      if (raw) {
        const saved = JSON.parse(raw) as AttemptLog[];
        if (Array.isArray(saved) && saved.length) {
          setAttempts(saved);
          if (saved.length >= ATTEMPTS_PER_DAY) setPhase("done");
        }
      }
    } catch {
      /* ignore */
    }
  }, [kick.dayKey, alreadyPlayed]);

  // Responsive canvas
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = Math.min(el.clientWidth, 560);
      const h = Math.round(Math.min(window.innerHeight * 0.6, w * 1.3));
      setSize({ w, h: Math.max(380, h) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // --- projection -----------------------------------------------------------
  const cam = useMemo(() => {
    const camX = kick.offsetX * 0.6;
    return { x: camX, y: -6.5, z: 2.1, f: 1 };
  }, [kick.offsetX]);

  const project = useCallback(
    (p: Vec3) => {
      const W = size.w;
      const H = size.h;
      const f = W * 0.95;
      const dy = p.y - cam.y;
      const sx = ((p.x - cam.x) * f) / dy;
      const sy = (-(p.z - cam.z) * f) / dy;
      return { x: W / 2 + sx, y: H * 0.44 + sy, s: f / dy };
    },
    [size.w, size.h, cam],
  );

  // --- drawing --------------------------------------------------------------
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = size.w;
    const H = size.h;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
      canvas.width = W * dpr;
      canvas.height = H * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Sky + stands
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.44);
    sky.addColorStop(0, "#070b14");
    sky.addColorStop(1, "#1a2440");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H * 0.44);
    // Crowd shimmer
    for (let i = 0; i < 90; i++) {
      const x = (i * 97) % W;
      const y = H * 0.2 + ((i * 53) % Math.round(H * 0.22));
      ctx.fillStyle = `rgba(255,255,255,${0.04 + ((i * 7) % 5) * 0.015})`;
      ctx.fillRect(x, y, 2, 2);
    }
    // Pitch
    const pitch = ctx.createLinearGradient(0, H * 0.44, 0, H);
    pitch.addColorStop(0, "#1f6b3a");
    pitch.addColorStop(1, "#2f8a4b");
    ctx.fillStyle = pitch;
    ctx.fillRect(0, H * 0.44, W, H * 0.56);
    // Mown stripes (depth)
    for (let y = 0; y < kick.distance + 8; y += 4) {
      const a = project({ x: -40, y, z: 0 });
      const b = project({ x: -40, y: y + 2, z: 0 });
      ctx.fillStyle = "rgba(0,0,0,0.07)";
      ctx.fillRect(0, b.y, W, Math.max(1, a.y - b.y));
    }

    const D = kick.distance;
    // Box lines
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 2;
    const line = (a: Vec3, b: Vec3) => {
      const p = project(a);
      const q = project(b);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
    };
    line({ x: -20.16, y: D, z: 0 }, { x: 20.16, y: D, z: 0 }); // goal line
    line({ x: -20.16, y: D, z: 0 }, { x: -20.16, y: D - 16.5, z: 0 });
    line({ x: 20.16, y: D, z: 0 }, { x: 20.16, y: D - 16.5, z: 0 });
    line({ x: -20.16, y: D - 16.5, z: 0 }, { x: 20.16, y: D - 16.5, z: 0 });
    line({ x: -9.16, y: D, z: 0 }, { x: -9.16, y: D - 5.5, z: 0 });
    line({ x: 9.16, y: D, z: 0 }, { x: 9.16, y: D - 5.5, z: 0 });
    line({ x: -9.16, y: D - 5.5, z: 0 }, { x: 9.16, y: D - 5.5, z: 0 });

    // Goal frame + net
    const tl = project({ x: -GOAL_HALF, y: D, z: GOAL_H });
    const tr = project({ x: GOAL_HALF, y: D, z: GOAL_H });
    const bl = project({ x: -GOAL_HALF, y: D, z: 0 });
    const br = project({ x: GOAL_HALF, y: D, z: 0 });
    const btl = project({ x: -GOAL_HALF, y: D + 2, z: GOAL_H * 0.9 });
    const btr = project({ x: GOAL_HALF, y: D + 2, z: GOAL_H * 0.9 });
    const bbl = project({ x: -GOAL_HALF, y: D + 2.2, z: 0 });
    const bbr = project({ x: GOAL_HALF, y: D + 2.2, z: 0 });
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y);
    ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(btr.x, btr.y);
    ctx.lineTo(btl.x, btl.y);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(btl.x, btl.y);
    ctx.lineTo(btr.x, btr.y);
    ctx.lineTo(bbr.x, bbr.y);
    ctx.lineTo(bbl.x, bbl.y);
    ctx.closePath();
    ctx.fill();
    // net mesh
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const a = project({ x: -GOAL_HALF + t * GOAL_HALF * 2, y: D + 2, z: GOAL_H * 0.9 });
      const b = project({ x: -GOAL_HALF + t * GOAL_HALF * 2, y: D + 2.2, z: 0 });
      const c = project({ x: -GOAL_HALF + t * GOAL_HALF * 2, y: D, z: GOAL_H });
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    for (let i = 0; i <= 5; i++) {
      const t = i / 5;
      const a = project({ x: -GOAL_HALF, y: D + 2.2 - t * 0.2, z: t * GOAL_H * 0.9 });
      const b = project({ x: GOAL_HALF, y: D + 2.2 - t * 0.2, z: t * GOAL_H * 0.9 });
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    // posts
    ctx.strokeStyle = "#f4f1ea";
    ctx.lineWidth = Math.max(3, tl.s * 0.14);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bl.x, bl.y);
    ctx.lineTo(tl.x, tl.y);
    ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(br.x, br.y);
    ctx.stroke();

    const fl = flight.current;

    // Keeper
    const kx = fl ? fl.keeperX : kick.keeper.bias * 0.8;
    const dive = fl?.keeperDive ?? 0;
    const diveDir = fl?.keeperTarget != null ? Math.sign(fl.keeperTarget - kx) || 1 : 0;
    drawPlayer(ctx, project, { x: kx, y: D - 0.6, z: 0 }, "#f0c040", { dive, diveDir });

    // Wall
    const wallH = 1.85 + (fl?.wallJump ?? 0) * 0.42;
    const wallSpan = kick.wall.count * 0.62;
    for (let i = 0; i < kick.wall.count; i++) {
      const wx = kick.wall.centerX - wallSpan / 2 + 0.31 + i * 0.62;
      drawPlayer(ctx, project, { x: wx, y: WALL_Y, z: (fl?.wallJump ?? 0) * 0.42 }, "#2b6cf6", {
        height: wallH - (fl?.wallJump ?? 0) * 0.42,
      });
    }

    // Trail
    if (fl && fl.trail.length > 1) {
      ctx.strokeStyle = "rgba(60,227,154,0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      fl.trail.forEach((p, i) => {
        const q = project(p);
        if (i === 0) ctx.moveTo(q.x, q.y);
        else ctx.lineTo(q.x, q.y);
      });
      ctx.stroke();
    }

    // Ball + shadow
    const bp = fl ? fl.pos : ballStart;
    const sh = project({ x: bp.x, y: bp.y, z: 0 });
    const bq = project(bp);
    const r = Math.max(3, bq.s * 0.11);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(sh.x, sh.y, r * 1.1, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    const ballGrad = ctx.createRadialGradient(bq.x - r * 0.3, bq.y - r * 0.3, r * 0.2, bq.x, bq.y, r);
    ballGrad.addColorStop(0, "#ffffff");
    ballGrad.addColorStop(1, "#c9c9c9");
    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(bq.x, bq.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(bq.x, bq.y, r * 0.45, 0, Math.PI * 2);
    ctx.stroke();

    // Aim guide
    if (drag && phase === "aim") {
      const dx = drag.x - drag.sx;
      const dy = drag.y - drag.sy;
      const len = Math.min(Math.hypot(dx, dy), H * 0.38);
      const power = len / (H * 0.38);
      const ang = Math.atan2(dy, dx);
      const ex = bq.x - Math.cos(ang) * len;
      const ey = bq.y - Math.sin(ang) * len;
      ctx.strokeStyle = `rgba(60,227,154,${0.35 + power * 0.6})`;
      ctx.lineWidth = 3 + power * 6;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(bq.x, bq.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#3ce39a";
      ctx.beginPath();
      ctx.arc(ex, ey, 6 + power * 6, 0, Math.PI * 2);
      ctx.fill();
      // power meter
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(14, H - 150, 10, 120);
      const pg = ctx.createLinearGradient(0, H - 30, 0, H - 150);
      pg.addColorStop(0, "#3ce39a");
      pg.addColorStop(1, "#ff4d5a");
      ctx.fillStyle = pg;
      ctx.fillRect(14, H - 30 - 120 * power, 10, 120 * power);
    }

    // Wind indicator
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "600 11px system-ui, sans-serif";
    ctx.textAlign = "right";
    const w = kick.wind;
    const arrow = w > 0.3 ? "→" : w < -0.3 ? "←" : "·";
    ctx.fillText(`wind ${arrow} ${Math.abs(w).toFixed(1)}`, W - 12, 20);
    ctx.textAlign = "left";
    ctx.fillText(`${kick.distance} m`, 12, 20);
  }, [size, project, kick, drag, phase, ballStart]);

  useEffect(() => {
    draw();
  }, [draw]);

  // --- physics ---------------------------------------------------------------
  const finishAttempt = useCallback(
    (result: AttemptResult, speed: number) => {
      const prev = attemptsRef.current;
      let streak = 0;
      for (let i = prev.length - 1; i >= 0; i--) {
        const r = prev[i]!.result;
        if (r === "topbins" || r === "corner" || r === "goal") streak++;
        else break;
      }
      const scoring = result === "topbins" || result === "corner" || result === "goal";
      const pts = pointsFor(result, speed, scoring ? streak + 1 : 0);
      const log: AttemptLog = { result, points: pts, speed: Math.round(speed * 10) / 10 };
      const next = [...prev, log];
      setAttempts(next);
      try {
        localStorage.setItem(storageKey(kick.dayKey), JSON.stringify(next));
      } catch {
        /* ignore */
      }
      setBanner({
        text: resultLabel(result),
        sub: pts ? `+${pts} pts${streak >= 1 && scoring ? ` · streak x${streak + 1 >= 3 ? "1.5" : "1.25"}` : ""}` : "No points",
        tone: result === "topbins" ? "gold" : scoring ? "mint" : result === "post" ? "beige" : "live",
      });
      setPhase(next.length >= ATTEMPTS_PER_DAY ? "done" : "result");
    },
    [kick.dayKey],
  );

  const step = useCallback(
    (fl: Flight, dt: number) => {
      const D = kick.distance;
      const { pos, vel } = fl;
      const speed = Math.hypot(vel.x, vel.y, vel.z);
      // drag + magnus (curl) + wind
      const kd = 0.0085;
      const ax = -kd * speed * vel.x + fl.launchSpeed * curlRef.current * 0.55 + kick.wind;
      const ay = -kd * speed * vel.y;
      const az = -G - kd * speed * vel.z;
      vel.x += ax * dt;
      vel.y += ay * dt;
      vel.z += az * dt;
      const prevY = pos.y;
      pos.x += vel.x * dt;
      pos.y += vel.y * dt;
      pos.z += vel.z * dt;
      if (pos.z < 0.11) {
        pos.z = 0.11;
        vel.z = -vel.z * 0.45;
        vel.x *= 0.85;
        vel.y *= 0.85;
      }
      fl.t += dt;
      if (fl.trail.length === 0 || Math.hypot(pos.x - fl.trail[fl.trail.length - 1]!.x, pos.y - fl.trail[fl.trail.length - 1]!.y) > 0.4) {
        fl.trail.push({ ...pos });
      }

      // wall jump
      if (kick.wall.jumps) {
        const jt = fl.t - 0.18;
        fl.wallJump = jt > 0 && jt < 0.55 ? Math.sin((jt / 0.55) * Math.PI) : 0;
      }

      // keeper
      if (fl.result == null) {
        if (fl.t >= kick.keeper.reaction) {
          if (fl.keeperTarget == null) {
            // Read the shot: where will it cross the line? plus a bias misread
            const sim = simulateToLine(fl, kick, curlRef.current);
            fl.goalX = sim.x;
            fl.goalZ = sim.z;
            fl.keeperTarget = sim.x + kick.keeper.bias * 1.6;
          }
          const dir = Math.sign(fl.keeperTarget - fl.keeperX);
          const stepX = kick.keeper.speed * dt;
          if (Math.abs(fl.keeperTarget - fl.keeperX) <= stepX) fl.keeperX = fl.keeperTarget;
          else fl.keeperX += dir * stepX;
          fl.keeperDive = Math.min(1, fl.keeperDive + dt * 2.2);
        }
      }

      if (fl.result != null) return;

      // Wall collision
      if (prevY < WALL_Y && pos.y >= WALL_Y) {
        const span = kick.wall.count * 0.62;
        const left = kick.wall.centerX - span / 2;
        const right = kick.wall.centerX + span / 2;
        const h = 1.85 + fl.wallJump * 0.42;
        const zAtWall = pos.z;
        if (pos.x > left - 0.11 && pos.x < right + 0.11 && zAtWall < h) {
          fl.result = "wall";
          fl.resultAt = fl.t;
          vel.y = -vel.y * 0.25;
          vel.x *= 0.4;
          vel.z = Math.max(vel.z * 0.3, 1.2);
          return;
        }
      }

      // Goal line
      if (prevY < D && pos.y >= D) {
        const x = pos.x;
        const z = pos.z;
        const inFrame = Math.abs(x) < GOAL_HALF + POST_R && z < GOAL_H + POST_R;
        if (!inFrame) {
          fl.result = z >= GOAL_H && Math.abs(x) < GOAL_HALF + 0.6 ? "over" : "wide";
        } else if (Math.abs(Math.abs(x) - GOAL_HALF) < POST_R || Math.abs(z - GOAL_H) < POST_R) {
          fl.result = "post";
          vel.y = -vel.y * 0.5;
          vel.x = Math.abs(x) > GOAL_HALF - POST_R ? -Math.sign(x) * Math.abs(vel.x) * 0.6 : vel.x;
        } else {
          // keeper reach shrinks for high balls and when still mid-dive
          const reach = kick.keeper.reach * (1 - 0.5 * (z / GOAL_H)) * (0.55 + 0.45 * fl.keeperDive);
          const saved = Math.abs(x - fl.keeperX) < reach && z < GOAL_H * 0.92;
          if (saved) {
            fl.result = "saved";
            vel.y = -vel.y * 0.2;
            vel.x = Math.sign(x - fl.keeperX || 1) * 3;
            vel.z = 1.5;
          } else if (z > GOAL_H * 0.68 && Math.abs(x) > GOAL_HALF * 0.62) {
            fl.result = "topbins";
          } else if (Math.abs(x) > GOAL_HALF * 0.6) {
            fl.result = "corner";
          } else {
            fl.result = "goal";
          }
        }
        fl.resultAt = fl.t;
      }

      // Lost the ball (rolled/flew away)
      if (pos.y > D + 6 || fl.t > 4) {
        fl.result = fl.result ?? (pos.z > GOAL_H ? "over" : "wide");
        fl.resultAt = fl.t;
      }
    },
    [kick],
  );

  const loop = useCallback(
    (ts: number) => {
      const fl = flight.current;
      if (!fl) return;
      const last = lastTs.current ?? ts;
      lastTs.current = ts;
      let dt = Math.min(0.05, (ts - last) / 1000);
      // net slow-mo for the moment of truth
      const nearLine = fl.pos.y > kick.distance - 4 && fl.result == null;
      if (nearLine) dt *= 0.55;
      const sub = 4;
      for (let i = 0; i < sub; i++) step(fl, dt / sub);
      // damp after result (ball in net)
      if (fl.result != null) {
        fl.vel.x *= 0.9;
        fl.vel.y *= 0.9;
        fl.vel.z *= 0.9;
      }
      draw();
      if (fl.result != null && fl.resultAt != null && fl.t - fl.resultAt > 0.9) {
        const res = fl.result;
        const speed = fl.launchSpeed;
        flight.current = null;
        lastTs.current = null;
        finishAttempt(res, speed);
        return;
      }
      raf.current = requestAnimationFrame(loop);
    },
    [draw, step, finishAttempt, kick.distance],
  );

  useEffect(() => {
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  function kickBall(power: number, lateral: number) {
    const speed = 15 + power * 19; // 15..34 m/s
    const elev = (6 + loft * 20) * (Math.PI / 180);
    // aim toward goal centre by default, lateral shifts it
    const aimX = -kick.offsetX * 0.5 + lateral * 6.5;
    const yaw = Math.atan2(aimX, kick.distance);
    const vx = speed * Math.cos(elev) * Math.sin(yaw);
    const vy = speed * Math.cos(elev) * Math.cos(yaw);
    const vz = speed * Math.sin(elev);
    flight.current = {
      pos: { ...ballStart },
      vel: { x: vx, y: vy, z: vz },
      t: 0,
      trail: [],
      result: null,
      resultAt: null,
      keeperX: kick.keeper.bias * 0.8,
      keeperDive: 0,
      keeperTarget: null,
      wallJump: 0,
      goalX: null,
      goalZ: null,
      launchSpeed: speed,
    };
    setBanner(null);
    setPhase("flight");
    lastTs.current = null;
    raf.current = requestAnimationFrame(loop);
  }

  // --- pointer input ---------------------------------------------------------
  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (phase !== "aim") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDrag({ sx: x, sy: y, x, y });
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drag) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setDrag({ ...drag, x: e.clientX - rect.left, y: e.clientY - rect.top });
  }
  function onPointerUp() {
    if (!drag) return;
    const dx = drag.x - drag.sx;
    const dy = drag.y - drag.sy;
    const len = Math.hypot(dx, dy);
    setDrag(null);
    if (len < 18) return; // tap, not a kick
    const power = Math.min(1, len / (size.h * 0.38));
    // pull back-left → ball goes right (slingshot)
    const lateral = Math.max(-1, Math.min(1, -dx / (size.w * 0.45)));
    kickBall(power, lateral);
  }

  // --- submit when done -------------------------------------------------------
  const total = attempts.reduce((s, a) => s + a.points, 0);
  const submittedRef = useRef(Boolean(alreadyPlayed));
  useEffect(() => {
    if (phase !== "done" || submittedRef.current || !signedIn) return;
    if (attempts.length < ATTEMPTS_PER_DAY) return;
    submittedRef.current = true;
    void submitTopBins(attempts).then((res) => {
      if (res.ok && res.rank) setSubmit({ rank: res.rank, players: res.players ?? 1 });
      else if (res.error) setSubmitError(res.error);
    });
  }, [phase, attempts, signedIn]);

  function share() {
    const line = attempts.map((a) => resultEmoji(a.result)).join("");
    const text = `Top Bins ${kick.dayKey} — ${total} pts\n${line}\n${kick.title} · ${kick.distance}m\nfutbol social → /topbins`;
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  return (
    <div ref={wrapRef} className="fs-topbins">
      <div className="relative mx-auto overflow-hidden rounded-[1.25rem] ring-1 ring-[var(--line-strong)]" style={{ width: size.w, height: size.h }}>
        <canvas
          ref={canvasRef}
          style={{ width: size.w, height: size.h, touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => setDrag(null)}
          className={phase === "aim" ? "cursor-grab active:cursor-grabbing" : ""}
        />

        {/* attempts */}
        <div className="pointer-events-none absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-1.5">
          {Array.from({ length: ATTEMPTS_PER_DAY }).map((_, i) => {
            const a = attempts[i];
            return (
              <span
                key={i}
                className={`grid h-7 w-7 place-items-center rounded-full text-sm ring-1 ${
                  a
                    ? "bg-black/60 ring-white/20"
                    : i === attempts.length && phase !== "done"
                      ? "bg-[var(--sky)]/20 ring-[var(--sky)]"
                      : "bg-black/30 ring-white/10"
                }`}
              >
                {a ? resultEmoji(a.result) : ""}
              </span>
            );
          })}
        </div>

        {banner ? (
          <div className="pointer-events-none absolute inset-x-0 top-[38%] z-10 flex flex-col items-center">
            <p className={`fs-topbins-banner fs-topbins-banner--${banner.tone}`}>{banner.text}</p>
            <p className="mt-1 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
              {banner.sub}
            </p>
          </div>
        ) : null}

        {phase === "aim" && attempts.length === 0 && !drag ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-20 z-10 flex justify-center">
            <p className="fs-pulse rounded-full bg-black/60 px-4 py-1.5 text-xs font-semibold text-white ring-1 ring-white/15">
              Drag back from the ball, let go to shoot
            </p>
          </div>
        ) : null}

        {phase === "result" ? (
          <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center">
            <button
              type="button"
              onClick={() => {
                setBanner(null);
                setPhase("aim");
                draw();
              }}
              className="fs-btn-primary"
            >
              Next kick · {attempts.length}/{ATTEMPTS_PER_DAY}
            </button>
          </div>
        ) : null}

        {phase === "done" ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 px-6 text-center backdrop-blur-sm">
            <p className="fs-kicker !text-[var(--gold)]">Round complete</p>
            <p className="fs-score fs-gold mt-2 text-6xl">{total}</p>
            <p className="mt-1 text-2xl tracking-widest">{attempts.map((a) => resultEmoji(a.result)).join(" ")}</p>
            {submit ? (
              <p className="mt-4 text-sm text-[var(--beige)]">
                Rank <span className="fs-score text-xl">#{submit.rank}</span>
                {submit.players ? ` of ${submit.players} today` : " today"}
              </p>
            ) : signedIn ? (
              <p className="mt-4 text-sm text-[var(--beige-muted)]">{submitError ?? "Posting to the board…"}</p>
            ) : (
              <p className="mt-4 text-sm text-[var(--beige-muted)]">
                <Link href="/login?next=/topbins" className="text-[var(--sky)]">
                  Sign in
                </Link>{" "}
                to get on the leaderboard.
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={share} className="fs-btn-primary">
                {copied ? "Copied!" : "Share result"}
              </button>
              <Link href="/clips" className="fs-btn-ghost">
                Watch clips
              </Link>
            </div>
            <p className="mt-6 text-xs text-[var(--beige-dim)]">New free kick at midnight UTC.</p>
          </div>
        ) : null}
      </div>

      {/* controls */}
      <div className={`mx-auto mt-4 grid gap-4 sm:grid-cols-2 ${phase === "done" ? "opacity-40" : ""}`} style={{ maxWidth: size.w }}>
        <label className="fs-panel block px-4 py-3">
          <span className="flex items-center justify-between text-xs text-[var(--beige-dim)]">
            <span>Loft</span>
            <span className="font-mono text-[var(--beige)]">{Math.round(6 + loft * 20)}°</span>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={loft}
            onChange={(e) => setLoft(Number(e.target.value))}
            disabled={phase !== "aim"}
            className="fs-range mt-2 w-full"
          />
          <span className="mt-1 flex justify-between text-[10px] text-[var(--beige-dim)]">
            <span>Driven</span>
            <span>Dipping</span>
          </span>
        </label>
        <label className="fs-panel block px-4 py-3">
          <span className="flex items-center justify-between text-xs text-[var(--beige-dim)]">
            <span>Curl</span>
            <span className="font-mono text-[var(--beige)]">
              {curl === 0 ? "none" : curl < 0 ? `← ${Math.abs(curl).toFixed(2)}` : `→ ${curl.toFixed(2)}`}
            </span>
          </span>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.01}
            value={curl}
            onChange={(e) => setCurl(Number(e.target.value))}
            disabled={phase !== "aim"}
            className="fs-range mt-2 w-full"
          />
          <span className="mt-1 flex justify-between text-[10px] text-[var(--beige-dim)]">
            <span>Inswing</span>
            <span>Outswing</span>
          </span>
        </label>
      </div>
    </div>
  );
}

/** Where would the current flight cross the goal line, ignoring the keeper. */
function simulateToLine(fl: Flight, kick: DailyKick, curl: number) {
  const pos = { ...fl.pos };
  const vel = { ...fl.vel };
  const dt = 1 / 240;
  let guard = 0;
  while (pos.y < kick.distance && guard++ < 4000) {
    const speed = Math.hypot(vel.x, vel.y, vel.z);
    const kd = 0.0085;
    vel.x += (-kd * speed * vel.x + fl.launchSpeed * curl * 0.55 + kick.wind) * dt;
    vel.y += -kd * speed * vel.y * dt;
    vel.z += (-G - kd * speed * vel.z) * dt;
    pos.x += vel.x * dt;
    pos.y += vel.y * dt;
    pos.z += vel.z * dt;
    if (pos.z < 0.11) {
      pos.z = 0.11;
      vel.z = -vel.z * 0.45;
    }
  }
  return { x: pos.x, z: pos.z };
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  project: (p: Vec3) => { x: number; y: number; s: number },
  base: Vec3,
  color: string,
  opts: { height?: number; dive?: number; diveDir?: number } = {},
) {
  const h = opts.height ?? 1.85;
  const foot = project(base);
  const head = project({ x: base.x, y: base.y, z: base.z + h });
  const bodyW = Math.max(6, foot.s * 0.42);
  const dive = opts.dive ?? 0;
  const dir = opts.diveDir ?? 0;
  ctx.save();
  if (dive > 0 && dir !== 0) {
    // lean/dive toward the ball
    ctx.translate(foot.x, foot.y);
    ctx.rotate(dir * dive * 0.9);
    ctx.translate(-foot.x, -foot.y);
  }
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(foot.x, foot.y, bodyW * 0.9, bodyW * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  // body
  const bodyTop = head.y + (foot.y - head.y) * 0.22;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(foot.x - bodyW / 2, bodyTop, bodyW, foot.y - bodyTop, bodyW * 0.35);
  ctx.fill();
  // arms up (wall) or spread (keeper diving)
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, bodyW * 0.22);
  ctx.lineCap = "round";
  ctx.beginPath();
  if (dive > 0) {
    ctx.moveTo(foot.x - bodyW / 2, bodyTop + bodyW * 0.2);
    ctx.lineTo(foot.x - bodyW * 1.3, bodyTop - bodyW * 0.8);
    ctx.moveTo(foot.x + bodyW / 2, bodyTop + bodyW * 0.2);
    ctx.lineTo(foot.x + bodyW * 1.3, bodyTop - bodyW * 0.8);
  } else {
    ctx.moveTo(foot.x - bodyW / 2, bodyTop + bodyW * 0.3);
    ctx.lineTo(foot.x - bodyW * 0.75, bodyTop + bodyW * 1.1);
    ctx.moveTo(foot.x + bodyW / 2, bodyTop + bodyW * 0.3);
    ctx.lineTo(foot.x + bodyW * 0.75, bodyTop + bodyW * 1.1);
  }
  ctx.stroke();
  // head
  ctx.fillStyle = "#e9c5a3";
  ctx.beginPath();
  ctx.arc(head.x, head.y + bodyW * 0.3, bodyW * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
