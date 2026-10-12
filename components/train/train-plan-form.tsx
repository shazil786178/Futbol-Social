"use client";

import { useActionState } from "react";
import { buildTrainPlan, type PlanState } from "@/app/train/actions";
import { FOCUS, POSITIONS } from "@/lib/train/catalog";

const initial: PlanState = {};

export function TrainPlanForm({ isPro, aiLive }: { isPro: boolean; aiLive: boolean }) {
  const [state, action, pending] = useActionState(buildTrainPlan, initial);

  return (
    <div className="fs-panel px-5 py-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="fs-kicker">Your plan this week</p>
          <p className="fs-display mt-1 text-xl">Built for your position</p>
        </div>
        {isPro && aiLive ? (
          <span className="fs-chip fs-chip--mint">AI coach</span>
        ) : (
          <span className="fs-chip fs-chip--ghost">From your position</span>
        )}
      </div>
      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-[var(--beige-dim)]">
          Position
          <select name="position" className="fs-field mt-1" defaultValue="Winger">
            {POSITIONS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-[var(--beige-dim)]">
          Focus
          <select name="focus" className="fs-field mt-1" defaultValue="1v1s">
            {FOCUS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-[var(--beige-dim)]">
          Days / week
          <select name="days" className="fs-field mt-1" defaultValue="3">
            {[2, 3, 4, 5, 6].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        {isPro ? (
          <input
            name="notes"
            placeholder="Anything the coach should know (injury, no pitch access…)"
            className="fs-field sm:col-span-3"
            maxLength={300}
          />
        ) : null}
        <button type="submit" disabled={pending} className="fs-btn-primary sm:col-span-3 disabled:opacity-60">
          {pending ? "Building…" : "Build my week"}
        </button>
      </form>
      {state.error ? <p className="mt-3 text-sm text-[var(--live)]">{state.error}</p> : null}
      {state.plan ? (
        <pre className="fs-plan fs-fade-up mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[var(--beige)]">
          {state.plan}
        </pre>
      ) : null}
    </div>
  );
}
