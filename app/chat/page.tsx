import Link from "next/link";
import { AdSlot } from "@/components/ads/ad-slot";
import { PageShell } from "@/components/layout/page-shell";
import { MatchCard } from "@/components/match/match-card";
import { BRAND } from "@/lib/brand";
import { listMatches } from "@/lib/matches/data";
import { formatScore, statusClockLabel } from "@/lib/matches/format";

export const metadata = { title: `Chat — ${BRAND.name}` };

export default async function ChatHubPage() {
  const matches = await listMatches();
  const live = matches.filter((m) => m.status === "live");
  const upcoming = matches
    .filter((m) => m.status === "upcoming")
    .sort((a, b) => +new Date(a.kickoffAt) - +new Date(b.kickoffAt))
    .slice(0, 8);
  const featured = live[0] ?? upcoming[0] ?? null;
  const rooms = live.length > 0 ? live : upcoming;

  return (
    <PageShell wide>
      <header className="fs-fade-up">
        <p className="fs-kicker">Hang here while it&apos;s on</p>
        <h1 className="fs-display mt-2 text-4xl text-[var(--beige)] sm:text-5xl">
          Chat
        </h1>
        <p className="fs-hang mt-4 max-w-lg text-sm leading-relaxed text-[var(--beige-muted)]">
          Pick a room. Stay for the 90. Clips and takes only make sense with the
          score ticking next to you.
        </p>
      </header>

      {featured ? (
        <section className="fs-panel mt-8 overflow-hidden fs-fade-up-delay">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3.5 sm:px-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--live)]">
              {featured.status === "live" ? (
                <span className="inline-flex items-center gap-2">
                  <span className="fs-live-dot" /> Jump in live
                </span>
              ) : (
                "Next room to fill"
              )}
            </p>
            <Link
              href={`/matches/${featured.id}?tab=chat`}
              className="fs-btn-primary !px-4 !py-2 text-xs"
            >
              Enter chat
            </Link>
          </div>
          <div className="p-2 sm:p-3">
            <MatchCard match={featured} />
          </div>
        </section>
      ) : null}

      <AdSlot placement="inline" />

      <section className="mt-10">
        <div className="fs-section-head">
          <h2 className="fs-kicker !text-[var(--sky)]">
            {live.length > 0 ? "Live rooms" : "Upcoming rooms"}
          </h2>
          <Link
            href="/matches"
            className="text-[11px] uppercase tracking-wider text-[var(--beige-dim)] hover:text-[var(--beige)]"
          >
            All fixtures
          </Link>
        </div>
        <ul>
          {rooms.length === 0 ? (
            <li className="py-8 text-sm text-[var(--beige-dim)]">
              No rooms yet — sync fixtures or check back near kickoff.
            </li>
          ) : (
            rooms.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/matches/${m.id}?tab=chat`}
                  className="fs-board group flex items-center justify-between gap-3 px-1 py-4"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-[var(--beige)] sm:text-base">
                      {m.homeTeam}{" "}
                      <span className="font-mono text-[var(--sky)]">
                        {formatScore(m)}
                      </span>{" "}
                      {m.awayTeam}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-[var(--beige-dim)]">
                      {m.competitionName}
                      {m.status === "live"
                        ? " · live now"
                        : ` · ${statusClockLabel(m)}`}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] uppercase tracking-wider text-[var(--sky)]">
                    Open →
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>

      <div className="mt-12">
        <Link href="/clips" className="fs-board group flex items-center gap-4 px-1 py-5">
          <div className="min-w-0 flex-1">
            <p className="fs-kicker !text-[var(--sky)]">Between chats</p>
            <p className="fs-display mt-1 text-xl text-[var(--beige)]">Clips</p>
          </div>
          <span className="text-[11px] uppercase tracking-wider text-[var(--sky)]">
            Open →
          </span>
        </Link>
      </div>
    </PageShell>
  );
}
