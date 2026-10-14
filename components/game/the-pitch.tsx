"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { pickShirt, takeTouch } from "@/app/pitch/actions";
import {
  PITCH_H,
  PITCH_W,
  simulateKick,
  standingBodies,
  type KickSim,
  type PitchBoard,
  type PitchPoint,
  type Shirt,
  type TouchResult,
} from "@/lib/games/the-pitch";

const PAD = 18;
const STEP_MS = 28;

function toPx(p: PitchPoint, w: number, h: number) {
  const iw = w - PAD * 2;
  const ih = h - PAD * 2;
  return { x: PAD + (p.x / PITCH_W) * iw, y: PAD + (p.y / PITCH_H) * ih };
}

function fromPx(x: number, y: number, w: number, h: number): PitchPoint {
  const iw = w - PAD * 2;
  const ih = h - PAD * 2;
  return {
    x: Math.min(PITCH_W, Math.max(0, ((x - PAD) / iw) * PITCH_W)),
    y: Math.min(PITCH_H, Math.max(0, ((y - PAD) / ih) * PITCH_H)),
  };
}

function keeperPx(which: "gold" | "mint", yMetres: number, w: number, h: number) {
  const x = which === "gold" ? 1.6 : PITCH_W - 1.6;
  return toPx({ x, y: yMetres }, w, h);
}

function resultCopy(r: TouchResult, side: Shirt) {
  if (r === "goal-mint") return side === "mint" ? "MINT SCORES" : "OWN NET";
  if (r === "goal-gold") return side === "gold" ? "GOLD SCORES" : "OWN NET";
  if (r === "save") return "SAVED";
  return "Still in play";
}

function tapeLabel(r: TouchResult) {
  if (r === "save") return "saved";
  if (r === "roll") return "in play";
  return `${r.replace("goal-", "")} goal`;
}

export function ThePitchGame({
  board,
  signedIn,
}: {
  board: PitchBoard;
  signedIn: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const raf = useRef<number | null>(null);
  const samples = useRef<{ x: number; y: number }[]>([]);
  const [side, setSide] = useState<Shirt | null>(board.mySide);
  const [state, setState] = useState(board.state);
  const [recent, setRecent] = useState(board.recent);
  const [spent, setSpent] = useState(board.myTouchToday);
  const [ghost, setGhost] = useState<KickSim | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [frame, setFrame] = useState(0);
  const [flight, setFlight] = useState<KickSim | null>(null);
  const [size] = useState({ w: 720, h: 468 });

  const ball = flight ? flight.path[Math.min(frame, flight.path.length - 1)]! : state.ball;
  const keeperFrame = flight?.keepers[Math.min(frame, (flight.keepers.length || 1) - 1)];
  const ballPx = toPx(ball, size.w, size.h);
  const gold = keeperPx("gold", keeperFrame?.gold ?? PITCH_H / 2, size.w, size.h);
  const mint = keeperPx("mint", keeperFrame?.mint ?? PITCH_H / 2, size.w, size.h);

  useEffect(() => {
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  const play = useCallback((sim: KickSim) => {
    if (raf.current) cancelAnimationFrame(raf.current);
    setFlight(sim);
    setFrame(0);
    const start = performance.now();
    const tick = (now: number) => {
      const i = Math.min(sim.path.length - 1, Math.floor((now - start) / STEP_MS));
      setFrame(i);
      if (i < sim.path.length - 1) raf.current = requestAnimationFrame(tick);
      else setBusy(false);
    };
    raf.current = requestAnimationFrame(tick);
  }, []);

  const pointer = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return null;
      const r = svg.getBoundingClientRect();
      return {
        x: ((e.clientX - r.left) / r.width) * size.w,
        y: ((e.clientY - r.top) / r.height) * size.h,
      };
    },
    [size.h, size.w],
  );

  function aimFrom(pts: { x: number; y: number }[]) {
    const last = pts[pts.length - 1]!;
    const mid = pts[Math.floor(pts.length / 2)] ?? last;
    const end = fromPx(last.x, last.y, size.w, size.h);
    const midM = fromPx(mid.x, mid.y, size.w, size.h);
    const angle = Math.atan2(end.y - state.ball.y, end.x - state.ball.x);
    const power = Math.min(1, Math.hypot(last.x - ballPx.x, last.y - ballPx.y) / 170);
    const a1 = Math.atan2(midM.y - state.ball.y, midM.x - state.ball.x);
    const a2 = Math.atan2(end.y - midM.y, end.x - midM.x);
    let curl = (a2 - a1) / 1.1;
    if (curl > Math.PI) curl -= Math.PI * 2;
    if (curl < -Math.PI) curl += Math.PI * 2;
    curl = Math.max(-1, Math.min(1, curl));
    return { angle, power, curl };
  }

  function preview(pts: { x: number; y: number }[]) {
    const { angle, power, curl } = aimFrom(pts);
    return simulateKick(state.ball, angle, power, {
      curl,
      bodies: standingBodies(recent, state.ball),
    });
  }

  function onDown(e: React.PointerEvent<SVGSVGElement>) {
    if (spent || busy || !side || flight) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture is optional — the drag still tracks pointermove */
    }
    const p = pointer(e);
    if (!p) return;
    samples.current = [p];
    setDrag(p);
    setGhost(preview([p, p]));
  }

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!drag) return;
    const p = pointer(e);
    if (!p) return;
    samples.current = [...samples.current, p].slice(-14);
    setDrag(p);
    setGhost(preview(samples.current));
  }

  async function onUp(e: React.PointerEvent<SVGSVGElement>) {
    if (!drag || !side) {
      setDrag(null);
      setGhost(null);
      return;
    }
    const p = pointer(e);
    const pts = p ? [...samples.current, p] : samples.current;
    setDrag(null);
    samples.current = [];
    const { angle, power, curl } = aimFrom(pts);
    if (power < 0.12) {
      setGhost(null);
      return;
    }
    const sim = preview(pts);
    setGhost(null);
    setBusy(true);
    setErr(null);
    play(sim);

    if (!signedIn) {
      setBanner("Sign in to send this to Earth");
      window.setTimeout(() => {
        setBanner(null);
        setFlight(null);
      }, sim.path.length * STEP_MS + 900);
      return;
    }

    const out = await takeTouch(side, angle, power, curl);
    if (out.error) {
      if (raf.current) cancelAnimationFrame(raf.current);
      setFlight(null);
      setBusy(false);
      setErr(out.error);
      setState(out.board.state);
      setSpent(out.board.myTouchToday);
      return;
    }
    setState(out.board.state);
    setRecent(out.board.recent);
    setSpent(true);
    setBanner(resultCopy(out.result, side));
    window.setTimeout(() => {
      setBanner(null);
      setFlight(null);
    }, Math.max(900, sim.path.length * STEP_MS));
  }

  async function choose(s: Shirt) {
    setSide(s);
    if (!signedIn) return;
    const r = await pickShirt(s);
    if (r.error) setErr(r.error);
  }

  const trail = (ghost?.path ?? []).map((pt) => toPx(pt, size.w, size.h));
  const d = trail.length
    ? `M ${trail[0]!.x} ${trail[0]!.y} ` + trail.slice(1).map((pt) => `L ${pt.x} ${pt.y}`).join(" ")
    : "";
  const flash =
    flight && frame > flight.path.length - 3
      ? flight.result === "goal-mint"
        ? "mint"
        : flight.result === "goal-gold"
          ? "gold"
          : flight.result === "save"
            ? "save"
            : null
      : null;

  return (
    <div className="fs-pitch">
      <div className="fs-pitch__score">
        <div className={`fs-pitch__shirt ${side === "mint" ? "is-on" : ""}`}>
          <span className="fs-kicker !text-[var(--sky)]">Mint</span>
          <span className="fs-score text-4xl text-[var(--sky)]">{state.mintScore}</span>
        </div>
        <div className="text-center">
          <p className="fs-kicker">The Pitch · Earth</p>
          <p className="mt-1 text-xs text-[var(--beige-dim)]">
            Move #{state.moveNumber}
            {board.players ? ` · ${board.players} shirts` : ""}
            {spent ? " · your touch is in" : side ? " · one touch today" : ""}
          </p>
        </div>
        <div className={`fs-pitch__shirt ${side === "gold" ? "is-on" : ""}`}>
          <span className="fs-kicker !text-[var(--gold)]">Gold</span>
          <span className="fs-score fs-gold text-4xl">{state.goldScore}</span>
        </div>
      </div>

      {!side ? (
        <div className="fs-pitch__pick">
          <p className="fs-display text-2xl">Pick a shirt. You keep it.</p>
          <p className="mt-1 text-sm text-[var(--beige-muted)]">
            Mint attacks the right net. Gold attacks the left. The last people who
            touched the ball are still standing on it. Hook your swipe to curl it
            past the keeper.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" className="fs-btn-primary" onClick={() => void choose("mint")}>
              Wear mint
            </button>
            <button
              type="button"
              className="rounded-full bg-[var(--gold)] px-5 py-2.5 text-sm font-semibold text-[var(--ink)]"
              onClick={() => void choose("gold")}
            >
              Wear gold
            </button>
          </div>
        </div>
      ) : null}

      <div className={`fs-pitch__field mt-4 ${flash ? `fs-pitch__field--${flash}` : ""}`}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${size.w} ${size.h}`}
          role="application"
          aria-label="The pitch"
          className="h-auto w-full touch-none select-none"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={(e) => void onUp(e)}
          onPointerCancel={() => {
            setDrag(null);
            setGhost(null);
            samples.current = [];
          }}
        >
          <defs>
            <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#187a58" />
              <stop offset="100%" stopColor="#0b3d2e" />
            </linearGradient>
            <radialGradient id="flood" cx="50%" cy="0%" r="80%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.16)" />
              <stop offset="70%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
          </defs>
          <rect width={size.w} height={size.h} rx="18" fill="url(#grass)" />
          <rect width={size.w} height={size.h} rx="18" fill="url(#flood)" />
          {Array.from({ length: 10 }, (_, i) => (
            <rect
              key={i}
              x={PAD + ((size.w - PAD * 2) / 10) * i}
              y={PAD}
              width={(size.w - PAD * 2) / 10}
              height={size.h - PAD * 2}
              fill={i % 2 === 0 ? "rgba(255,255,255,0.035)" : "transparent"}
            />
          ))}
          <rect x={PAD} y={PAD} width={size.w - PAD * 2} height={size.h - PAD * 2} fill="none" stroke="rgba(241,244,249,0.55)" strokeWidth="2" />
          <line x1={size.w / 2} y1={PAD} x2={size.w / 2} y2={size.h - PAD} stroke="rgba(241,244,249,0.4)" strokeWidth="1.5" />
          <circle cx={size.w / 2} cy={size.h / 2} r={48} fill="none" stroke="rgba(241,244,249,0.4)" strokeWidth="1.5" />
          <rect x={PAD} y={size.h / 2 - 62} width="52" height="124" fill="none" stroke="rgba(241,244,249,0.35)" />
          <rect x={size.w - PAD - 52} y={size.h / 2 - 62} width="52" height="124" fill="none" stroke="rgba(241,244,249,0.35)" />
          <rect x={2} y={size.h / 2 - 36} width="16" height="72" rx="2" fill="var(--gold)" opacity={flash === "gold" ? 1 : 0.8} />
          <rect x={size.w - 18} y={size.h / 2 - 36} width="16" height="72" rx="2" fill="var(--sky)" opacity={flash === "mint" ? 1 : 0.8} />

          {recent.slice(0, 8).map((t) => {
            const p = toPx(t.to, size.w, size.h);
            if (Math.hypot(p.x - ballPx.x, p.y - ballPx.y) < 16) return null;
            return (
              <g key={t.id}>
                <circle cx={p.x} cy={p.y} r="11" fill={t.side === "mint" ? "var(--sky)" : "var(--gold)"} opacity="0.9" />
                <text x={p.x} y={p.y + 3.5} textAnchor="middle" fontSize="9" fontWeight="700" fill="#0a0f1a">
                  {t.username.slice(0, 1).toUpperCase()}
                </text>
              </g>
            );
          })}

          {d ? (
            <path d={d} fill="none" stroke="rgba(241,244,249,0.7)" strokeWidth="2" strokeDasharray="5 6" strokeLinecap="round" />
          ) : null}

          <g>
            <circle cx={gold.x} cy={gold.y} r="13" fill="#101820" stroke="var(--gold)" strokeWidth="2" />
            <text x={gold.x} y={gold.y + 3} textAnchor="middle" fontSize="8" fill="var(--gold)">GK</text>
          </g>
          <g>
            <circle cx={mint.x} cy={mint.y} r="13" fill="#101820" stroke="var(--sky)" strokeWidth="2" />
            <text x={mint.x} y={mint.y + 3} textAnchor="middle" fontSize="8" fill="var(--sky)">GK</text>
          </g>

          <circle cx={ballPx.x} cy={ballPx.y} r={flight ? 8 : 9} fill="#f7f7f2" stroke="#111" strokeWidth="1.2" className="fs-pitch__ball" />
          {drag ? (
            <line x1={ballPx.x} y1={ballPx.y} x2={drag.x} y2={drag.y} stroke="var(--beige)" strokeWidth="2" strokeDasharray="4 4" />
          ) : null}
        </svg>
        {banner ? <div className="fs-pitch__banner">{banner}</div> : null}
      </div>

      <p className="mt-3 text-center text-sm text-[var(--beige-muted)]">
        {spent
          ? "That touch is on Earth's tape. Come back tomorrow — someone else will have moved it."
          : side
            ? "Drag from the ball. Bend the swipe to curl it. The shirts on the grass are real people."
            : "Pick a shirt. Then the street is yours for one touch."}
        {!signedIn && side ? (
          <>
            {" "}
            <Link href="/login?next=/pitch" className="text-[var(--sky)]">
              Sign in
            </Link>{" "}
            so it counts for the planet.
          </>
        ) : null}
      </p>
      {!board.persisted ? (
        <p className="mt-1 text-center text-xs text-[var(--beige-dim)]">
          Run migration 018 in Supabase so every phone shares this one ball.
        </p>
      ) : null}
      {err ? <p className="mt-2 text-center text-sm text-[var(--live)]">{err}</p> : null}

      {recent.length > 0 ? (
        <ol className="fs-pitch__tape mt-6 space-y-2">
          {recent.slice(0, 10).map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
              <span>
                <span className={t.side === "mint" ? "text-[var(--sky)]" : "text-[var(--gold)]"}>
                  @{t.username}
                </span>
                <span className="text-[var(--beige-dim)]"> · move {t.moveNumber}</span>
              </span>
              <span className="text-xs uppercase tracking-wider text-[var(--beige-dim)]">{tapeLabel(t.result)}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
