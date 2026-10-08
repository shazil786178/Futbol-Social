"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Secondary modes — the header already covers the main tabs */
const JUMP = [
  { href: "/feed", label: "Missions" },
  { href: "/predictor", label: "Predict" },
  { href: "/rival", label: "Rival" },
  { href: "/leaderboard", label: "IQ" },
  { href: "/follow", label: "Follow" },
  { href: "/rooms", label: "Clubs" },
] as const;

/** Fun desktop jump rail — one-tap paths without digging through More. */
export function QuickRail() {
  const pathname = usePathname();

  const hide =
    pathname.startsWith("/clips") ||
    pathname.startsWith("/highlights") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth/");

  if (hide) return null;

  return (
    <nav
      className="fs-quick-rail hidden lg:flex"
      aria-label="Quick jump"
    >
      {JUMP.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`fs-quick-rail__chip ${active ? "fs-quick-rail__chip--on" : ""}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
