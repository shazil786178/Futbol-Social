"use client";

import { useEffect, useRef, useState } from "react";

const R = 54;
const C = 2 * Math.PI * R;

/**
 * Full-screen Futbol IQ reveal on the first home visit of a session: the ring
 * sweeps to your percentile while the number counts up, then it slides away.
 */
export function IqIntro({
  iq,
  rank,
  total,
  username,
  deltaToday,
}: {
  iq: number;
  rank: number;
  total: number;
  username: string;
  deltaToday: number;
}) {
  const [phase, setPhase] = useState<"hidden" | "in" | "out">("hidden");
  const [shown, setShown] = useState(0);
  const raf = useRef<number | null>(null);

  const pct = total > 1 ? Math.max(0.04, 1 - (rank - 1) / (total - 1)) : 0.5;
  const topPct = Math.max(1, Math.round((1 - pct) * 100));

  useEffect(() => {
    const key = "fs-iq-intro-shown";
    let seen = false;
    try {
      seen = sessionStorage.getItem(key) === "1";
    } catch {
      /* private mode */
    }
    if (seen) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      try {
        sessionStorage.setItem(key, "1");
      } catch {
        /* ignore */
      }
      return;
    }
    const t0 = setTimeout(() => setPhase("in"), 0);
    document.documentElement.classList.add("fs-lock-scroll");
    try {
      sessionStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }

    const start = performance.now();
    const dur = 1400;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(iq * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    const out = setTimeout(() => setPhase("out"), 2600);
    const done = setTimeout(() => {
      setPhase("hidden");
      document.documentElement.classList.remove("fs-lock-scroll");
    }, 3300);

    return () => {
      clearTimeout(t0);
      clearTimeout(out);
      clearTimeout(done);
      if (raf.current) cancelAnimationFrame(raf.current);
      document.documentElement.classList.remove("fs-lock-scroll");
    };
  }, [iq]);

  if (phase === "hidden") return null;

  return (
    <div
      className={`fs-iq-intro ${phase === "out" ? "fs-iq-intro--out" : ""}`}
      role="status"
      aria-live="polite"
      onClick={() => {
        setPhase("hidden");
        document.documentElement.classList.remove("fs-lock-scroll");
      }}
    >
      <div className="fs-iq-intro__pitch" aria-hidden />
      <div className="relative z-10 flex flex-col items-center text-center">
        <p className="fs-kicker !text-[var(--gold)]">Futbol IQ · @{username}</p>
        <div className="relative mt-6 grid place-items-center">
          <svg width="200" height="200" viewBox="0 0 140 140" className="fs-iq-intro__ring">
            <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(239,230,216,0.12)" strokeWidth="8" />
            <circle
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke="url(#iqGrad)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={C}
              style={{ ["--iq-target" as string]: `${C * (1 - pct)}` } as React.CSSProperties}
              className="fs-iq-intro__arc"
              transform="rotate(-90 70 70)"
            />
            <defs>
              <linearGradient id="iqGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--sky)" />
                <stop offset="100%" stopColor="var(--gold)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <span className="fs-score fs-gold text-6xl tabular-nums">{shown}</span>
          </div>
        </div>
        <p className="fs-display mt-6 text-2xl text-[var(--beige)]">
          Top {topPct}% of fans
        </p>
        <p className="mt-2 text-sm text-[var(--beige-muted)]">
          Rank #{rank} of {total}
          {deltaToday !== 0 ? (
            <span className={deltaToday > 0 ? "ml-2 text-[var(--sky)]" : "ml-2 text-[var(--live)]"}>
              {deltaToday > 0 ? "+" : ""}
              {deltaToday} today
            </span>
          ) : null}
        </p>
        <p className="mt-10 text-[11px] uppercase tracking-[0.2em] text-[var(--beige-dim)]">
          Tap to skip
        </p>
      </div>
    </div>
  );
}
