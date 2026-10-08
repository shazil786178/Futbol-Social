import { MatchCard } from "@/components/match/match-card";
import type { Match } from "@/lib/matches/types";

function Section({
  title,
  tone,
  matches,
  live,
}: {
  title: string;
  tone: string;
  matches: Match[];
  live?: boolean;
}) {
  if (matches.length === 0) return null;

  return (
    <section className="mt-8 first:mt-4">
      <div className="fs-section-head">
        <h2 className={`fs-display flex items-center gap-2 text-xl ${tone}`}>
          {live ? <span className="fs-live-dot" /> : null}
          {title}
          <span className="text-sm font-normal text-[var(--beige-dim)]">
            {matches.length}
          </span>
        </h2>
      </div>
      <div className="grid gap-x-3 sm:grid-cols-2">
        {matches.map((m) => (
          <MatchCard key={m.id} match={m} />
        ))}
      </div>
    </section>
  );
}

export function LiveMatchesGrid({
  live,
  today,
  upcoming,
  recent,
}: {
  live: Match[];
  today: Match[];
  upcoming: Match[];
  recent: Match[];
}) {
  const empty =
    live.length === 0 &&
    today.length === 0 &&
    upcoming.length === 0 &&
    recent.length === 0;

  if (empty) {
    return (
      <p className="mt-8 text-[var(--beige-dim)]">No matches in this filter.</p>
    );
  }

  const todayRest = today.filter((m) => m.status !== "live");

  return (
    <div>
      <Section title="Live now" tone="text-[var(--live)]" matches={live} live />
      <Section title="Today" tone="text-[var(--beige)]" matches={todayRest} />
      <Section title="Upcoming" tone="text-[var(--beige)]" matches={upcoming} />
      <Section
        title="Recent results"
        tone="text-[var(--beige-muted)]"
        matches={recent}
      />
    </div>
  );
}
