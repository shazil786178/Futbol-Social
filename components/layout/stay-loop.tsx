"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Persistent “don’t leave” cue — next live room or unfinished daily job. */
export function StayLoop({
  href,
  label,
  live,
}: {
  href: string;
  label: string;
  live?: boolean;
}) {
  const pathname = usePathname();
  if (
    pathname.startsWith("/clips") ||
    pathname.startsWith("/call") ||
    pathname.startsWith("/pitch") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup")
  ) {
    return null;
  }

  return (
    <aside className="fs-stay">
      <Link href={href}>
        {live ? "Still on · " : "Next · "}
        {label}
      </Link>
    </aside>
  );
}
