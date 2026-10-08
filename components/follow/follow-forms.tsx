"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  followPlayer,
  followTeam,
  unfollowPlayer,
  unfollowTeam,
  type FollowState,
} from "@/app/follow/actions";
import { entitySlug, portraitUrl } from "@/lib/entities/slug";

const initial: FollowState = {};

export function FollowTeamForm({
  teams,
  following,
}: {
  teams: string[];
  following: { id: string; teamName: string }[];
}) {
  const [state, action, pending] = useActionState(followTeam, initial);
  const [, unAction, unPending] = useActionState(unfollowTeam, initial);
  const followed = new Set(following.map((f) => f.teamName));

  return (
    <div className="space-y-4">
      <form action={action} className="flex flex-wrap gap-2">
        <select
          name="teamName"
          required
          className="fs-field min-w-[220px] flex-1"
          defaultValue=""
        >
          <option value="" disabled>
            Choose a team from live fixtures…
          </option>
          {teams
            .filter((t) => !followed.has(t))
            .map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="fs-btn-primary !px-4 !py-2 text-sm disabled:opacity-60"
        >
          {pending ? "…" : "Follow team"}
        </button>
      </form>
      {state.error ? (
        <p className="text-sm text-[var(--live)]">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-[var(--sky)]">{state.success}</p>
      ) : null}

      <ul>
        {following.length === 0 ? (
          <li className="text-sm text-[var(--beige-dim)]">
            Not following any teams yet.
          </li>
        ) : (
          following.map((f) => (
            <li
              key={f.id}
              className="fs-board flex items-center justify-between gap-3 px-1 py-3"
            >
              <Link
                href={`/teams/${entitySlug(f.teamName)}`}
                className="flex min-w-0 items-center gap-3 hover:text-[var(--sky)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={portraitUrl(f.teamName, "team")}
                  alt=""
                  className="h-10 w-10 object-cover"
                />
                <span className="truncate text-sm font-medium text-[var(--beige)]">
                  {f.teamName}
                </span>
              </Link>
              <form action={unAction}>
                <input type="hidden" name="id" value={f.id} />
                <button
                  type="submit"
                  disabled={unPending}
                  className="text-xs uppercase tracking-wider text-[var(--beige-dim)] hover:text-[var(--live)]"
                >
                  Unfollow
                </button>
              </form>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export function FollowPlayerForm({
  popular,
  following,
}: {
  popular: { name: string; team: string }[];
  following: { id: string; playerName: string; teamName: string | null }[];
}) {
  const [state, action, pending] = useActionState(followPlayer, initial);
  const [, unAction, unPending] = useActionState(unfollowPlayer, initial);

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-2">
        <input
          name="playerName"
          required
          list="popular-players"
          placeholder="Player name"
          className="fs-field"
        />
        <datalist id="popular-players">
          {popular.map((p) => (
            <option key={p.name} value={p.name} />
          ))}
        </datalist>
        <input
          name="teamName"
          placeholder="Club (optional)"
          className="fs-field"
        />
        <button
          type="submit"
          disabled={pending}
          className="fs-btn-primary !px-4 !py-2 text-sm disabled:opacity-60"
        >
          {pending ? "…" : "Follow player"}
        </button>
      </form>
      {state.error ? (
        <p className="text-sm text-[var(--live)]">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-[var(--sky)]">{state.success}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {popular.slice(0, 10).map((p) => (
          <Link
            key={p.name}
            href={`/players/${entitySlug(p.name)}`}
            className="group flex items-center gap-2 border border-[var(--line-strong)] py-1 pl-1 pr-3 transition hover:border-[var(--sky)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={portraitUrl(p.name, "player")}
              alt=""
              className="h-8 w-8 object-cover"
            />
            <span className="text-xs text-[var(--beige-muted)] group-hover:text-[var(--beige)]">
              {p.name.split(" ").slice(-1)[0]}
            </span>
          </Link>
        ))}
      </div>

      <ul>
        {following.length === 0 ? (
          <li className="text-sm text-[var(--beige-dim)]">
            Not following any players yet — tap a chip above to open their card.
          </li>
        ) : (
          following.map((f) => (
            <li
              key={f.id}
              className="fs-board flex items-center justify-between gap-3 px-1 py-3"
            >
              <Link
                href={`/players/${entitySlug(f.playerName)}`}
                className="flex min-w-0 items-center gap-3"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={portraitUrl(f.playerName, "player")}
                  alt=""
                  className="h-10 w-10 object-cover"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-[var(--beige)]">
                    {f.playerName}
                  </span>
                  {f.teamName ? (
                    <span className="block text-xs text-[var(--beige-dim)]">
                      {f.teamName}
                    </span>
                  ) : null}
                </span>
              </Link>
              <form action={unAction}>
                <input type="hidden" name="id" value={f.id} />
                <button
                  type="submit"
                  disabled={unPending}
                  className="text-xs uppercase tracking-wider text-[var(--beige-dim)] hover:text-[var(--live)]"
                >
                  Unfollow
                </button>
              </form>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
