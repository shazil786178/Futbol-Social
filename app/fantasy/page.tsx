import Link from "next/link";
import { SquadBuilder } from "@/components/fantasy/squad-builder";
import { PageShell } from "@/components/layout/page-shell";
import { MatchCard } from "@/components/match/match-card";
import { teamInitials } from "@/components/match/team-crest";
import { BRAND } from "@/lib/brand";
import { entityAccent } from "@/lib/entities/slug";
import { loadFantasyBoard } from "@/lib/fantasy/data";
import {
  FANTASY_RULES,
  FANTASY_SCORING,
  fantasyPlayer,
  type FantasyPlayer,
  type FantasyPosition,
} from "@/lib/fantasy/players";
import { listMatches } from "@/lib/matches/data";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: `UCL Fantasy — ${BRAND.name}`,
};

function lastName(name: string) {
  const parts = name.split(" ");
  return parts.length > 1 ? parts.slice(1).join(" ") : name;
}

export default async function FantasyPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ ready, board, mine }, matches] = await Promise.all([
    loadFantasyBoard(supabase, user?.id ?? null),
    listMatches("ucl"),
  ]);

  const nextUcl = matches
    .filter((m) => m.status !== "finished")
    .slice(0, 4);

  const editing = Boolean(user) && (!mine || edit === "1");
  const squadPlayers = mine
    ? (mine.picks.map((p) => fantasyPlayer(p.slug)).filter(Boolean) as FantasyPlayer[])
    : [];

  return (
    <PageShell full>
      <header className="fs-fade-up flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="fs-kicker">Champions League fantasy</p>
          <h1 className="fs-display mt-2 text-4xl sm:text-5xl">
            {mine && !editing ? mine.team_name : "Pick your European XI"}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--beige-muted)]">
            £{FANTASY_RULES.budget}m. Eleven players. Max {FANTASY_RULES.maxPerClub} from
            any club. Points come from real Champions League results and scorers, and
            update live during matches.
          </p>
        </div>
        {mine && !editing ? (
          <div className="flex items-center gap-3">
            <div className="fs-panel px-5 py-3 text-center">
              <p className="fs-score fs-gold text-4xl">{mine.total}</p>
              <p className="text-xs text-[var(--beige-dim)]">points</p>
            </div>
            <div className="fs-panel px-5 py-3 text-center">
              <p className="fs-score text-4xl">#{mine.rank}</p>
              <p className="text-xs text-[var(--beige-dim)]">of {board.length}</p>
            </div>
          </div>
        ) : null}
      </header>

      {!ready ? (
        <p className="fs-panel mt-8 px-4 py-3 text-sm text-[var(--beige-muted)]">
          Fantasy needs one database update. Run{" "}
          <code className="text-[var(--sky)]">015_onboarding_and_fantasy.sql</code> in
          the Supabase SQL editor.
        </p>
      ) : null}

      <div className="mt-8">
        {!user ? (
          <div className="fs-hero-score px-6 py-10 text-center">
            <p className="fs-display text-2xl">Build a squad in two minutes</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--beige-muted)]">
              Sign in to pick your XI, choose a captain, and climb the table against
              every fan on {BRAND.name}.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/signup" className="fs-btn-primary">
                Create account
              </Link>
              <Link href="/login" className="fs-btn-ghost">
                Sign in
              </Link>
            </div>
          </div>
        ) : editing ? (
          <>
            {mine ? (
              <p className="mb-4 text-sm text-[var(--beige-muted)]">
                Saving changes banks your {mine.total} points. Your new XI scores from
                the next kick-off.{" "}
                <Link href="/fantasy" className="text-[var(--sky)]">
                  Cancel
                </Link>
              </p>
            ) : null}
            <SquadBuilder
              initialPicks={mine?.picks.map((p) => p.slug) ?? []}
              initialCaptain={mine?.captain ?? null}
              initialName={mine?.team_name ?? ""}
            />
          </>
        ) : mine ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
            <div>
              <div className="fs-fantasy-pitch space-y-5">
                {(["FWD", "MID", "DEF", "GK"] as FantasyPosition[]).map((pos) => (
                  <div key={pos} className="flex flex-wrap justify-center gap-1.5">
                    {squadPlayers
                      .filter((p) => p.position === pos)
                      .map((p) => {
                        const s = mine.perPlayer.get(p.slug);
                        return (
                          <Link
                            key={p.slug}
                            href={`/players/${p.slug}`}
                            className="fs-fantasy-slot"
                          >
                            <span
                              className="fs-fantasy-shirt"
                              style={{ background: entityAccent(p.club) }}
                            >
                              {teamInitials(p.club)}
                            </span>
                            <span className="fs-fantasy-name">
                              {mine.captain === p.slug ? "C · " : ""}
                              {lastName(p.name)}
                            </span>
                            <span className="fs-fantasy-pts">
                              {s?.live ? "● " : ""}
                              {s?.points ?? 0} pts
                            </span>
                          </Link>
                        );
                      })}
                  </div>
                ))}
              </div>
              <Link href="/fantasy?edit=1" className="fs-btn-ghost mt-4 w-full">
                Make transfers
              </Link>
            </div>

            <div className="space-y-8">
              <section>
                <h2 className="fs-display text-xl">Next Champions League games</h2>
                {nextUcl.length > 0 ? (
                  <div className="mt-2 grid gap-x-3 sm:grid-cols-2">
                    {nextUcl.map((m) => (
                      <MatchCard key={m.id} match={m} />
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[var(--beige-dim)]">
                    No UCL fixtures on the board right now.
                  </p>
                )}
              </section>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <section className="fs-panel p-5">
          <h2 className="fs-display text-xl">Table</h2>
          {board.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--beige-dim)]">
              No squads yet. Be the first name on the board.
            </p>
          ) : (
            <ol className="mt-3 divide-y divide-[var(--line)]">
              {board.slice(0, 20).map((row, i) => (
                <li
                  key={row.userId}
                  className={`flex items-center gap-3 py-2.5 ${
                    row.userId === user?.id ? "text-[var(--sky)]" : ""
                  }`}
                >
                  <span className="fs-score w-7 text-lg text-[var(--beige-dim)]">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {row.teamName}
                    </span>
                    <span className="block truncate text-xs text-[var(--beige-dim)]">
                      @{row.username}
                    </span>
                  </span>
                  <span className="fs-score fs-gold text-xl">{row.total}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="fs-panel p-5">
          <h2 className="fs-display text-xl">How points work</h2>
          <ul className="mt-3 divide-y divide-[var(--line)]">
            {FANTASY_SCORING.map((r) => (
              <li key={r.label} className="flex justify-between gap-3 py-2 text-sm">
                <span className="text-[var(--beige-muted)]">{r.label}</span>
                <span className="fs-score text-base text-[var(--beige)]">{r.points}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PageShell>
  );
}
