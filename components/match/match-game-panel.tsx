import type { MatchGameData, MatchEvent } from "@/lib/football-api/match-detail";
import type { Match } from "@/lib/matches/types";
import { formatScore, statusClockLabel } from "@/lib/matches/format";

function eventLabel(e: MatchEvent): string {
  switch (e.type) {
    case "goal":
      return "Goal";
    case "own_goal":
      return "Own goal";
    case "penalty":
      return "Penalty";
    case "penalty_miss":
      return "Pen miss";
    case "yellow":
      return "Yellow";
    case "red":
      return "Red";
    case "subst":
      return "Sub";
    default:
      return e.type;
  }
}

function eventTone(e: MatchEvent): string {
  if (e.type === "goal" || e.type === "penalty") return "text-[var(--sky)]";
  if (e.type === "red") return "text-[var(--live)]";
  if (e.type === "yellow") return "text-amber-300";
  return "text-[var(--beige-muted)]";
}

export function MatchGamePanel({
  match,
  game,
}: {
  match: Match;
  game: MatchGameData;
}) {
  const clock = statusClockLabel(match);

  return (
    <div className="space-y-8">
      <div className="fs-card p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--beige-dim)]">
          Match centre
        </p>
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <p className="fs-display text-right text-xl text-[var(--beige)]">
            {match.homeTeam}
          </p>
          <div className="text-center">
            <p className="fs-display text-4xl font-semibold tabular-nums text-[var(--sky)]">
              {formatScore(match)}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[var(--beige-dim)]">
              {clock}
            </p>
          </div>
          <p className="fs-display text-left text-xl text-[var(--beige)]">
            {match.awayTeam}
          </p>
        </div>
        <p className="mt-4 text-center text-sm text-[var(--beige-dim)]">
          {match.venue || "Venue TBD"}
          {game.source !== "none" ? ` · data via ${game.source}` : ""}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="fs-card p-5">
          <h3 className="fs-display text-lg text-[var(--beige)]">Goals & events</h3>
          {game.events.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--beige-dim)]">
              No timed events yet — check back when the match is underway or after
              full time.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {game.events.map((e) => (
                <li
                  key={e.id}
                  className="flex items-start gap-3 border-b border-[var(--line)] pb-3 last:border-0"
                >
                  <span className="w-10 shrink-0 text-xs font-semibold tabular-nums text-[var(--beige-dim)]">
                    {e.minute != null ? `${e.minute}'` : "—"}
                  </span>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${eventTone(e)}`}>
                      {eventLabel(e)}
                      {e.teamSide ? ` · ${e.teamSide}` : ""}
                    </p>
                    <p className="text-sm text-[var(--beige)]">
                      {e.playerName ?? e.detail ?? "—"}
                      {e.assistName ? (
                        <span className="text-[var(--beige-dim)]">
                          {" "}
                          (assist: {e.assistName})
                        </span>
                      ) : null}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="fs-card p-5">
          <h3 className="fs-display text-lg text-[var(--beige)]">Lineups</h3>
          {game.lineups.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--beige-dim)]">
              Lineups unavailable for this fixture (provider may not publish XI
              yet).
            </p>
          ) : (
            <div className="mt-4 space-y-6">
              {game.lineups.map((line) => (
                <div key={line.side}>
                  <p className="text-sm font-semibold text-[var(--beige)]">
                    {line.teamName}
                    {line.formation ? (
                      <span className="ml-2 text-xs font-normal text-[var(--sky)]">
                        {line.formation}
                      </span>
                    ) : null}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {line.starters.map((p) => (
                      <li
                        key={`${line.side}-${p.name}-${p.number}`}
                        className="flex gap-2 text-sm text-[var(--beige-muted)]"
                      >
                        <span className="w-6 tabular-nums text-[var(--beige-dim)]">
                          {p.number ?? "–"}
                        </span>
                        <span className="text-[var(--beige)]">{p.name}</span>
                        {p.position ? (
                          <span className="text-[var(--beige-dim)]">
                            · {p.position}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {line.bench.length > 0 ? (
                    <>
                      <p className="mt-3 text-xs uppercase tracking-wider text-[var(--beige-dim)]">
                        Bench
                      </p>
                      <ul className="mt-1 space-y-1">
                        {line.bench.slice(0, 9).map((p) => (
                          <li
                            key={`${line.side}-b-${p.name}`}
                            className="flex gap-2 text-xs text-[var(--beige-dim)]"
                          >
                            <span className="w-6 tabular-nums">
                              {p.number ?? "–"}
                            </span>
                            {p.name}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
