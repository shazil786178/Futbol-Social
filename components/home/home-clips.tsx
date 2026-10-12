"use client";

import Link from "next/link";
import { useState } from "react";
import type { ClipReelItem, ReelTabKey } from "@/components/clips/clips-reel";

const TABS: { key: ReelTabKey; label: string }[] = [
  { key: "fyp", label: "For You" },
  { key: "following", label: "Following" },
  { key: "friends", label: "Friends" },
];

function dayLabel(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** TikTok-style strip on the home screen: three tabs, tap any card to open the reel there. */
export function HomeClips({
  reels,
  signedIn,
}: {
  reels: Record<ReelTabKey, ClipReelItem[]>;
  signedIn: boolean;
}) {
  const [tab, setTab] = useState<ReelTabKey>("fyp");
  const items = reels[tab].slice(0, 10);

  return (
    <section className="fs-home-clips">
      <div className="fs-section-head">
        <div>
          <p className="fs-kicker">Clips</p>
          <h2 className="fs-display mt-2 text-2xl sm:text-3xl">Tonight&apos;s tape</h2>
        </div>
        <Link
          href={tab === "fyp" ? "/clips" : `/clips?tab=${tab}`}
          className="text-sm text-[var(--sky)] hover:text-[var(--beige)]"
        >
          Full screen →
        </Link>
      </div>

      <div className="fs-reel-tabs mt-1 inline-flex items-center gap-1 rounded-full bg-[var(--ink-raised)] p-1 ring-1 ring-[var(--line)]">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              t.key === tab
                ? "bg-[var(--beige)] text-[var(--ink)]"
                : "text-[var(--beige-muted)] hover:text-[var(--beige)]"
            }`}
          >
            {t.label}
            {reels[t.key].length ? (
              <span className="ml-1 opacity-60">{reels[t.key].length}</span>
            ) : null}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="fs-panel mt-4 px-5 py-8 text-center">
          <p className="fs-display text-lg">
            {tab === "following"
              ? "Follow a club and their clips land here"
              : tab === "friends"
                ? "No friend clips yet"
                : "Clips are loading"}
          </p>
          <p className="mt-1 text-sm text-[var(--beige-dim)]">
            {tab === "following"
              ? "Goals, highlights and fan uploads from your teams."
              : tab === "friends"
                ? "Follow people from their profile, or post the first one."
                : "Official highlights appear here after every big match."}
          </p>
          <Link
            href={
              tab === "following"
                ? "/follow"
                : tab === "friends"
                  ? signedIn
                    ? "/clips/upload"
                    : "/login"
                  : "/clips"
            }
            className="fs-btn-primary mt-4"
          >
            {tab === "following" ? "Follow teams" : tab === "friends" ? "Post a clip" : "Open Clips"}
          </Link>
        </div>
      ) : (
        <div className="fs-clip-strip mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
          {items.map((c, i) => (
            <Link
              key={c.id}
              href={`/clips${tab === "fyp" ? "?" : `?tab=${tab}&`}start=${encodeURIComponent(c.id)}`}
              className="fs-clip-card group relative aspect-[9/16] w-[9.5rem] shrink-0 snap-start overflow-hidden rounded-[1rem] bg-[var(--ink-raised)] ring-1 ring-[var(--line)] sm:w-[11rem]"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {c.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.thumbnailUrl}
                  alt=""
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              ) : c.videoUrl ? (
                <video src={c.videoUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-[var(--ink-soft)] to-black" />
              )}
              <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white ring-1 ring-white/10">
                {dayLabel(c.happenedAt) || c.duration}
              </span>
              <span className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--sky)] text-[var(--ink)]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </span>
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2.5 pt-8">
                <span className="line-clamp-2 text-[12px] font-semibold leading-snug text-white">
                  {c.title}
                </span>
                <span className="mt-1 block text-[10px] text-[var(--beige-dim)]">
                  {c.author === "official" ? c.competitionLabel ?? "Official" : `@${c.author}`}
                  {c.likes ? ` · ♥ ${c.likes}` : ""}
                </span>
              </span>
            </Link>
          ))}
          <Link
            href={tab === "fyp" ? "/clips" : `/clips?tab=${tab}`}
            className="grid aspect-[9/16] w-[9.5rem] shrink-0 snap-start place-items-center rounded-[1rem] border border-dashed border-[var(--line-strong)] text-center text-sm text-[var(--sky)] sm:w-[11rem]"
          >
            Open the
            <br />
            full reel →
          </Link>
        </div>
      )}
    </section>
  );
}
