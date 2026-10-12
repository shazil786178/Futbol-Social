"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { withEmbedPlayback } from "@/lib/football-api/scorebat";

export type ClipReelItem = {
  id: string;
  title: string;
  duration: string;
  thumbnailLabel: string;
  videoUrl: string | null;
  embedUrl?: string | null;
  thumbnailUrl?: string | null;
  matchId: string;
  matchLabel: string;
  author: string;
  likes: number;
  accent: "sky" | "beige" | "live";
  competitionLabel?: string | null;
  happenedAt?: string | null;
};

function formatLikes(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function formatClipDay(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yest = new Date(today);
  yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function PlayFlash({ show, paused }: { show: boolean; paused: boolean }) {
  if (!show) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60 text-[var(--beige)] ring-1 ring-white/20">
        {paused ? (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
          </svg>
        )}
      </span>
    </div>
  );
}

function ClipSlide({
  clip,
  active,
  soundOn,
  onToggleSound,
}: {
  clip: ClipReelItem;
  active: boolean;
  soundOn: boolean;
  onToggleSound: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(false);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [liked, setLiked] = useState(false);
  const [paused, setPaused] = useState(false);
  const [flash, setFlash] = useState(false);
  const [tapArmed, setTapArmed] = useState(true);
  const [embedReady, setEmbedReady] = useState(false);

  const hasEmbed = Boolean(clip.embedUrl);
  const hasFile = Boolean(clip.videoUrl) && !hasEmbed;

  const showFlash = useCallback((isPaused: boolean) => {
    setFlash(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(false), 350);
    setPaused(isPaused);
    pausedRef.current = isPaused;
  }, []);

  const disarmBriefly = useCallback(() => {
    setTapArmed(false);
    if (armTimer.current) clearTimeout(armTimer.current);
    armTimer.current = setTimeout(() => setTapArmed(true), 400);
  }, []);

  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
      if (armTimer.current) clearTimeout(armTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!active) {
      pausedRef.current = false;
      setPaused(false);
      setFlash(false);
      setTapArmed(true);
      setEmbedReady(false);
    }
  }, [active]);

  // Native file video only
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hasFile) return;
    video.muted = !soundOn;
    if (active && !paused) {
      void video.play().catch(() => {
        video.muted = true;
        void video.play().catch(() => undefined);
      });
    } else {
      video.pause();
      if (!active) video.currentTime = 0;
    }
  }, [active, soundOn, paused, hasFile]);

  function pauseOnly(e: React.SyntheticEvent) {
    e.stopPropagation();
    if (!hasFile || pausedRef.current || !tapArmed) return;
    showFlash(true);
    disarmBriefly();
  }

  function playOnly(e: React.SyntheticEvent) {
    e.stopPropagation();
    if (!hasFile || !pausedRef.current || !tapArmed) return;
    showFlash(false);
    disarmBriefly();
  }

  return (
    <article className="clips-slide relative h-[100dvh] w-full snap-start snap-always overflow-hidden bg-black">
      <div className="absolute inset-0 z-0">
        {/* Poster while embed loads — avoids black flash */}
        {hasEmbed && clip.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={clip.thumbnailUrl}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover transition-opacity ${
              active && embedReady ? "opacity-0" : "opacity-100"
            }`}
          />
        ) : null}

        {!hasEmbed && clip.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={clip.thumbnailUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-40"
          />
        ) : null}

        {hasEmbed && active && soundOn ? (
          <iframe
            src={withEmbedPlayback(clip.embedUrl!, { autoplay: true, sound: true })}
            title={clip.title}
            className="absolute inset-0 h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            onLoad={() => setEmbedReady(true)}
          />
        ) : null}

        {hasEmbed && active && !soundOn ? (
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/35">
            <button
              type="button"
              onClick={onToggleSound}
              className="pointer-events-auto flex flex-col items-center gap-3"
            >
              <span className="fs-play-burst grid h-20 w-20 place-items-center rounded-full bg-[var(--sky)] text-[var(--paper-ink)] shadow-[0_12px_40px_rgba(60,227,154,0.45)]">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
              <span className="rounded-full bg-black/55 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur">
                Play with sound
              </span>
            </button>
          </div>
        ) : null}

        {hasFile ? (
          <video
            ref={videoRef}
            src={clip.videoUrl!}
            playsInline
            loop
            muted={!soundOn}
            preload={active ? "auto" : "metadata"}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}

        {hasFile ? <PlayFlash show={flash} paused={paused} /> : null}
      </div>

      {/* Custom pause only for uploaded file clips — never for ScoreBat embeds */}
      {hasFile && active && !paused && tapArmed ? (
        <div
          role="presentation"
          onClick={pauseOnly}
          className="absolute left-0 top-0 z-10 cursor-pointer"
          style={{ right: 72, bottom: 160 }}
        />
      ) : null}

      {hasFile && active && paused && tapArmed ? (
        <button
          type="button"
          aria-label="Play"
          onClick={playOnly}
          className="absolute left-0 top-0 z-10 cursor-pointer border-0 bg-transparent"
          style={{ right: 72, bottom: 160 }}
        />
      ) : null}

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-[40%] bg-gradient-to-t from-black via-black/55 to-transparent"
      />

      <div className="absolute bottom-28 right-2 z-50 flex w-16 flex-col items-center gap-4 sm:right-4">
        <button
          type="button"
          onClick={onToggleSound}
          className={`flex h-12 w-12 items-center justify-center rounded-full text-[10px] font-bold tracking-wide ring-1 backdrop-blur-md ${
            soundOn
              ? "bg-[var(--sky)] text-[var(--ink)] ring-[var(--sky)]"
              : "bg-black/60 text-[var(--beige)] ring-white/25"
          }`}
          aria-label={soundOn ? "Mute" : "Unmute"}
        >
          {soundOn ? "SND" : "MUTE"}
        </button>

        <button
          type="button"
          onClick={() => setLiked((v) => !v)}
          className="flex flex-col items-center gap-1"
          aria-label={liked ? "Unlike" : "Like"}
        >
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-lg ring-1 ring-white/25 backdrop-blur-md ${liked ? "text-[var(--live)]" : "text-[var(--beige)]"}`}
          >
            ♥
          </span>
          <span className="text-[11px] text-[var(--beige-muted)]">
            {formatLikes(clip.likes + (liked ? 1 : 0))}
          </span>
        </button>

        {clip.matchId !== "matches" ? (
          <Link
            href={`/matches/${clip.matchId}?tab=chat`}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-[var(--beige)] ring-1 ring-white/25 backdrop-blur-md"
          >
            Chat
          </Link>
        ) : null}

        {clip.matchId !== "matches" ? (
          <Link
            href={`/matches/${clip.matchId}`}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-[var(--sky)] ring-1 ring-white/25 backdrop-blur-md"
          >
            Go
          </Link>
        ) : null}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 px-4 pb-24 pr-[4.5rem] pt-6 sm:px-6 sm:pb-28">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--sky)]">
          {formatClipDay(clip.happenedAt) ?? "Highlights"}
          {clip.competitionLabel ? ` · ${clip.competitionLabel}` : ""}
        </p>
        <h2 className="fs-display mt-2 max-w-[78%] text-2xl font-semibold leading-snug text-[var(--beige)]">
          {clip.title}
        </h2>
        <p className="mt-2 text-sm text-[var(--beige-muted)]">
          {clip.author === "official" ? "Official match video · sound on" : `@${clip.author}`}
        </p>
        {clip.matchId !== "matches" ? (
          <div className="pointer-events-auto mt-4 flex flex-wrap gap-2">
            <Link
              href={`/matches/${clip.matchId}?tab=predictor`}
              className="rounded-sm bg-[var(--sky)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)]"
            >
              Predict this match
            </Link>
            <Link
              href={`/matches/${clip.matchId}?tab=feed`}
              className="rounded-sm border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-[var(--beige)]"
            >
              Open feed
            </Link>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function ClipsReel({ clips }: { clips: ClipReelItem[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [soundOn, setSoundOn] = useState(false);

  const toggleSound = useCallback(() => setSoundOn((v) => !v), []);

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / el.clientHeight);
    setActiveIndex(Math.max(0, Math.min(clips.length - 1, idx)));
  }, [clips.length]);

  if (clips.length === 0) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--ink)] px-6 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--sky)]">
          Clips
        </p>
        <h1 className="fs-display mt-4 text-3xl text-[var(--beige)]">
          Tonight&apos;s tape is loading
        </h1>
        <p className="mt-3 max-w-sm text-sm text-[var(--beige-muted)]">
          Official league highlights with audio. Add YOUTUBE_API_KEY in Vercel
          if this stays empty.
        </p>
        <Link href="/matches" className="fs-btn-primary mt-8">
          Browse matches
        </Link>
      </div>
    );
  }

  return (
    <div className="relative bg-black">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="rounded-full bg-black/40 px-3 py-1.5 text-xs font-semibold text-[var(--beige)] ring-1 ring-white/10">
          Tonight&apos;s tape
        </div>
        <div className="rounded-full bg-black/40 px-3 py-1.5 text-[11px] text-[var(--beige-dim)] ring-1 ring-white/10">
          {activeIndex + 1} / {clips.length}
        </div>
      </div>

      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="h-[100dvh] snap-y snap-mandatory overflow-y-auto overscroll-y-contain"
      >
        {clips.map((clip, i) => (
          <ClipSlide
            key={clip.id}
            clip={clip}
            active={i === activeIndex}
            soundOn={soundOn}
            onToggleSound={toggleSound}
          />
        ))}
      </div>
    </div>
  );
}
