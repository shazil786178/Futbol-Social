import Link from "next/link";
import { AdSlot } from "@/components/ads/ad-slot";
import { PageShell } from "@/components/layout/page-shell";
import { LiveMatchesGrid } from "@/components/match/live-matches-grid";
import { BRAND, COMPETITIONS } from "@/lib/brand";
import { listMatches } from "@/lib/matches/data";
import type { Match, MatchStatus } from "@/lib/matches/types";

export const metadata = {
  title: `Matches — ${BRAND.name}`,
};

/** Hide finished games older than this many days (default view). */
const RECENT_DAYS = 3;

const STATUS_FILTERS: { id: MatchStatus | "today" | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "live", label: "Live" },
  { id: "upcoming", label: "Upcoming" },
  { id: "finished", label: "Recent" },
];

function startOfLocalDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function groupMatches(matches: Match[]) {
  const todayStart = startOfLocalDay();
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const recentCutoff = new Date(todayStart);
  recentCutoff.setDate(recentCutoff.getDate() - RECENT_DAYS);

  const live: Match[] = [];
  const today: Match[] = [];
  const upcoming: Match[] = [];
  const recent: Match[] = [];

  for (const m of matches) {
    const kickoff = new Date(m.kickoffAt);

    if (m.status === "live") {
      live.push(m);
      continue;
    }

    if (kickoff >= todayStart && kickoff < tomorrowStart) {
      today.push(m);
      continue;
    }

    if (m.status === "upcoming" || kickoff >= tomorrowStart) {
      upcoming.push(m);
      continue;
    }

    if (kickoff >= recentCutoff) {
      recent.push(m);
    }
  }

  live.sort((a, b) => +new Date(a.kickoffAt) - +new Date(b.kickoffAt));
  today.sort((a, b) => +new Date(a.kickoffAt) - +new Date(b.kickoffAt));
  upcoming.sort((a, b) => +new Date(a.kickoffAt) - +new Date(b.kickoffAt));
  recent.sort((a, b) => +new Date(b.kickoffAt) - +new Date(a.kickoffAt));

  return { live, today, upcoming, recent };
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`fs-filter ${active ? "fs-filter--active" : ""}`}
    >
      {children}
    </Link>
  );
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ league?: string; status?: string }>;
}) {
  const { league, status: statusFilter } = await searchParams;
  let matches = await listMatches(league);

  const todayStart = startOfLocalDay();
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const recentCutoff = new Date(todayStart);
  recentCutoff.setDate(recentCutoff.getDate() - RECENT_DAYS);

  if (statusFilter === "live") {
    matches = matches.filter((m) => m.status === "live");
  } else if (statusFilter === "upcoming") {
    matches = matches.filter(
      (m) =>
        m.status === "upcoming" || new Date(m.kickoffAt) >= tomorrowStart,
    );
  } else if (statusFilter === "finished") {
    matches = matches.filter((m) => {
      const k = new Date(m.kickoffAt);
      return m.status === "finished" && k >= recentCutoff && k < todayStart;
    });
  } else if (statusFilter === "today") {
    matches = matches.filter((m) => {
      const k = new Date(m.kickoffAt);
      return k >= todayStart && k < tomorrowStart;
    });
  } else {
    const weekAhead = new Date(todayStart);
    weekAhead.setDate(weekAhead.getDate() + 7);
    matches = matches.filter((m) => {
      const k = new Date(m.kickoffAt);
      return k >= recentCutoff && k < weekAhead;
    });
  }

  const grouped = groupMatches(matches);
  const live = grouped.live;
  const today = grouped.today;
  const upcoming = grouped.upcoming.slice(0, statusFilter === "upcoming" ? 120 : 40);
  const recent = grouped.recent.slice(0, statusFilter === "finished" ? 120 : 30);
  const hasFixtures =
    live.length + today.length + upcoming.length + recent.length > 0;

  return (
    <PageShell wide>
      <header className="fs-fade-up">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="fs-kicker">The board</p>
            <h1 className="fs-display mt-2 text-4xl font-semibold text-[var(--beige)] sm:text-5xl">
              Matches
            </h1>
          </div>
          {(live.length > 0 || today.length > 0) && !statusFilter ? (
            <p className="text-xs text-[var(--beige-dim)]">
              {live.length > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-[var(--live)]">
                  <span className="fs-live-dot" />
                  {live.length} live
                </span>
              ) : (
                `${today.length} today`
              )}
            </p>
          ) : null}
        </div>
      </header>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1 fs-fade-up-delay">
        {STATUS_FILTERS.map((s) => (
          <FilterChip
            key={s.id}
            href={`/matches?${league ? `league=${league}&` : ""}status=${s.id}`}
            active={
              statusFilter === s.id || (!statusFilter && s.id === "all")
            }
          >
            {s.label}
          </FilterChip>
        ))}
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1 fs-fade-up-delay">
        <FilterChip
          href={`/matches?${statusFilter ? `status=${statusFilter}` : ""}`}
          active={!league}
        >
          All leagues
        </FilterChip>
        {COMPETITIONS.active.map((c) => (
          <FilterChip
            key={c.id}
            href={`/matches?league=${c.id}${statusFilter ? `&status=${statusFilter}` : ""}`}
            active={league === c.id}
          >
            {c.name}
          </FilterChip>
        ))}
      </div>

      {hasFixtures ? (
        <div className="mt-2 fs-fade-up-delay-2">
          <LiveMatchesGrid
            live={live}
            today={today}
            upcoming={upcoming}
            recent={recent}
          />
        </div>
      ) : (
        <p className="fs-panel mt-8 px-4 py-3 text-sm text-[var(--beige-muted)]">
          No fixtures in this window yet. The board refreshes itself in the
          background. Check back in a minute.
        </p>
      )}

      <AdSlot placement="inline" />
    </PageShell>
  );
}
