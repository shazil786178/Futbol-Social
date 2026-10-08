"use client";

import { useActionState } from "react";
import { postInClubRoom, type ActionState } from "@/app/features/actions";

const initial: ActionState = {};

export function RoomPostForm({
  slug,
  clubName,
}: {
  slug: string;
  clubName: string;
}) {
  const [state, action, pending] = useActionState(postInClubRoom, initial);

  return (
    <form action={action} className="fs-panel p-4">
      <input type="hidden" name="slug" value={slug} />
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--beige-dim)]">
        Post as a {clubName} fan
      </p>
      <textarea
        name="content"
        rows={3}
        maxLength={500}
        placeholder={`What's the mood in the ${clubName} section?`}
        className="fs-field mt-2"
      />
      <button
        type="submit"
        disabled={pending}
        className="fs-btn-primary mt-3 !px-4 !py-2 text-xs disabled:opacity-60"
      >
        {pending ? "…" : "Post"}
      </button>
      {state.error ? (
        <p className="mt-2 text-xs text-[var(--live)]">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="mt-2 text-xs text-[var(--sky)]">{state.success}</p>
      ) : null}
    </form>
  );
}
