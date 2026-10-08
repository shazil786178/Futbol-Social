"use client";

import { useActionState, useState } from "react";
import { postNewsComment, type NewsActionState } from "@/app/news/actions";
import type { NewsComment } from "@/lib/features/news";

const initial: NewsActionState = {};

export function NewsThread({
  articleId,
  comments,
  signedIn,
}: {
  articleId: string;
  comments: NewsComment[];
  signedIn: boolean;
}) {
  const [state, action, pending] = useActionState(postNewsComment, initial);
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const roots = comments.filter((c) => !c.parentId);
  const replies = (parentId: string) =>
    comments.filter((c) => c.parentId === parentId);

  return (
    <div className="mt-10 border-t border-[var(--line-strong)] pt-8">
      <h2 className="fs-kicker !text-[var(--sky)]">
        Thread ({comments.length})
      </h2>

      {signedIn ? (
        <form action={action} className="mt-4 space-y-3">
          <input type="hidden" name="articleId" value={articleId} />
          {replyTo ? (
            <input type="hidden" name="parentId" value={replyTo} />
          ) : null}
          {replyTo ? (
            <p className="text-xs text-[var(--sky)]">
              Replying to a comment{" "}
              <button
                type="button"
                className="underline"
                onClick={() => setReplyTo(null)}
              >
                cancel
              </button>
            </p>
          ) : null}
          <textarea
            name="content"
            required
            rows={3}
            maxLength={2000}
            placeholder="Your take on this story…"
            className="fs-field"
          />
          <button
            type="submit"
            disabled={pending}
            className="fs-btn-primary !px-4 !py-2 text-sm disabled:opacity-60"
          >
            {pending ? "Posting…" : replyTo ? "Post reply" : "Post to thread"}
          </button>
          {state.error ? (
            <p className="text-sm text-[var(--live)]">{state.error}</p>
          ) : null}
        </form>
      ) : (
        <p className="mt-4 text-sm text-[var(--beige-muted)]">
          <a href="/login" className="text-[var(--sky)] hover:text-[var(--beige)]">
            Sign in
          </a>{" "}
          to join the discussion.
        </p>
      )}

      <ul className="mt-6">
        {roots.length === 0 ? (
          <li className="py-4 text-sm text-[var(--beige-dim)]">
            No comments yet — start the thread.
          </li>
        ) : (
          roots.map((c) => (
            <li key={c.id} className="fs-board px-1 py-4">
              <p className="text-sm font-medium text-[var(--beige)]">
                @{c.username}
              </p>
              <p className="mt-1 text-sm text-[var(--beige-muted)]">{c.content}</p>
              <p className="mt-2 text-xs text-[var(--beige-dim)]">
                {new Date(c.createdAt).toLocaleString()}
              </p>
              {signedIn ? (
                <button
                  type="button"
                  onClick={() => setReplyTo(c.id)}
                  className="mt-2 text-xs uppercase tracking-wider text-[var(--sky)]"
                >
                  Reply
                </button>
              ) : null}
              <ul className="mt-3 space-y-3 border-l border-[var(--line-strong)] pl-4">
                {replies(c.id).map((r) => (
                  <li key={r.id}>
                    <p className="text-sm font-medium text-[var(--beige)]">
                      @{r.username}
                    </p>
                    <p className="mt-0.5 text-sm text-[var(--beige-muted)]">
                      {r.content}
                    </p>
                  </li>
                ))}
              </ul>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
