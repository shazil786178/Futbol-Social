"use client";

import { useState, useTransition } from "react";
import { toggleFollowUser } from "@/app/clips/actions";

export function FollowUserButton({
  userId,
  initialFollowing,
  signedIn,
}: {
  userId: string;
  initialFollowing: boolean;
  signedIn: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!signedIn) {
    return (
      <a href={`/login?next=/u`} className="fs-btn-ghost text-sm">
        Sign in to follow
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          const next = !following;
          setFollowing(next);
          start(async () => {
            const res = await toggleFollowUser(userId);
            if (res.error) {
              setFollowing(!next);
              setError(res.error);
            } else {
              setError(null);
            }
          });
        }}
        className={following ? "fs-btn-ghost text-sm" : "fs-btn-primary text-sm"}
      >
        {following ? "Following" : "Follow"}
      </button>
      {error ? <span className="text-xs text-[var(--live)]">{error}</span> : null}
    </div>
  );
}
