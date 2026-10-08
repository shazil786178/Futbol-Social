import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { BRAND } from "@/lib/brand";
import {
  CLUB_ROOM_SECTIONS,
  leagueBadgeClass,
  leagueShort,
} from "@/lib/club-rooms";

export const metadata = { title: `Club rooms — ${BRAND.name}` };

export default function RoomsPage() {
  return (
    <PageShell wide>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--beige-dim)]">
        Unofficial stands
      </p>
      <h1 className="fs-display mt-2 text-4xl text-[var(--beige)]">Clubs</h1>
      <p className="mt-2 max-w-lg text-sm text-[var(--beige-muted)]">
        Fan sections only — not affiliated with any club or league.
      </p>

      <div className="mt-10 space-y-12">
        {CLUB_ROOM_SECTIONS.map((section) => (
          <section key={section.leagueId}>
            <h2 className="border-b border-[var(--line)] pb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--sky)]">
              {section.title}
            </h2>
            <ul className="mt-0 divide-y divide-[var(--line)]">
              {section.clubs.map((club) => (
                <li key={club.slug}>
                  <Link
                    href={`/rooms/${club.slug}`}
                    className="flex items-center justify-between gap-4 py-3.5 transition hover:bg-white/[0.02]"
                  >
                    <span>
                      <span
                        className={`mr-2 inline-block px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${leagueBadgeClass(section.leagueId)}`}
                      >
                        {leagueShort(section.leagueId)}
                      </span>
                      <span className="font-medium text-[var(--beige)]">
                        {club.name}
                      </span>
                    </span>
                    <span className="text-xs text-[var(--beige-dim)]">Enter →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
