import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AdSlot } from "@/components/ads/ad-slot";
import { HomeClips } from "@/components/home/home-clips";
import { IqIntro } from "@/components/home/iq-intro";
import { PageShell } from "@/components/layout/page-shell";
import { MatchCard } from "@/components/match/match-card";
import { TeamCrest } from "@/components/match/team-crest";
import { loadClipReelFor } from "@/lib/clips/load-reel";
import { entitySlug } from "@/lib/entities/slug";
import { loadFantasyBoard } from "@/lib/fantasy/data";
import { listFollowedTeams } from "@/lib/features/follows";
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
import { loadPitchBoard } from "@/lib/games/the-pitch";
import { loadTopBinsBoard } from "@/lib/games/top-bins";
import { getDailyState } from "@/lib/streaks/daily";

export type StartProfile = {
  username: string;
  football_iq: number;
  supported_team: string | null;
  favorite_player?: string | null;
  favorite_league?: string | null;
  is_pro?: boolean | null;
};

function isTeamMatch(team: string, m: Match) {
  return similarity(team, m.homeTeam) >= 0.9 || similarity(team, m.awayTeam) >= 0.9;
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

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
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
        <span className={`fs-status ${live ? "fs-status--live" : "fs-status--upcoming"}`}>
          {live ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
          {live
            ? statusClockLabel(match)
            : match.status === "finished"
              ? "Full time"
              : untilKickoff(match.kickoffAt)}
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

function DailyTile({
  href,
  kicker,
  title,
  body,
  tone = "default",
  badge,
}: {
  href: string;
  kicker: string;
  title: string;
  body: string;
  tone?: "default" | "mint" | "gold" | "live";
  badge?: string | null;
}) {
  return (
    <Link href={href} className={`fs-tile fs-tile--${tone} fs-fade-up`}>
      <div className="flex items-start justify-between gap-3">
        <p className="fs-kicker">{kicker}</p>
        {badge ? <span className="fs-chip fs-chip--mint">{badge}</span> : null}
      </div>
      <p className="fs-display mt-3 text-xl leading-snug">{title}</p>
      <p className="mt-1.5 text-sm text-[var(--beige-muted)]">{body}</p>
      <span className="fs-tile__arrow" aria-hidden>
        →
      </span>
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
  const [matches, daily, iqEvents, fantasy, rankRes, totalRes, call, reel, followed, topBins, pitch] =
    await Promise.all([
      listMatches(),
      getDailyState(supabase, userId),
      listIqEvents(userId),
      loadFantasyBoard(supabase, userId),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gt("football_iq", profile.football_iq),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      loadCallBoard(supabase, userId),
      loadClipReelFor("fyp").catch(() => null),
      listFollowedTeams(userId).catch(() => []),
      loadTopBinsBoard(supabase, userId).catch(() => null),
      loadPitchBoard(supabase, userId).catch(() => null),
    ]);

  const iqRank = (rankRes.count ?? 0) + 1;
  const totalFans = Math.max(totalRes.count ?? 1, iqRank);
  const todayKey = new Date().toDateString();
  const deltaToday = iqEvents
    .filter((e) => new Date(e.createdAt).toDateString() === todayKey)
    .reduce((a, e) => a + e.delta, 0);

  const myTeams = [profile.supported_team ?? "", ...followed.map((f) => f.teamName)].filter(Boolean);
  const team = profile.supported_team;

  // --- Today's matches: your teams first, otherwise a seeded random pick of the day
  const todays = matches.filter((m) => isToday(m.kickoffAt) || m.status === "live");
  const mine = todays.filter((m) => myTeams.some((t) => isTeamMatch(t, m)));
  let board: Match[];
  let boardTitle: string;
  if (mine.length) {
    board = mine;
    boardTitle = mine.some((m) => m.status === "live") ? "Your teams are on" : "Your teams today";
  } else if (todays.length) {
    board = seededShuffle(todays, `${userId}:${new Date().toISOString().slice(0, 10)}`);
    boardTitle = "Today's matches";
  } else {
    board = matches
      .filter((m) => m.status === "upcoming" && kicksOffAfterNow(m.kickoffAt))
      .sort((a, b) => +new Date(a.kickoffAt) - +new Date(b.kickoffAt));
    boardTitle = "Next up";
  }
  board = [...board].sort((a, b) => {
    const order = (m: Match) => (m.status === "live" ? 0 : m.status === "upcoming" ? 1 : 2);
    return order(a) - order(b) || +new Date(a.kickoffAt) - +new Date(b.kickoffAt);
  });
  const hero = board[0] ?? null;
  const rest = board.slice(1, 7);

  const clubForm = team
    ? matches
        .filter((m) => isTeamMatch(team, m) && m.status === "finished")
        .slice(-5)
        .reverse()
    : [];

  const nextMission = daily?.missions.find((m) => !m.done);

  return (
    <PageShell full>
      <IqIntro
        iq={profile.football_iq}
        rank={iqRank}
        total={totalFans}
        username={profile.username}
        deltaToday={deltaToday}
      />

      <header className="fs-fade-up flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--beige-muted)]">
            {greeting()}, <span className="text-[var(--beige)]">@{profile.username}</span>
          </p>
          <h1 className="fs-display mt-1 text-4xl sm:text-5xl">{boardTitle}</h1>
        </div>
        <Link href="/leaderboard" className="fs-iq-pill" aria-label="Futbol IQ">
          <span className="fs-iq-pill__ring" style={{ ["--p" as string]: `${Math.round((1 - (iqRank - 1) / Math.max(1, totalFans - 1)) * 100)}%` }} />
          <span>
            <span className="block text-[10px] uppercase tracking-[0.18em] text-[var(--gold)]">Futbol IQ</span>
            <span className="fs-score fs-gold text-2xl leading-none">{profile.football_iq}</span>
          </span>
          <span className="text-xs text-[var(--beige-dim)]">#{iqRank}</span>
        </Link>
      </header>

      {/* 1 — Today's matches */}
      <section className="mt-6 fs-fade-up-delay">
        {hero ? (
          <BigScoreboard match={hero} />
        ) : (
          <div className="fs-hero-score px-6 py-8 text-center">
            {team ? (
              <>
                <TeamCrest name={team} size="lg" />
                <p className="fs-display mt-3 text-xl">Quiet day for {team}</p>
                <p className="mt-1 text-sm text-[var(--beige-muted)]">
                  Their next fixture lands here the moment it is scheduled.
                </p>
              </>
            ) : (
              <>
                <p className="fs-display text-xl">Pick your club</p>
                <Link href="/welcome" className="fs-btn-primary mt-4">
                  Choose a club
                </Link>
              </>
            )}
          </div>
        )}

        {team ? (
          <div className="fs-panel mt-4 flex flex-wrap items-center justify-between gap-4 px-5 py-3.5">
            <Link href={`/teams/${entitySlug(team)}`} className="flex items-center gap-3">
              <TeamCrest name={team} />
              <span>
                <span className="block text-sm font-semibold">{team}</span>
                <span className="block text-xs text-[var(--beige-dim)]">
                  {followed.length ? `+${followed.length} followed` : "Club page →"}
                </span>
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

        {rest.length > 0 ? (
          <div className="mt-4 grid gap-x-3 sm:grid-cols-2">
            {rest.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        ) : null}
        <div className="mt-2 text-right">
          <Link href="/matches" className="text-sm text-[var(--sky)] hover:text-[var(--beige)]">
            All matches →
          </Link>
        </div>
      </section>

      {/* 2 — Clips, TikTok style */}
      <div className="mt-10 fs-fade-up-delay-2">
        {reel ? (
          <HomeClips reels={reel.reels} signedIn />
        ) : (
          <Link href="/clips" className="fs-panel block px-5 py-5">
            <p className="fs-kicker">Clips</p>
            <p className="fs-display mt-2 text-xl">Open tonight&apos;s tape →</p>
          </Link>
        )}
      </div>

      {/* 3 — The daily loop */}
      <section className="mt-10">
        <div className="fs-section-head">
          <div>
            <p className="fs-kicker">Every day</p>
            <h2 className="fs-display mt-2 text-2xl sm:text-3xl">Your daily loop</h2>
          </div>
          {daily ? (
            <span className="fs-chip fs-chip--mint">
              {daily.streakCount} day streak · {daily.completedToday}/{daily.totalMissions}
            </span>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DailyTile
            href="/games"
            kicker="Games · one more match"
            title="Rogue. Zero. Pets."
            body="Run the pitch, flick a finish, and raise a monster that changes with how you play."
            tone="gold"
            badge="Play"
          />
          <DailyTile
            href="/pitch"
            kicker="The Pitch · one ball, Earth"
            title={
              pitch?.persisted
                ? `Mint ${pitch.state.mintScore}–${pitch.state.goldScore} Gold`
                : "One ball. The whole planet."
            }
            body={
              pitch?.myTouchToday
                ? "Your touch is on the tape. See if we scored overnight."
                : "Curl it. The last fans are still standing on the ball. One touch a day."
            }
            tone="mint"
            badge={pitch?.myTouchToday ? null : "Your touch"}
          />
          <DailyTile
            href="/topbins"
            kicker="Top Bins · daily free kick"
            title={
              topBins?.mine
                ? `You scored ${topBins.mine.score} today`
                : "One free kick. Same wall. Whole planet."
            }
            body={
              topBins?.mine
                ? `Rank #${topBins.mine.rank} of ${topBins.players}. New kick at midnight.`
                : "5 attempts, physics, a keeper who reads you. Top the board."
            }
          />
          <DailyTile
            href="/call"
            kicker={`The Call · ${call.closed ? "Closed" : "Open"}`}
            title={call.call.question}
            body={
              call.myChoice
                ? "You're on the board. Results at midnight."
                : `${call.call.optionA} or ${call.call.optionB} — one tap.`
            }
            tone="live"
          />
          <DailyTile
            href="/pundit"
            kicker="AI Pundit"
            title={team ? `Ask anything about ${team}` : "Ask anything about tonight"}
            body="Previews, who to captain, why your team lost. Grounded in live scores."
            tone="gold"
          />
          <DailyTile
            href="/train"
            kicker="Train"
            title="Get better this week"
            body="Wingers, ball mastery, finishing, defending — a plan built for you."
          />
          <DailyTile
            href="/fantasy"
            kicker="UCL Fantasy"
            title={fantasy.mine ? `${fantasy.mine.total} pts · #${fantasy.mine.rank}` : "Build your Champions League XI"}
            body={fantasy.mine ? fantasy.mine.team_name : "£100m, 11 players, real points."}
          />
          <DailyTile
            href={nextMission?.href ?? "/feed"}
            kicker="Streak"
            title={nextMission ? `Next: ${nextMission.label}` : "All done for today"}
            body={nextMission ? nextMission.hint : "Come back tomorrow to keep the streak alive."}
          />
        </div>
      </section>

      {profile.favorite_player ? (
        <Link
          href={`/players/${entitySlug(profile.favorite_player)}`}
          className="fs-panel mt-6 flex items-center justify-between gap-3 px-5 py-4 transition hover:border-[var(--line-strong)]"
        >
          <span>
            <span className="block text-xs text-[var(--beige-dim)]">Your player</span>
            <span className="block text-sm font-semibold">{profile.favorite_player}</span>
          </span>
          <span className="text-sm text-[var(--sky)]">Rate →</span>
        </Link>
      ) : null}

      {!profile.is_pro ? (
        <div className="mt-8">
          <AdSlot placement="feed" compact />
          <p className="mt-2 text-right text-xs text-[var(--beige-dim)]">
            <Link href="/pro" className="text-[var(--gold)]">
              Go Pro
            </Link>{" "}
            to remove ads
          </p>
        </div>
      ) : null}
    </PageShell>
  );
}
