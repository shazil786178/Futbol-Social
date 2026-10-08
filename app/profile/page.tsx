import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { SupportedTeamForm } from "@/components/profile/supported-team-form";
import { BRAND, IQ_RULES } from "@/lib/brand";
import { listIqEvents, listUniqueTeams } from "@/lib/matches/data";
import { getDailyState } from "@/lib/streaks/daily";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: `Profile — ${BRAND.name}` };

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, iqEvents, teams, daily] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "username, football_iq, oracle_badge, email, created_at, supported_team, streak_count, streak_best",
      )
      .eq("id", user.id)
      .maybeSingle(),
    listIqEvents(user.id),
    listUniqueTeams(),
    getDailyState(supabase, user.id),
  ]);

  const streak = profile?.streak_count ?? daily?.streakCount ?? 0;
  const best = profile?.streak_best ?? daily?.streakBest ?? 0;

  return (
    <PageShell>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--beige-dim)]">
        Account
      </p>
      <h1 className="fs-display mt-2 text-4xl text-[var(--beige)]">
        @{profile?.username ?? "fan"}
      </h1>
      <p className="mt-1 text-sm text-[var(--beige-dim)]">
        {profile?.email ?? user.email}
      </p>

      <div className="mt-8 grid grid-cols-3 gap-3 border-y border-[var(--line-strong)] py-5">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--beige-dim)]">
            {BRAND.iqLabel}
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold text-[var(--sky)]">
            {profile?.football_iq ?? 100}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--beige-dim)]">
            Streak
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold text-[var(--beige)]">
            {streak}d
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--beige-dim)]">
            Best
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold text-[var(--beige-muted)]">
            {best}d
          </p>
        </div>
      </div>

      {profile?.oracle_badge ? (
        <p className="mt-4 text-xs font-semibold text-[var(--sky)]">
          Oracle Badge earned
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <Link href="/feed" className="text-[var(--sky)]">
          Today’s board →
        </Link>
        <Link href="/leaderboard" className="text-[var(--beige-muted)] hover:text-[var(--beige)]">
          Leaderboard
        </Link>
        <Link href="/notifications" className="text-[var(--beige-muted)] hover:text-[var(--beige)]">
          Alerts
        </Link>
      </div>

      <SupportedTeamForm
        teams={teams}
        current={profile?.supported_team ?? null}
      />

      <section className="mt-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--beige-dim)]">
          {BRAND.iqLabel} history
        </h2>
        <ul className="mt-3 divide-y divide-[var(--line)]">
          {iqEvents.length === 0 ? (
            <li className="py-3 text-sm text-[var(--beige-dim)]">
              No scored predictions yet — lock picks before kickoff.
            </li>
          ) : (
            iqEvents.map((event) => (
              <li
                key={event.id}
                className="flex justify-between gap-4 py-3 text-sm text-[var(--beige-muted)]"
              >
                <span>{event.reason}</span>
                <span
                  className={`font-mono font-semibold ${event.delta >= 0 ? "text-[var(--sky)]" : "text-[var(--live)]"}`}
                >
                  {event.delta >= 0 ? "+" : ""}
                  {event.delta}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="mt-10 border-t border-[var(--line)] pt-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--beige-dim)]">
          How points work
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-[var(--beige-muted)]">
          {IQ_RULES.map((rule) => (
            <li key={rule.label} className="flex justify-between gap-4">
              <span>{rule.label}</span>
              <span className="font-mono text-[var(--beige)]">{rule.points}</span>
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}
