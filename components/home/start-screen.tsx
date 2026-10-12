import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AdSlot } from "@/components/ads/ad-slot";
import { PageShell } from "@/components/layout/page-shell";
import { MatchCard } from "@/components/match/match-card";
import { TeamCrest } from "@/components/match/team-crest";
import { entitySlug } from "@/lib/entities/slug";
import { loadFantasyBoard } from "@/lib/fantasy/data";
import { similarity } from "@/lib/football-api/live-scores";
import { listIqEvents, listMatches } from "@/lib/matches/data";
import {
  formatKickoff,
  hasScore,
  kicksOffAfterNow,
  statusClockLabel,
} from "@/lib/matches/format";
import type { Match } from "@/lib/matches/types";
import { loadCallBoard } from "@/lib/call/today";
import { getDailyState } from "@/lib/streaks/daily";

export type StartProfile = {
  username: string;
  football_iq: number;
  supported_team: string | null;
  favorite_player?: string | null;
  favorite_league?: string | null;
};

function isClubMatch(team: string, m: Match) {
  return similarity(team, m.homeTeam) >= 0.99 || similarity(team, m.awayTeam) >= 0.99;
}

function resultFor(team: string, m: Match): "W" | "D" | "L" | null {
  if (m.status !== "finished" || !hasScore(m)) return null;
  const home = similarity(team, m.homeTeam) >= similarity(team, m.awayTeam);
  const mine = home ? m.homeScore! : m.awayScore!;
  const theirs = home ? m.awayScore! : m.homeScore!;
  return mine > theirs ? "W" : mine < theirs ? "L" : "D";
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Late one";
  if (h < 12) return "Morning";
  if (h < 18) return "Afternoon";
  return "Evening";
}

function untilKickoff(iso: string) {
  const mins = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (mins <= 0) return "Kicking off";
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours}h ${mins % 60}m`;
  const days = Math.round(hours / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}

function BigScoreboard({ match }: { match: Match }) {
  const live = match.status === "live";
  const scored = hasScore(match);
  return (
    <Link
      href={`/matches/${match.id}${live ? "?tab=chat" : ""}`}
      className="fs-hero-score block px-5 py-6 transition hover:border-[var(--line-strong)] sm:px-8"
    >
      <div className="flex items-center justify-between gap-3 text-xs text-[var(--beige-dim)]">
        <span>{match.competitionName}</span>
        <span
          className={`fs-status ${live ? "fs-status--live" : "fs-status--upcoming"}`}
        >
          {live ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
          {live ? statusClockLabel(match) : untilKickoff(match.kickoffAt)}
        </span>
      </div>
      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <TeamCrest name={match.homeTeam} size="lg" />
          <span className="fs-display text-base sm:text-lg">{match.homeTeam}</span>
        </div>
        <div className="text-center">
          {match.status === "upcoming" ? (
            <p className="fs-score text-3xl text-[var(--beige-muted)]">
              {new Date(match.kickoffAt).toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          ) : (
            <p className="fs-score text-6xl sm:text-7xl">
              {scored ? `${match.homeScore}–${match.awayScore}` : "– : –"}
            </p>
          )}
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <TeamCrest name={match.awayTeam} size="lg" />
          <span className="fs-display text-base sm:text-lg">{match.awayTeam}</span>
        </div>
      </div>
      <p className="mt-5 text-center text-xs text-[var(--beige-dim)]">
        {formatKickoff(match.kickoffAt)}
        {match.venue ? ` · ${match.venue}` : ""}
        {live ? (
          <span className="ml-2 font-semibold text-[var(--live)]">Join the room →</span>
        ) : null}
      </p>
    </Link>
  );
}

export async function StartScreen({
  supabase,
  userId,
  profile,
}: {
  supabase: SupabaseClient;
  userId: string;
  profile: StartProfile;
}) {
  const [matches, daily, iqEvents, fantasy, rankRes, call] = await Promise.all([
    listMatches(),
    getDailyState(supabase, userId),
    listIqEvents(userId),
    loadFantasyBoard(supabase, userId),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gt("football_iq", profile.football_iq),
    loadCallBoard(supabase, userId),
  ]);

  const iqRank = (rankRes.count ?? 0) + 1;
  const team = profile.supported_team;
  const clubMatches = team ? matches.filter((m) => isClubMatch(team, m)) : [];
  const clubLive = clubMatches.find((m) => m.status === "live");
  const clubNext = clubMatches.find(
    (m) => m.status === "upcoming" && kicksOffAfterNow(m.kickoffAt, 3_600_000),
  );
  const clubForm = clubMatches
    .filter((m) => m.status === "finished")
    .slice(-5)
    .reverse();
  const heroMatch = clubLive ?? clubNext ?? null;

  const live = matches.filter((m) => m.status === "live");
  const preferred = profile.favorite_league && profile.favorite_league !== "all"
    ? profile.favorite_league
    : null;
  const upcoming = matches
    .filter((m) => m.status === "upcoming" && kicksOffAfterNow(m.kickoffAt))
    .sort((a, b) => {
      if (preferred) {
        const pa = a.competitionId === preferred ? 0 : 1;
        const pb = b.competitionId === preferred ? 0 : 1;
        if (pa !== pb) return pa - pb;
      }
      return +new Date(a.kickoffAt) - +new Date(b.kickoffAt);
    });
  const board = [...live.filter((m) => m.id !== heroMatch?.id), ...upcoming.filter((m) => m.id !== heroMatch?.id)].slice(0, 6);
  const nextMission = daily?.missions.find((m) => !m.done);

  return (
    <PageShell full>
      <header className="fs-fade-up">
        <p className="text-sm text-[var(--beige-muted)]">
          {greeting()}, <span className="text-[var(--beige)]">@{profile.username}</span>
        </p>
        <h1 className="fs-display mt-1 text-4xl sm:text-5xl">
          {clubLive
            ? `${team} are on.`
            : team
              ? `Your ${team} board`
              : "Your board"}
        </h1>
      </header>

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5 fs-fade-up-delay">
          {heroMatch ? (
            <BigScoreboard match={heroMatch} />
          ) : (
            <div className="fs-hero-score px-6 py-8 text-center">
              {team ? (
                <>
                  <TeamCrest name={team} size="lg" />
                  <p className="fs-display mt-3 text-xl">No {team} fixture on the board yet</p>
                  <p className="mt-1 text-sm text-[var(--beige-muted)]">
                    We&apos;ll put their next game right here the moment it&apos;s scheduled.
                  </p>
                </>
              ) : (
                <>
                  <p className="fs-display text-xl">Pick your club</p>
                  <p className="mt-1 text-sm text-[var(--beige-muted)]">
                    Your club&apos;s games and scores live on this screen.
                  </p>
                  <Link href="/welcome" className="fs-btn-primary mt-4">
                    Choose a club
                  </Link>
                </>
              )}
            </div>
          )}

          {team ? (
            <div className="fs-panel flex flex-wrap items-center justify-between gap-4 px-5 py-4">
              <Link href={`/teams/${entitySlug(team)}`} className="flex items-center gap-3">
                <TeamCrest name={team} />
                <span>
                  <span className="block text-sm font-semibold">{team}</span>
                  <span className="block text-xs text-[var(--beige-dim)]">Club page →</span>
                </span>
              </Link>
              <div className="flex items-center gap-1.5" aria-label="Recent form">
                {clubForm.length === 0 ? (
                  <span className="text-xs text-[var(--beige-dim)]">No recent results</span>
                ) : (
                  clubForm.map((m) => {
                    const r = resultFor(team, m);
                    const tone =
                      r === "W"
                        ? "bg-[var(--sky)] text-[var(--paper-ink)]"
                        : r === "L"
                          ? "bg-[var(--live)] text-white"
                          : "bg-[var(--ink-soft)] text-[var(--beige-muted)]";
                    return (
                      <Link
                        key={m.id}
                        href={`/matches/${m.id}`}
                        title={`${m.homeTeam} ${m.homeScore}–${m.awayScore} ${m.awayTeam}`}
                        className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${tone}`}
                      >
                        {r ?? "–"}
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}

          {clubMatches.filter((m) => m.id !== heroMatch?.id && m.status !== "finished").length > 0 ? (
            <section>
              <h2 className="fs-display text-xl">More {team} fixtures</h2>
              <div className="mt-1 grid gap-x-3 sm:grid-cols-2">
                {clubMatches
                  .filter((m) => m.id !== heroMatch?.id && m.status !== "finished")
                  .slice(0, 4)
                  .map((m) => (
                    <MatchCard key={m.id} match={m} />
                  ))}
              </div>
            </section>
          ) : null}

          <section>
            <div className="fs-section-head">
              <h2 className="fs-display text-xl">
                {live.length > 0 ? "Live & next" : "Coming up"}
              </h2>
              <Link href="/matches" className="text-sm text-[var(--sky)] hover:text-[var(--beige)]">
                All matches →
              </Link>
            </div>
            {board.length > 0 ? (
              <div className="grid gap-x-3 sm:grid-cols-2">
                {board.map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--beige-dim)]">The board is quiet right now.</p>
            )}
          </section>
        </div>

        <aside className="space-y-4 fs-fade-up-delay-2">
          <Link
            href="/call"
            className="fs-panel block px-5 py-5 transition hover:border-[var(--sky)]"
          >
            <p className="fs-kicker">The Call · {call.closed ? "Closed" : "Open"}</p>
            <p className="fs-display mt-2 text-xl leading-snug">{call.call.question}</p>
            <p className="mt-2 text-sm text-[var(--beige-muted)]">
              {call.myChoice
                ? "You're on the board. Come back at midnight."
                : `${call.call.optionA} or ${call.call.optionB} — one tap.`}
            </p>
          </Link>
          <Link href="/leaderboard" className="fs-panel block px-5 py-5 transition hover:border-[var(--line-strong)]">
            <p className="fs-kicker !text-[var(--gold)]">Futbol IQ</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <p className="fs-score fs-gold text-6xl">{profile.football_iq}</p>
              <p className="pb-1 text-right text-sm text-[var(--beige-muted)]">
                Rank <span className="fs-score text-xl text-[var(--beige)]">#{iqRank}</span>
              </p>
            </div>
            {iqEvents.length > 0 ? (
              <ul className="mt-4 space-y-1.5 border-t border-[var(--line)] pt-3">
                {iqEvents.slice(0, 3).map((e) => (
                  <li key={e.id} className="flex justify-between gap-3 text-xs">
                    <span className="truncate text-[var(--beige-dim)]">{e.reason}</span>
                    <span
                      className={`fs-score text-sm ${e.delta >= 0 ? "text-[var(--sky)]" : "text-[var(--live)]"}`}
                    >
                      {e.delta >= 0 ? "+" : ""}
                      {e.delta}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-[var(--beige-dim)]">
                Predict a score to start moving this number.
              </p>
            )}
          </Link>

          <Link href="/fantasy" className="fs-panel block px-5 py-5 transition hover:border-[var(--line-strong)]">
            <p className="fs-kicker">UCL Fantasy</p>
            {fantasy.mine ? (
              <div className="mt-2 flex items-end justify-between gap-3">
                <div>
                  <p className="fs-score text-5xl">{fantasy.mine.total}</p>
                  <p className="text-xs text-[var(--beige-dim)]">{fantasy.mine.team_name}</p>
                </div>
                <p className="pb-1 text-sm text-[var(--beige-muted)]">
                  #{fantasy.mine.rank} of {fantasy.board.length}
                </p>
              </div>
            ) : (
              <>
                <p className="fs-display mt-2 text-lg">Build your Champions League XI</p>
                <p className="mt-1 text-xs text-[var(--beige-dim)]">
                  £100m, 11 players, real points. Takes two minutes.
                </p>
              </>
            )}
          </Link>

          {profile.favorite_player ? (
            <Link
              href={`/players/${entitySlug(profile.favorite_player)}`}
              className="fs-panel flex items-center justify-between gap-3 px-5 py-4 transition hover:border-[var(--line-strong)]"
            >
              <span>
                <span className="block text-xs text-[var(--beige-dim)]">Your player</span>
                <span className="block text-sm font-semibold">{profile.favorite_player}</span>
              </span>
              <span className="text-sm text-[var(--sky)]">Rate →</span>
            </Link>
          ) : null}

          {daily ? (
            <Link
              href={nextMission?.href ?? "/feed"}
              className="fs-panel block px-5 py-4 transition hover:border-[var(--line-strong)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--beige-dim)]">Daily streak</span>
                <span className="fs-chip fs-chip--mint">{daily.streakCount} day{daily.streakCount === 1 ? "" : "s"}</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--ink-soft)]">
                <div
                  className="h-full rounded-full bg-[var(--sky)]"
                  style={{ width: `${(daily.completedToday / daily.totalMissions) * 100}%` }}
                />
              </div>
              <p className="mt-2 text-sm">
                {nextMission ? `Next: ${nextMission.label}` : "All done for today"}
              </p>
            </Link>
          ) : null}

          <AdSlot placement="feed" compact />
        </aside>
      </div>
    </PageShell>
  );
}
