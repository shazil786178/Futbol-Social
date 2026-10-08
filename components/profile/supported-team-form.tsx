"use client";

import { useActionState } from "react";
import { updateSupportedTeam, type ActionState } from "@/app/features/actions";

const initial: ActionState = {};

export function SupportedTeamForm({
  teams,
  current,
}: {
  teams: string[];
  current: string | null;
}) {
  const [state, action, pending] = useActionState(updateSupportedTeam, initial);

  return (
    <form
      action={action}
      className="mt-8 border-t border-[var(--line-strong)] pt-6"
    >
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--beige-dim)]">
        Supported team
      </h2>
      <p className="mt-1 text-sm text-[var(--beige-muted)]">
        Needed for Rival Mode pairing.
      </p>
      <select
        name="supportedTeam"
        defaultValue={current ?? ""}
        className="fs-field mt-4"
      >
        <option value="">Select team…</option>
        {teams.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="fs-btn-primary mt-3 !py-2 text-sm"
      >
        Save team
      </button>
      {state.error ? (
        <p className="mt-2 text-sm text-[var(--live)]">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="mt-2 text-sm text-[var(--sky)]">{state.success}</p>
      ) : null}
    </form>
  );
}
