import Link from "next/link";
import type { DailyState } from "@/lib/streaks/daily";
import type { Match } from "@/lib/matches/types";
import { formatScore, statusClockLabel } from "@/lib/matches/format";

export function DailyHub({
  daily,
  matchOfDay,
  signedIn,
}: {
  daily: DailyState | null;
  matchOfDay: Match | null;
  signedIn: boolean;
}) {
  const streak = daily?.streakCount ?? 0;
  const done = daily?.completedToday ?? 0;
  const total = daily?.totalMissions ?? 4;
  const openMissions = daily?.missions.filter((m) => !m.done) ?? [];

  return (
    <section className="fs-panel overflow-hidden">
      {matchOfDay ? (
        <div className="border-b border-[var(--line-strong)] px-4 py-5 sm:px-6">
          <p className="fs-kicker !text-[var(--sky)]">Match of the day</p>
          <Link
            href={`/matches/${matchOfDay.id}`}
            className="mt-3 block group"
          >
            <p className="fs-display text-[1.65rem] leading-tight text-[var(--beige)] sm:text-3xl">
              {matchOfDay.homeTeam}{" "}
              <span className="fs-board-score font-mono text-[var(--sky)]">
                {formatScore(matchOfDay)}
              </span>{" "}
              {matchOfDay.awayTeam}
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[var(--beige-dim)] group-hover:text-[var(--beige-muted)]">
              {matchOfDay.competitionName} · {statusClockLabel(matchOfDay)} ·
              enter room
            </p>
          </Link>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium">
            <Link
              href={`/matches/${matchOfDay.id}?tab=chat`}
              className="text-[var(--sky)] hover:text-[var(--beige)]"
            >
              Chat
            </Link>
            <Link
              href={`/matches/${matchOfDay.id}?tab=predictor`}
              className="text-[var(--beige-muted)] hover:text-[var(--beige)]"
            >
              Predict
            </Link>
            <Link
              href={`/rival?match=${matchOfDay.id}`}
              className="text-[var(--beige-muted)] hover:text-[var(--beige)]"
            >
              Rival
            </Link>
            <Link
              href="/clips"
              className="text-[var(--beige-muted)] hover:text-[var(--beige)]"
            >
              Clips
            </Link>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-4 px-4 py-4 sm:px-6">
        <div>
          <p className="fs-kicker">Daily streak</p>
          <h2 className="fs-display mt-1 text-2xl text-[var(--beige)]">
            {signedIn
              ? streak > 0
                ? `${streak}-day run`
                : "Start today’s run"
              : "Keep a daily board"}
          </h2>
          <p className="mt-1 max-w-md text-sm text-[var(--beige-muted)]">
            {signedIn
              ? done >= total
                ? "Board cleared — jump a live room or come back tomorrow."
                : `${done}/${total} cleared · miss a day and it resets.`
              : "Sign in. Pick a fixture. Stay for the 90."}
          </p>
        </div>
        {signedIn ? (
          <div className="text-right">
            <p className="font-mono text-3xl font-semibold tabular-nums text-[var(--sky)]">
              {done}/{total}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-[var(--beige-dim)]">
              Best {daily?.streakBest ?? 0}d
            </p>
          </div>
        ) : (
          <Link href="/signup" className="fs-btn-primary !py-2.5 text-xs">
            Join free
          </Link>
        )}
      </div>

      {signedIn && openMissions.length > 0 ? (
        <ul className="border-t border-[var(--line)]">
          {openMissions.slice(0, 3).map((m) => (
            <li key={m.id}>
              <Link
                href={m.href}
                className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-white/[0.025] sm:px-6"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-[var(--line-strong)] text-[10px] text-[var(--beige-dim)]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-[var(--beige)]">
                    {m.label}
                  </span>
                  <span className="block text-xs text-[var(--beige-dim)]">
                    {m.hint}
                  </span>
                </span>
                <span className="text-[11px] uppercase tracking-wider text-[var(--sky)]">
                  Go
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
