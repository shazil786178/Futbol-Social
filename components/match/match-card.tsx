import Link from "next/link";
import { TeamCrest } from "@/components/match/team-crest";
import type { Match } from "@/lib/matches/types";
import { hasScore, statusClockLabel, statusTone } from "@/lib/matches/format";

export function MatchCard({ match }: { match: Match }) {
  const clock = statusClockLabel(match);
  const isLive = match.status === "live";
  const scored = match.status !== "upcoming" && hasScore(match);
  const finished = match.status === "finished";
  const homeWin = finished && scored && match.homeScore! > match.awayScore!;
  const awayWin = finished && scored && match.awayScore! > match.homeScore!;

  const rows = [
    { team: match.homeTeam, score: match.homeScore, win: homeWin },
    { team: match.awayTeam, score: match.awayScore, win: awayWin },
  ];

  return (
    <Link
      href={`/matches/${match.id}${isLive ? "?tab=chat" : ""}`}
      className={`fs-ticket ${isLive ? "fs-ticket--live" : ""}`}
    >
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="fs-ticket__comp truncate">{match.competitionName}</span>
        <span className={statusTone(match.status)}>
          {isLive ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
          {clock}
        </span>
      </div>

      {rows.map((r) => (
        <div key={r.team} className="fs-ticket__row">
          <TeamCrest name={r.team} />
          <span
            className={`fs-ticket__team ${
              r.win || !finished ? "fs-ticket__team--win" : ""
            }`}
          >
            {r.team}
          </span>
          <span
            className={`fs-ticket__score ${r.win ? "fs-ticket__score--win" : ""}`}
          >
            {match.status === "upcoming" ? "" : scored ? r.score : "–"}
          </span>
        </div>
      ))}

      {isLive || match.venue ? (
        <p className="mt-1.5 flex items-center justify-between gap-3 text-xs text-[var(--beige-dim)]">
          <span className="truncate">{match.venue}</span>
          {isLive ? (
            <span className="shrink-0 font-semibold text-[var(--live)]">
              Join live room →
            </span>
          ) : null}
        </p>
      ) : null}
    </Link>
  );
}
