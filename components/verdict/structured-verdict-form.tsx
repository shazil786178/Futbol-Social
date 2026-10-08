"use client";

import { useActionState } from "react";
import { submitStructuredVerdict, type ActionState } from "@/app/features/actions";

const initial: ActionState = {};

const fields = [
  { name: "matchRating", label: "Match quality" },
  { name: "refereeRating", label: "Referee" },
  { name: "homeRating", label: "Home team" },
  { name: "awayRating", label: "Away team" },
] as const;

export function StructuredVerdictForm({ matchId }: { matchId: string }) {
  const [state, action, pending] = useActionState(
    submitStructuredVerdict,
    initial,
  );

  return (
    <form action={action} className="fs-panel p-5 sm:p-6">
      <input type="hidden" name="matchId" value={matchId} />
      <p className="fs-kicker">After full time</p>
      <h3 className="fs-display mt-2 text-2xl text-[var(--beige)]">
        Structured verdict
      </h3>
      <p className="mt-1 text-sm text-[var(--beige-muted)]">
        Rate 1–10. Aggregates into public fan data.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <label key={f.name} className="text-xs font-medium uppercase tracking-wider text-[var(--beige-dim)]">
            {f.label}
            <input
              name={f.name}
              type="number"
              min={1}
              max={10}
              required
              defaultValue={7}
              className="fs-field mt-1.5"
            />
          </label>
        ))}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="fs-btn-primary mt-5 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Submit verdict (+3 IQ)"}
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
