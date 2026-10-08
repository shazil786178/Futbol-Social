import Link from "next/link";
import type { PhotoPost } from "@/lib/photos/data";

export function ShotCard({ shot }: { shot: PhotoPost }) {
  return (
    <article className="fs-shot">
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <Link
          href={`/u/${shot.username}`}
          className="text-sm font-semibold text-[var(--beige)] hover:text-[var(--sky)]"
        >
          @{shot.username}
        </Link>
        <time className="text-[10px] uppercase tracking-wider text-[var(--beige-dim)]">
          {new Date(shot.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </time>
      </div>

      <div className="fs-shot__frame">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={shot.imageUrl} alt="" className="fs-shot__img" />
      </div>

      <div className="space-y-2 px-3 py-3">
        {shot.caption ? (
          <p className="text-sm leading-relaxed text-[var(--beige)]">
            <span className="font-semibold text-[var(--beige-muted)]">
              @{shot.username}
            </span>{" "}
            {shot.caption}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2 text-[11px]">
          {shot.playerKey && shot.playerLabel ? (
            <Link
              href={`/players/${shot.playerKey}`}
              className="border border-[var(--line-strong)] px-2 py-0.5 text-[var(--sky)] hover:border-[var(--sky)]"
            >
              {shot.playerLabel}
            </Link>
          ) : null}
          {shot.teamKey && shot.teamLabel ? (
            <Link
              href={`/teams/${shot.teamKey}`}
              className="border border-[var(--line-strong)] px-2 py-0.5 text-[var(--beige-muted)] hover:border-[var(--beige)] hover:text-[var(--beige)]"
            >
              {shot.teamLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function ShotGrid({ shots }: { shots: PhotoPost[] }) {
  if (shots.length === 0) {
    return (
      <div className="border border-dashed border-[var(--line-strong)] px-4 py-14 text-center">
        <p className="fs-display text-2xl text-[var(--beige)]">No shots yet</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--beige-muted)]">
          Publish a match-day photo above — players and clubs light up when you
          tag them.
        </p>
      </div>
    );
  }

  return (
    <div className="fs-shot-feed">
      {shots.map((s) => (
        <ShotCard key={s.id} shot={s} />
      ))}
    </div>
  );
}
