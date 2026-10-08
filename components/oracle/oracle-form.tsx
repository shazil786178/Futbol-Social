"use client";

import { useActionState } from "react";
import { submitOraclePrediction, type ActionState } from "@/app/features/actions";

const initial: ActionState = {};

export function OracleForm() {
  const [state, action, pending] = useActionState(
    submitOraclePrediction,
    initial,
  );

  return (
    <form action={action} className="fs-panel space-y-4 p-5 sm:p-6">
      <div>
        <p className="fs-kicker !text-[var(--sky)]">One shot</p>
        <h3 className="fs-display mt-1 text-2xl text-[var(--beige)]">
          Season Oracle picks
        </h3>
        <p className="mt-1 text-sm text-[var(--beige-muted)]">
          Top 1% earn the permanent Oracle Badge.
        </p>
      </div>
      <label className="block text-xs font-medium uppercase tracking-wider text-[var(--beige-dim)]">
        Champions League winner
        <input
          name="uclWinner"
          required
          className="fs-field mt-1.5"
          placeholder="Club name"
        />
      </label>
      <label className="block text-xs font-medium uppercase tracking-wider text-[var(--beige-dim)]">
        Top scorer
        <input
          name="topScorer"
          required
          className="fs-field mt-1.5"
          placeholder="Player name"
        />
      </label>
      <label className="block text-xs font-medium uppercase tracking-wider text-[var(--beige-dim)]">
        Dark horse (optional)
        <input
          name="darkHorse"
          className="fs-field mt-1.5"
          placeholder="Club name"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="fs-btn-primary w-full disabled:opacity-60"
      >
        {pending ? "Locking…" : "Lock Oracle picks"}
      </button>
      {state.error ? (
        <p className="text-sm text-[var(--live)]">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-[var(--sky)]">{state.success}</p>
      ) : null}
    </form>
  );
}
