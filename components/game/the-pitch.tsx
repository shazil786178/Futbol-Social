"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { pickShirt, takeTouch } from "@/app/pitch/actions";
import {
  PITCH_H,
  PITCH_W,
  simulateKick,
  type PitchBoard,
  type PitchPoint,
  type Shirt,
  type TouchResult,
} from "@/lib/games/the-pitch";

const PAD = 18;

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

function resultCopy(r: TouchResult, side: Shirt) {
  if (r === "goal-mint") return side === "mint" ? "MINT SCORES" : "OWN NET — mint";
  if (r === "goal-gold") return side === "gold" ? "GOLD SCORES" : "OWN NET — gold";
  return "Still in play";
}

export function ThePitchGame({
  board,
  signedIn,
}: {
  board: PitchBoard;
  signedIn: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [side, setSide] = useState<Shirt | null>(board.mySide);
  const [state, setState] = useState(board.state);
  const [recent, setRecent] = useState(board.recent);
  const [spent, setSpent] = useState(board.myTouchToday);
  const [path, setPath] = useState<PitchPoint[]>([]);
  const [ghost, setGhost] = useState<PitchPoint[] | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [size] = useState({ w: 720, h: 468 });

  const ballPx = toPx(state.ball, size.w, size.h);

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

  function aimFrom(pt: { x: number; y: number }) {
    const dx = pt.x - ballPx.x;
    const dy = pt.y - ballPx.y;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(
      fromPx(pt.x, pt.y, size.w, size.h).y - state.ball.y,
      fromPx(pt.x, pt.y, size.w, size.h).x - state.ball.x,
    );
    const power = Math.min(1, dist / 160);
    return { angle, power };
  }

  function onDown(e: React.PointerEvent<SVGSVGElement>) {
    if (spent || busy || !side) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pointer(e);
    if (!p) return;
    setDrag(p);
    const { angle, power } = aimFrom(p);
    setGhost(simulateKick(state.ball, angle, power).path);
  }

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!drag) return;
    const p = pointer(e);
    if (!p) return;
    setDrag(p);
    const { angle, power } = aimFrom(p);
    setGhost(simulateKick(state.ball, angle, power).path);
  }

  async function onUp(e: React.PointerEvent<SVGSVGElement>) {
    if (!drag || !side) {
      setDrag(null);
      setGhost(null);
      return;
    }
    const p = pointer(e) ?? drag;
    setDrag(null);
    const { angle, power } = aimFrom(p);
    if (power < 0.12) {
      setGhost(null);
      return;
    }
    setBusy(true);
    setErr(null);
    const preview = simulateKick(state.ball, angle, power);
    setPath(preview.path);
    setGhost(null);

    const out = await takeTouch(side, angle, power);
    if (out.error) {
      setErr(out.error);
      setPath([]);
      setState(out.board.state);
    } else {
      setState(out.board.state);
      setRecent(out.board.recent);
      setSpent(true);
      setPath(out.path.length ? out.path : preview.path);
      setBanner(resultCopy(out.result, side));
      setTimeout(() => setBanner(null), 2800);
    }
    setBusy(false);
  }

  async function choose(s: Shirt) {
    setSide(s);
    if (!signedIn) return;
    const r = await pickShirt(s);
    if (r.error) setErr(r.error);
  }

  const trail = (ghost ?? path).map((p) => toPx(p, size.w, size.h));
  const d = trail.length
    ? `M ${trail[0]!.x} ${trail[0]!.y} ` + trail.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ")
    : "";

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
            Move #{state.moveNumber} · {board.players} shirts
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
            Mint attacks the right net. Gold attacks the left. One touch a day — the
            same ball everyone else is kicking.
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
          {!signedIn ? (
            <p className="mt-3 text-sm">
              <Link href="/login?next=/pitch" className="text-[var(--sky)]">
                Sign in
              </Link>{" "}
              so the touch counts.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="fs-pitch__field mt-4">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${size.w} ${size.h}`}
          className="h-auto w-full touch-none select-none"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => {
            setDrag(null);
            setGhost(null);
          }}
        >
          <defs>
            <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#146046" />
              <stop offset="100%" stopColor="#0c3a2c" />
            </linearGradient>
          </defs>
          <rect width={size.w} height={size.h} rx="18" fill="url(#grass)" />
          {Array.from({ length: 10 }, (_, i) => (
            <rect
              key={i}
              x={PAD + ((size.w - PAD * 2) / 10) * i}
              y={PAD}
              width={(size.w - PAD * 2) / 10}
              height={size.h - PAD * 2}
              fill={i % 2 === 0 ? "rgba(255,255,255,0.03)" : "transparent"}
            />
          ))}
          <rect
            x={PAD}
            y={PAD}
            width={size.w - PAD * 2}
            height={size.h - PAD * 2}
            fill="none"
            stroke="rgba(241,244,249,0.55)"
            strokeWidth="2"
          />
          <line
            x1={size.w / 2}
            y1={PAD}
            x2={size.w / 2}
            y2={size.h - PAD}
            stroke="rgba(241,244,249,0.45)"
            strokeWidth="1.5"
          />
          <circle
            cx={size.w / 2}
            cy={size.h / 2}
            r={48}
            fill="none"
            stroke="rgba(241,244,249,0.45)"
            strokeWidth="1.5"
          />
          <rect x={PAD} y={size.h / 2 - 52} width="44" height="104" fill="none" stroke="rgba(241,244,249,0.45)" />
          <rect x={size.w - PAD - 44} y={size.h / 2 - 52} width="44" height="104" fill="none" stroke="rgba(241,244,249,0.45)" />
          <rect x={4} y={size.h / 2 - 28} width="14" height="56" fill="var(--gold)" opacity="0.85" />
          <rect x={size.w - 18} y={size.h / 2 - 28} width="14" height="56" fill="var(--sky)" opacity="0.85" />

          {recent.slice(0, 8).map((t) => {
            const a = toPx(t.from, size.w, size.h);
            const b = toPx(t.to, size.w, size.h);
            return (
              <line
                key={t.id}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={t.side === "mint" ? "rgba(60,227,154,0.28)" : "rgba(255,198,92,0.28)"}
                strokeWidth="2"
                strokeLinecap="round"
              />
            );
          })}

          {d ? (
            <path
              d={d}
              fill="none"
              stroke={ghost ? "rgba(241,244,249,0.45)" : "var(--beige)"}
              strokeWidth={ghost ? 2 : 3}
              strokeDasharray={ghost ? "6 6" : "0"}
              strokeLinecap="round"
            />
          ) : null}

          <circle
            cx={ballPx.x}
            cy={ballPx.y}
            r="9"
            fill="#f7f7f2"
            stroke="#111"
            strokeWidth="1.2"
            className={busy ? "fs-pitch__ball--fly" : "fs-pitch__ball"}
          />
          {drag ? (
            <line
              x1={ballPx.x}
              y1={ballPx.y}
              x2={drag.x}
              y2={drag.y}
              stroke="var(--beige)"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          ) : null}
        </svg>

        {banner ? <div className="fs-pitch__banner">{banner}</div> : null}
      </div>

      <p className="mt-3 text-center text-sm text-[var(--beige-muted)]">
        {!board.persisted
          ? "Run migration 018 in Supabase so the planet shares one ball."
          : spent
            ? "Your touch is on the tape. Come back tomorrow — the ball will have moved."
            : side
              ? "Drag from the ball. Power is how far you pull. One touch a day."
              : "Pick a shirt to get on the pitch."}
      </p>
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
              <span className="text-xs uppercase tracking-wider text-[var(--beige-dim)]">
                {t.result === "roll" ? "rolled" : t.result.replace("goal-", "") + " goal"}
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
