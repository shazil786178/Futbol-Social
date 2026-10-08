"use client";

import { useActionState } from "react";
import {
  openTribunal,
  voteTribunal,
  type ActionState,
} from "@/app/features/actions";
import type { Tribunal } from "@/lib/features/data";

const initial: ActionState = {};

export function TribunalPanel({
  matchId,
  tribunal,
}: {
  matchId: string;
  tribunal: Tribunal | null;
}) {
  const [openState, openAction, openPending] = useActionState(openTribunal, initial);
  const [voteState, voteAction, votePending] = useActionState(voteTribunal, initial);

  const total = (tribunal?.yesCount ?? 0) + (tribunal?.noCount ?? 0);
  const yesPct = total ? Math.round(((tribunal?.yesCount ?? 0) / total) * 100) : 50;

  return (
    <div className="space-y-6">
      {tribunal ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6">
          <p className="text-xs font-semibold uppercase text-red-400">The Tribunal · Live</p>
          <h3 className="mt-2 text-xl font-bold text-white">{tribunal.question}</h3>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full bg-emerald-500" style={{ width: `${yesPct}%` }} />
          </div>
          <p className="mt-2 text-sm text-zinc-400">
            Yes {tribunal.yesCount} · No {tribunal.noCount}
          </p>
          <form action={voteAction} className="mt-4 flex gap-2">
            <input type="hidden" name="tribunalId" value={tribunal.id} />
            <button
              name="vote"
              value="yes"
              type="submit"
              disabled={votePending}
              className="flex-1 rounded-xl bg-emerald-600 py-3 font-semibold text-white"
            >
              Yes
            </button>
            <button
              name="vote"
              value="no"
              type="submit"
              disabled={votePending}
              className="flex-1 rounded-xl bg-zinc-700 py-3 font-semibold text-white"
            >
              No
            </button>
          </form>
          {voteState.error ? <p className="mt-2 text-sm text-red-300">{voteState.error}</p> : null}
          {voteState.success ? (
            <p className="mt-2 text-sm text-emerald-300">{voteState.success}</p>
          ) : null}
        </div>
      ) : (
        <form action={openAction} className="rounded-2xl border border-white/10 bg-zinc-900/80 p-6">
          <input type="hidden" name="matchId" value={matchId} />
          <h3 className="font-semibold text-white">Open The Tribunal</h3>
          <p className="mt-1 text-sm text-zinc-500">Controversial moment? Let the crowd decide.</p>
          <select
            name="incidentType"
            className="mt-4 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
          >
            <option value="penalty">Penalty</option>
            <option value="offside">Offside</option>
            <option value="red_card">Red card</option>
            <option value="other">Other</option>
          </select>
          <input
            name="question"
            required
            placeholder="Was it a pen?"
            className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
          />
          <button
            type="submit"
            disabled={openPending}
            className="mt-4 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {openPending ? "Opening…" : "Open vote"}
          </button>
          {openState.error ? <p className="mt-2 text-sm text-red-300">{openState.error}</p> : null}
        </form>
      )}
    </div>
  );
}
