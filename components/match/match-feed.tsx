"use client";

import { useActionState } from "react";
import { submitPost, type ActionState } from "@/app/matches/actions";
import type { MatchPost, MatchStatus } from "@/lib/matches/types";

const initial: ActionState = {};

export function MatchFeed({
  matchId,
  posts,
  matchStatus,
}: {
  matchId: string;
  posts: MatchPost[];
  matchStatus: MatchStatus;
}) {
  const [state, action, pending] = useActionState(submitPost, initial);
  const verdictAllowed = matchStatus === "finished";

  return (
    <div className="space-y-0">
      <form action={action} className="fs-panel space-y-3 p-4">
        <input type="hidden" name="matchId" value={matchId} />
        <div className="flex flex-wrap gap-4">
          {(["reaction", "opinion", "verdict"] as const).map((t) => (
            <label
              key={t}
              className={`flex cursor-pointer items-center gap-1.5 text-xs uppercase tracking-wider ${
                t === "verdict" && !verdictAllowed
                  ? "text-[var(--beige-dim)]"
                  : "text-[var(--beige-muted)]"
              }`}
            >
              <input
                type="radio"
                name="type"
                value={t}
                defaultChecked={t === "reaction"}
                disabled={t === "verdict" && !verdictAllowed}
              />
              {t}
            </label>
          ))}
        </div>
        <textarea
          name="content"
          rows={3}
          placeholder="Hot take, live reaction, or full-time verdict…"
          className="fs-field"
        />
        <button
          type="submit"
          disabled={pending}
          className="fs-btn-primary !py-2 text-xs"
        >
          {pending ? "Posting…" : "Post take"}
        </button>
        {state.error ? (
          <p className="text-xs text-[var(--live)]">{state.error}</p>
        ) : null}
        {state.success ? (
          <p className="text-xs text-[var(--sky)]">{state.success}</p>
        ) : null}
      </form>

      <ul className="mt-4 divide-y divide-[var(--line)] border-t border-[var(--line-strong)]">
        {posts.length === 0 ? (
          <li className="py-6 text-sm text-[var(--beige-dim)]">
            No takes on this match yet.
          </li>
        ) : (
          posts.map((post) => (
            <li key={post.id} className="py-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--sky)]">
                {post.type}
              </p>
              <p className="mt-1 text-sm text-[var(--beige)]">{post.content}</p>
              <p className="mt-2 text-xs text-[var(--beige-dim)]">
                @{post.username}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
