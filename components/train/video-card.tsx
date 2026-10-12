"use client";

import { useState } from "react";
import { withEmbedPlayback } from "@/lib/football-api/scorebat";

export function TrainVideoCard({
  videoId,
  title,
  channel,
  thumbnailUrl,
  minutes,
}: {
  videoId: string;
  title: string;
  channel: string;
  thumbnailUrl: string | null;
  minutes: number;
}) {
  const [playing, setPlaying] = useState(false);
  const embed = `https://www.youtube.com/embed/${videoId}`;

  return (
    <article className="fs-train-card group overflow-hidden rounded-[1rem] bg-[var(--ink-raised)] ring-1 ring-[var(--line)] transition hover:ring-[var(--line-strong)]">
      <div className="relative aspect-video bg-black">
        {playing ? (
          <iframe
            src={withEmbedPlayback(embed, { autoplay: true, sound: true })}
            title={title}
            className="absolute inset-0 h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="absolute inset-0 grid place-items-center"
            aria-label={`Play ${title}`}
          >
            {thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
            ) : null}
            <span className="relative grid h-14 w-14 place-items-center rounded-full bg-[var(--sky)] text-[var(--ink)] shadow-[0_10px_30px_rgba(60,227,154,0.4)] transition group-hover:scale-110">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
              {minutes} min
            </span>
          </button>
        )}
      </div>
      <div className="px-3.5 py-3">
        <p className="line-clamp-2 text-sm font-semibold leading-snug">{title}</p>
        <p className="mt-1 text-xs text-[var(--beige-dim)]">{channel}</p>
      </div>
    </article>
  );
}
