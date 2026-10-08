"use client";

import { useActionState } from "react";
import { submitPrediction, type ActionState } from "@/app/matches/actions";
import type { Match } from "@/lib/matches/types";
import { canPredict } from "@/lib/matches/format";

const initial: ActionState = {};

export function PredictorForm({ match }: { match: Match }) {
  const [state, action, pending] = useActionState(submitPrediction, initial);
  const open = canPredict(match);

  return (
    <form action={action} className="fs-panel space-y-4 p-5">
      <input type="hidden" name="matchId" value={match.id} />
      <h3 className="fs-display text-xl text-[var(--beige)]">Lock a score</h3>
      {!open ? (
        <p className="text-sm text-[var(--beige-dim)]">
          Closed — kickoff already happened.
        </p>
      ) : (
        <>
          <div className="flex items-end gap-3">
            <label className="flex-1 text-xs uppercase tracking-wider text-[var(--beige-dim)]">
              {match.homeTeam}
              <input
                name="homeScore"
                type="number"
                min={0}
                max={20}
                required
                defaultValue={0}
                className="fs-field mt-1 font-mono text-lg"
              />
            </label>
            <span className="pb-2 text-[var(--beige-dim)]">–</span>
            <label className="flex-1 text-xs uppercase tracking-wider text-[var(--beige-dim)]">
              {match.awayTeam}
              <input
                name="awayScore"
                type="number"
                min={0}
                max={20}
                required
                defaultValue={0}
                className="fs-field mt-1 font-mono text-lg"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="fs-btn-primary w-full"
          >
            {pending ? "Locking…" : "Lock prediction"}
          </button>
        </>
      )}
      {state.error ? (
        <p className="text-sm text-[var(--live)]">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-[var(--sky)]">{state.success}</p>
      ) : null}
    </form>
  );
}
