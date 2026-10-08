"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Home" },
  { href: "/matches", label: "Matches" },
  { href: "/fantasy", label: "Fantasy" },
  { href: "/clips", label: "Clips" },
  { href: "/profile", label: "You" },
] as const;

type TabHref = (typeof TABS)[number]["href"];

function TabIcon({ kind }: { kind: TabHref }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (kind) {
    case "/":
      return (
        <svg {...common}>
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />
        </svg>
      );
    case "/matches":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="M12 5v14M3 12h3M18 12h3" />
          <circle cx="12" cy="12" r="2.2" />
        </svg>
      );
    case "/fantasy":
      return (
        <svg {...common}>
          <path d="M8 4h8l3 3-2.5 2.5V20h-9V9.5L5 7z" />
        </svg>
      );
    case "/clips":
      return (
        <svg {...common}>
          <rect x="4" y="3" width="16" height="18" rx="3" />
          <path d="m10 9 5 3-5 3z" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="8.5" r="3.5" />
          <path d="M5 20c1.2-3.4 3.8-5 7-5s5.8 1.6 7 5" />
        </svg>
      );
  }
}

function isActive(href: TabHref, pathname: string) {
  if (href === "/") return pathname === "/";
  if (href === "/clips") return pathname.startsWith("/clips") || pathname.startsWith("/highlights");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileTabBar() {
  const pathname = usePathname();

  const hide =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/welcome") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/clips");

  if (hide) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--line)] bg-[rgba(10,15,26,0.94)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      aria-label="Primary"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {TABS.map((tab) => {
          const active = isActive(tab.href, pathname);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 py-2 transition ${
                  active ? "text-[var(--sky)]" : "text-[var(--beige-dim)]"
                }`}
              >
                <TabIcon kind={tab.href} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
