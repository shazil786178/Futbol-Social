"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MORE_NAV } from "@/lib/brand";

export function NavMoreMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const moreActive = MORE_NAV.some(
    (l) => pathname === l.href || pathname.startsWith(`${l.href}/`),
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className={`px-2.5 py-1.5 text-[12px] font-medium transition ${
          moreActive || open
            ? "text-[var(--beige)]"
            : "text-[var(--beige-dim)] hover:text-[var(--beige)]"
        }`}
      >
        More
        <span className="ml-1 text-[9px] text-[var(--beige-dim)]" aria-hidden>
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 min-w-[11.5rem] border border-[var(--line-strong)] bg-[var(--ink)] py-1 shadow-[0_16px_40px_rgba(0,0,0,0.55)]"
        >
          {MORE_NAV.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                role="menuitem"
                className={`block px-3 py-2 text-[12px] transition hover:bg-white/[0.04] hover:text-[var(--beige)] ${
                  active ? "text-[var(--sky)]" : "text-[var(--beige-muted)]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
