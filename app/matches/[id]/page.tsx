import Link from "next/link";
import { notFound } from "next/navigation";
import { HighlightUploadForm } from "@/components/highlights/highlight-upload-form";
import { PageShell } from "@/components/layout/page-shell";
import { HighlightsGrid } from "@/components/match/highlights-grid";
import { TeamCrest } from "@/components/match/team-crest";
import { MatchChatRoom } from "@/components/match/match-chat-room";
import { MatchFeed } from "@/components/match/match-feed";
import { MatchGamePanel } from "@/components/match/match-game-panel";
import { AiPredictor } from "@/components/match/ai-predictor";
import { PredictorForm } from "@/components/match/predictor-form";
import { TribunalPanel } from "@/components/tribunal/tribunal-panel";
import { StructuredVerdictForm } from "@/components/verdict/structured-verdict-form";
import { BRAND } from "@/lib/brand";
import { fetchMatchGameData } from "@/lib/football-api/match-detail";
import { getOpenTribunal } from "@/lib/features/data";
import {
  getMatch,
  listChatMessages,
  listHighlights,
  listPosts,
  listPredictions,
} from "@/lib/matches/data";
import {
  formatKickoff,
  formatScore,
  statusClockLabel,
  statusTone,
} from "@/lib/matches/format";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) return { title: BRAND.name };
  return {
    title: `${match.homeTeam} vs ${match.awayTeam} — ${BRAND.name}`,
  };
}

export default async function MatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "game" } = await searchParams;
  const match = await getMatch(id);

  if (!match) notFound();

  const [highlights, messages, posts, predictions, tribunal, auth, game] =
    await Promise.all([
      listHighlights(id),
      listChatMessages(id),
      listPosts(id),
      listPredictions(id),
      getOpenTribunal(id),
      createClient().then((s) => s.auth.getUser()),
      fetchMatchGameData({
        externalId: match.externalId,
        competitionId: match.competitionId,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        kickoffAt: match.kickoffAt,
      }),
    ]);
  const user = auth.data.user;

  // Prefer live API clock when card minute is missing
  const matchWithClock =
    match.status === "live" && match.minute == null && game.minute != null
      ? { ...match, minute: game.minute }
      : match;

  const tabs = [
    { id: "game", label: "Game" },
    { id: "feed", label: "Feed" },
    { id: "chat", label: "Chat" },
    { id: "predictor", label: "Predictor" },
    { id: "clips", label: "Clips" },
    { id: "tribunal", label: "Tribunal" },
    { id: "verdict", label: "Verdict" },
  ] as const;

  return (
    <PageShell wide>
      <div className="fs-hero-score overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-6">
          <p className="text-xs font-medium text-[var(--beige-dim)]">
            {match.competitionName}
          </p>
          <span className={statusTone(match.status)}>
            {match.status === "live" ? (
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
            ) : null}
            {statusClockLabel(matchWithClock)}
          </span>
        </div>
        <div className="px-4 pb-6 pt-5 sm:px-6">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <TeamCrest name={match.homeTeam} size="lg" />
              <h1 className="fs-display text-lg leading-tight sm:text-2xl">
                {match.homeTeam}
              </h1>
            </div>
            <p className="fs-score text-center text-6xl sm:text-7xl">
              {match.status === "upcoming"
                ? new Date(match.kickoffAt).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : formatScore(matchWithClock)}
            </p>
            <div className="flex flex-col items-center gap-2 text-center">
              <TeamCrest name={match.awayTeam} size="lg" />
              <h1 className="fs-display text-lg leading-tight sm:text-2xl">
                {match.awayTeam}
              </h1>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm text-[var(--beige-dim)]">
            <span>{formatKickoff(match.kickoffAt)}</span>
            {match.venue ? <span>· {match.venue}</span> : null}
          </div>
        </div>
      </div>

      <nav className="mt-5 flex gap-1 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={`/matches/${id}?tab=${t.id}`}
            className={`fs-tab shrink-0 ${tab === t.id ? "fs-tab--active" : ""}`}
          >
            {t.label}
          </Link>
        ))}
        <Link
          href={`/rival?match=${id}`}
          className="fs-tab shrink-0 !text-[var(--sky)]"
        >
          Rival
        </Link>
      </nav>

      <div className="mt-8">
        {tab === "game" ? (
          <MatchGamePanel match={matchWithClock} game={game} />
        ) : null}
        {tab === "feed" ? (
          <MatchFeed matchId={id} posts={posts} matchStatus={match.status} />
        ) : null}
        {tab === "chat" ? (
          <MatchChatRoom match={matchWithClock} messages={messages} />
        ) : null}
        {tab === "predictor" ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <PredictorForm match={match} />
              <AiPredictor match={match} />
            </div>
            <div className="fs-panel p-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--beige-dim)]">
                Fan board
              </h3>
              <ul className="mt-4 divide-y divide-[var(--line)]">
                {predictions.length === 0 ? (
                  <li className="py-2 text-sm text-[var(--beige-dim)]">
                    No predictions yet.
                  </li>
                ) : (
                  predictions.map((p) => (
                    <li
                      key={p.id}
                      className="flex justify-between gap-3 py-2 text-sm text-[var(--beige-muted)]"
                    >
                      <span>@{p.username}</span>
                      <span className="font-mono text-[var(--beige)]">
                        {p.homeScore}–{p.awayScore}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        ) : null}
        {tab === "clips" ? (
          <div className="space-y-6">
            {user ? (
              <HighlightUploadForm
                matchId={id}
                matchLabel={`${match.homeTeam} vs ${match.awayTeam}`}
              />
            ) : (
              <p className="text-sm text-[var(--beige-muted)]">
                <Link href="/login" className="text-[var(--sky)] hover:text-[var(--beige)]">
                  Sign in
                </Link>{" "}
                to upload a clip.
              </p>
            )}
            <HighlightsGrid highlights={highlights} />
          </div>
        ) : null}
        {tab === "tribunal" ? (
          <TribunalPanel matchId={id} tribunal={tribunal} />
        ) : null}
        {tab === "verdict" ? (
          match.status === "finished" ? (
            <StructuredVerdictForm matchId={id} />
          ) : (
            <p className="text-sm text-[var(--beige-muted)]">
              Structured verdicts unlock after full time.
            </p>
          )
        ) : null}
      </div>
    </PageShell>
  );
}
