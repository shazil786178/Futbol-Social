"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ClipReelItem } from "@/components/clips/clips-reel";

/** Full-bleed soccer highlight on the home hero — tap opens the Clips reel. */
export function HeroClip({ clip }: { clip: ClipReelItem | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const fileUrl = clip?.videoUrl ?? null;
  const poster = clip?.thumbnailUrl ?? null;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !fileUrl) return;
    video.muted = true;
    void video.play().catch(() => undefined);
  }, [fileUrl]);

  if (!clip) {
    return (
      <div className="absolute inset-0 bg-[var(--ink)]">
        <div
          className="absolute inset-0 opacity-45"
          style={{
            backgroundImage: "url(/hero-pitch.png)",
            backgroundSize: "cover",
            backgroundPosition: "center 30%",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(180deg, rgba(6,5,4,0.55) 0%, rgba(6,5,4,0.25) 35%, rgba(6,5,4,0.82) 72%, rgba(6,5,4,0.98) 100%),
              radial-gradient(ellipse 55% 40% at 70% 20%, rgba(126,184,217,0.14), transparent 55%)
            `,
          }}
        />
      </div>
    );
  }

  return (
    <Link
      href="/clips"
      aria-label={`Watch clips — ${clip.title}`}
      className="group absolute inset-0 block overflow-hidden"
    >
      {fileUrl ? (
        <video
          ref={videoRef}
          src={fileUrl}
          poster={poster ?? undefined}
          muted
          playsInline
          loop
          autoPlay
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover transition duration-[1.1s] ease-out group-hover:scale-[1.04]"
        />
      ) : poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition duration-[1.1s] ease-out group-hover:scale-[1.04]"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url(/hero-pitch.png)",
            backgroundSize: "cover",
            backgroundPosition: "center 30%",
          }}
        />
      )}

      {/* Soft vignette so brand type stays readable — no floating chips */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(180deg, rgba(6,5,4,0.5) 0%, rgba(6,5,4,0.18) 30%, rgba(6,5,4,0.72) 68%, rgba(6,5,4,0.97) 100%),
            radial-gradient(ellipse 50% 40% at 72% 22%, rgba(142,196,230,0.14), transparent 55%)
          `,
        }}
      />
    </Link>
  );
}
