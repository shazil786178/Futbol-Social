"use client";

import { useActionState } from "react";
import { joinRivalMode, type ActionState } from "@/app/features/actions";
import type { Match } from "@/lib/matches/types";
import type { RivalPair } from "@/lib/features/data";

const initial: ActionState = {};

export function RivalJoinForm({ match }: { match: Match }) {
  const [state, action, pending] = useActionState(joinRivalMode, initial);

  return (
    <form action={action} className="fs-panel p-5 sm:p-6">
      <input type="hidden" name="matchId" value={match.id} />
      <p className="fs-kicker !text-[var(--sky)]">Get paired</p>
      <h3 className="fs-display mt-2 text-2xl text-[var(--beige)]">
        Enter Rival Mode
      </h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--beige-muted)]">
        Pair with a fan on the other side of {match.homeTeam} vs {match.awayTeam}.
        Side-by-side predictions. Bragging rights after full time.
      </p>
      <button
        type="submit"
        disabled={pending}
        className="fs-btn-primary mt-5 disabled:opacity-60"
      >
        {pending ? "Pairing…" : "Find my rival"}
      </button>
      {state.error ? (
        <p className="mt-3 text-sm text-[var(--live)]">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="mt-3 text-sm text-[var(--sky)]">{state.success}</p>
      ) : null}
    </form>
  );
}

export function RivalSideBySide({
  pair,
  match,
  data,
}: {
  pair: RivalPair;
  match: Match;
  data: {
    predictions: { user_id: string; home_score: number; away_score: number }[];
    posts: { user_id: string; type: string; content: string }[];
  };
}) {
  const predA = data.predictions.find((p) => p.user_id === pair.userAId);
  const predB = data.predictions.find((p) => p.user_id === pair.userBId);
  const postsA = data.posts.filter((p) => p.user_id === pair.userAId);
  const postsB = data.posts.filter((p) => p.user_id === pair.userBId);

  const col = (
    team: string,
    user: string,
    pred: typeof predA,
    posts: typeof postsA,
  ) => (
    <div className="fs-panel p-5">
      <p className="fs-kicker !text-[var(--sky)]">{team}</p>
      <p className="fs-display mt-1 text-xl text-[var(--beige)]">@{user}</p>
      <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--beige-dim)]">
        Prediction
      </p>
      <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-[var(--sky)]">
        {pred ? `${pred.home_score}–${pred.away_score}` : "—"}
      </p>
      <ul className="mt-5 space-y-2 border-t border-[var(--line)] pt-4">
        {posts.length === 0 ? (
          <li className="text-xs text-[var(--beige-dim)]">No posts yet</li>
        ) : (
          posts.map((p, i) => (
            <li key={i} className="text-sm text-[var(--beige-muted)]">
              <span className="text-[var(--beige-dim)]">{p.type}:</span>{" "}
              {p.content}
            </li>
          ))
        )}
      </ul>
    </div>
  );

  return (
    <div>
      {pair.winnerUserId ? (
        <p className="mb-5 text-center text-sm font-semibold text-[var(--sky)]">
          Rival winner: @
          {pair.winnerUserId === pair.userAId ? pair.userAName : pair.userBName}
        </p>
      ) : null}
      <p className="mb-5 text-center text-sm text-[var(--beige-muted)]">
        {match.homeTeam} vs {match.awayTeam} — personal stakes, zero names
        exchanged until now.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {col(pair.teamA, pair.userAName, predA, postsA)}
        {col(pair.teamB, pair.userBName, predB, postsB)}
      </div>
    </div>
  );
}
