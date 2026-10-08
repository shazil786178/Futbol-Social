import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { RivalJoinForm, RivalSideBySide } from "@/components/rival/rival-view";
import { BRAND } from "@/lib/brand";
import {
  getRivalPair,
  getSideBySideForRival,
} from "@/lib/features/data";
import { getMatch, listMatches } from "@/lib/matches/data";
import { formatScore, statusClockLabel } from "@/lib/matches/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: `Rival Mode — ${BRAND.name}` };

export default async function RivalPage({
  searchParams,
}: {
  searchParams: Promise<{ match?: string }>;
}) {
  const { match: matchId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const matches = await listMatches();
  const liveAndUpcoming = matches.filter((m) => m.status !== "finished");

  if (!matchId) {
    return (
      <PageShell wide>
        <header className="fs-fade-up border-b border-[var(--line-strong)] pb-6">
          <p className="fs-kicker">Personal stakes</p>
          <h1 className="fs-display mt-2 text-4xl text-[var(--beige)] sm:text-5xl">
            Rival Mode
          </h1>
          <p className="fs-hang mt-4 max-w-lg text-sm leading-relaxed text-[var(--beige-muted)]">
            Pick a fixture. Get paired with an opposing fan. Winner takes the
            bragging rights.
          </p>
        </header>

        <ul className="mt-2">
          {liveAndUpcoming.length === 0 ? (
            <li className="py-8 text-sm text-[var(--beige-dim)]">
              No open fixtures right now. Check back near kickoff.
            </li>
          ) : (
            liveAndUpcoming.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/rival?match=${m.id}`}
                  className="fs-board group flex items-center gap-4 px-1 py-4"
                >
                  <div className="w-16 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-[var(--beige-dim)]">
                    {m.status === "live" ? (
                      <span className="inline-flex items-center gap-1.5 text-[var(--live)]">
                        <span className="fs-live-dot" />
                        Live
                      </span>
                    ) : (
                      statusClockLabel(m)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-[var(--beige)] sm:text-base">
                      <span className="font-medium">{m.homeTeam}</span>
                      <span className="mx-2 font-mono text-[var(--sky)]">
                        {formatScore(m)}
                      </span>
                      <span className="font-medium">{m.awayTeam}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--beige-dim)]">
                      {m.competitionName}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] uppercase tracking-wider text-[var(--sky)] opacity-70 group-hover:opacity-100">
                    Pair →
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </PageShell>
    );
  }

  const match = await getMatch(matchId);
  if (!match) redirect("/rival");

  const pair = await getRivalPair(matchId, user.id);
  const sideData = pair
    ? await getSideBySideForRival(matchId, pair.userAId, pair.userBId)
    : null;

  return (
    <PageShell wide>
      <Link
        href="/rival"
        className="text-xs uppercase tracking-wider text-[var(--beige-dim)] hover:text-[var(--sky)]"
      >
        ← All fixtures
      </Link>
      <header className="mt-4 border-b border-[var(--line-strong)] pb-6">
        <p className="fs-kicker">Head to head</p>
        <h1 className="fs-display mt-2 text-3xl text-[var(--beige)] sm:text-4xl">
          {match.homeTeam}{" "}
          <span className="font-mono text-[var(--sky)]">
            {formatScore(match)}
          </span>{" "}
          {match.awayTeam}
        </h1>
        <p className="mt-2 text-sm text-[var(--beige-muted)]">
          {match.competitionName} · win the match, win the rivalry.
        </p>
      </header>

      <div className="mt-8">
        {pair && sideData ? (
          <RivalSideBySide pair={pair} match={match} data={sideData} />
        ) : (
          <RivalJoinForm match={match} />
        )}
      </div>
    </PageShell>
  );
}
