"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV } from "@/lib/brand";
import { NavMoreMenu } from "@/components/layout/nav-more-menu";

export function DesktopPrimaryNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 md:flex">
      {PRIMARY_NAV.map((link) => {
        const active =
          link.href === "/matches"
            ? pathname.startsWith("/matches")
            : link.href === "/shots"
              ? pathname.startsWith("/shots") ||
                pathname.startsWith("/players") ||
                pathname.startsWith("/teams")
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
              active
                ? "bg-[var(--ink-soft)] text-[var(--beige)] shadow-[inset_0_0_0_1px_var(--line-strong)]"
                : "text-[var(--beige-dim)] hover:text-[var(--beige)]"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
      <NavMoreMenu />
    </nav>
  );
}
