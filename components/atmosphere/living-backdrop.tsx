"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Floodlit 3D atmosphere — pitch plane, floating ball, depth plates.
 * Tracks pointer + scroll; disabled on immersive clips and reduced-motion.
 */
export function LivingBackdrop() {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0, scroll: 0 });
  const current = useRef({ x: 0, y: 0, scroll: 0 });

  const immersive =
    pathname.startsWith("/clips") || pathname.startsWith("/highlights");

  useEffect(() => {
    if (immersive) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return;

    let raf = 0;
    let alive = true;

    const onPointer = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      target.current.x = nx;
      target.current.y = ny;
    };

    const onScroll = () => {
      target.current.scroll = window.scrollY;
    };

    const tick = () => {
      if (!alive) return;
      const t = target.current;
      const c = current.current;
      c.x += (t.x - c.x) * 0.06;
      c.y += (t.y - c.y) * 0.06;
      c.scroll += (t.scroll - c.scroll) * 0.08;

      const rotY = c.x * 9;
      const rotX = -c.y * 6 + Math.min(c.scroll * 0.012, 8);
      const shiftY = Math.min(c.scroll * 0.04, 48);

      stage.style.transform = `
        translate3d(${c.x * 18}px, ${c.y * 10 - shiftY}px, 0)
        rotateX(${12 + rotX}deg)
        rotateY(${rotY}deg)
      `;

      root.style.setProperty("--mx", String(c.x));
      root.style.setProperty("--my", String(c.y));
      root.style.setProperty("--sy", String(Math.min(c.scroll * 0.02, 30)));

      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    raf = requestAnimationFrame(tick);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [immersive]);

  if (immersive) return null;

  return (
    <div ref={rootRef} className="fs-living" aria-hidden>
      <div className="fs-living__haze" />

      <div ref={stageRef} className="fs-living__stage">
        {/* Deep pitch plane */}
        <div className="fs-living__pitch">
          <div className="fs-living__pitch-lines" />
          <div className="fs-living__pitch-center" />
        </div>

        {/* Photo plates — stadium grain in depth */}
        <div className="fs-living__plate fs-living__plate--a">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hero-pitch.png" alt="" draggable={false} />
        </div>
        <div className="fs-living__plate fs-living__plate--b">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hero-pitch.png" alt="" draggable={false} />
        </div>

        {/* Floating ball */}
        <div className="fs-living__ball">
          <div className="fs-living__ball-core">
            <span className="fs-living__ball-seam" />
            <span className="fs-living__ball-seam fs-living__ball-seam--2" />
          </div>
          <div className="fs-living__ball-shadow" />
        </div>

        {/* Floodlight discs */}
        <div className="fs-living__orb fs-living__orb--1" />
        <div className="fs-living__orb fs-living__orb--2" />
        <div className="fs-living__orb fs-living__orb--3" />

        {/* Terrace rings */}
        <div className="fs-living__ring fs-living__ring--1" />
        <div className="fs-living__ring fs-living__ring--2" />
      </div>
    </div>
  );
}
