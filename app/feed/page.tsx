import Link from "next/link";
import { AdSlot } from "@/components/ads/ad-slot";
import { PageShell } from "@/components/layout/page-shell";
import { MatchCard } from "@/components/match/match-card";
import { DailyHub } from "@/components/today/daily-hub";
import { BRAND } from "@/lib/brand";
import { listMatches } from "@/lib/matches/data";
import { getDailyState } from "@/lib/streaks/daily";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: `Today — ${BRAND.name}`,
};

function pickMatchOfDay(
  matches: Awaited<ReturnType<typeof listMatches>>,
) {
  const live = matches.filter((m) => m.status === "live");
  if (live[0]) return live[0];
  const today = new Date().toDateString();
  const todayUpcoming = matches
    .filter(
      (m) =>
        m.status === "upcoming" &&
        new Date(m.kickoffAt).toDateString() === today,
    )
    .sort((a, b) => +new Date(a.kickoffAt) - +new Date(b.kickoffAt));
  if (todayUpcoming[0]) return todayUpcoming[0];
  return (
    matches
      .filter((m) => m.status === "upcoming")
      .sort((a, b) => +new Date(a.kickoffAt) - +new Date(b.kickoffAt))[0] ??
    null
  );
}

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const matches = await listMatches();
  const daily = user ? await getDailyState(supabase, user.id) : null;
  const matchOfDay = pickMatchOfDay(matches);

  const live = matches.filter((m) => m.status === "live");
  const today = new Date().toDateString();
  const todayMatches = matches.filter(
    (m) => new Date(m.kickoffAt).toDateString() === today,
  );
  const nextUp = matches
    .filter((m) => m.status === "upcoming")
    .sort((a, b) => +new Date(a.kickoffAt) - +new Date(b.kickoffAt))
    .slice(0, 6);

  return (
    <PageShell wide>
      <header className="fs-fade-up mb-8">
        <p className="fs-kicker">Daily board</p>
        <h1 className="fs-display mt-2 text-4xl text-[var(--beige)] sm:text-5xl">
          Today
        </h1>
        <p className="fs-hang mt-4 max-w-lg text-sm leading-relaxed text-[var(--beige-muted)]">
          One fixture that matters. Clear the board. Stay in the room when
          it&apos;s live.
        </p>
      </header>

      <div className="fs-fade-up-delay">
        <DailyHub
          daily={daily}
          matchOfDay={matchOfDay}
          signedIn={Boolean(user)}
        />
      </div>

      <AdSlot placement="feed" compact />

      {live.length > 0 ? (
        <section className="mt-10 fs-fade-up-delay-2">
          <div className="fs-section-head">
            <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--live)]">
              <span className="fs-live-dot" />
              Live now
            </h2>
          </div>
          <div className="mt-2">
            {live.map((m) => (
              <div key={m.id}>
                <MatchCard match={m} />
                <Link
                  href={`/matches/${m.id}?tab=chat`}
                  className="mb-2 mt-1 inline-block text-xs font-semibold uppercase tracking-wider text-[var(--sky)]"
                >
                  Open live chat →
                </Link>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {(todayMatches.length > 0 ? todayMatches : nextUp).length > 0 ? (
        <section className="mt-12">
          <div className="fs-section-head">
            <h2 className="fs-kicker">
              {todayMatches.length > 0 ? "Rest of today" : "Next kickoffs"}
            </h2>
            <Link
              href="/matches"
              className="text-[11px] uppercase tracking-wider text-[var(--beige-dim)] hover:text-[var(--sky)]"
            >
              Full board
            </Link>
          </div>
          <div className="mt-2">
            {(todayMatches.length > 0 ? todayMatches : nextUp).map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
