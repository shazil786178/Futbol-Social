import Link from "next/link";
import { BRAND } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--line)] bg-[rgba(8,7,6,0.85)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-md">
          <p className="fs-display text-base font-medium text-[var(--beige)]">
            {BRAND.name}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--beige-dim)]">
            Independent fan platform. Not affiliated with, endorsed by, or
            connected to FIFA, UEFA, CONCACAF, any club, league, broadcaster, or
            news organization. Club and competition names appear only as
            factual references to real fixtures and fan discussion.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium uppercase tracking-[0.12em] text-[var(--beige-dim)]">
          <Link href="/terms" className="hover:text-[var(--sky)]">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-[var(--sky)]">
            Privacy
          </Link>
          <Link href="/matches" className="hover:text-[var(--sky)]">
            Matches
          </Link>
          <Link href="/clips" className="hover:text-[var(--sky)]">
            Clips
          </Link>
        </nav>
      </div>
    </footer>
  );
}
