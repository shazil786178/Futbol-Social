"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { recordClipView, toggleClipLike } from "@/app/clips/actions";
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
  /** "official" or an uploader's username */
  author: string;
  uploaderId?: string | null;
  likes: number;
  views?: number;
  liked?: boolean;
  accent: "sky" | "beige" | "live";
  competitionLabel?: string | null;
  happenedAt?: string | null;
  caption?: string | null;
};

export type ReelTabKey = "fyp" | "following" | "friends";

const TABS: { key: ReelTabKey; label: string }[] = [
  { key: "fyp", label: "For You" },
  { key: "following", label: "Following" },
  { key: "friends", label: "Friends" },
];

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
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
  signedIn,
  onToggleSound,
}: {
  clip: ClipReelItem;
  active: boolean;
  soundOn: boolean;
  signedIn: boolean;
  onToggleSound: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(false);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeSince = useRef<number | null>(null);
  const [liked, setLiked] = useState(Boolean(clip.liked));
  const [likeCount, setLikeCount] = useState(clip.likes);
  const [likeBurst, setLikeBurst] = useState(false);
  const [paused, setPaused] = useState(false);
  const [flash, setFlash] = useState(false);
  const [tapArmed, setTapArmed] = useState(true);
  const [embedReady, setEmbedReady] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [, startTransition] = useTransition();

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

  // Watch-time tracking: what the For You ranking learns from
  useEffect(() => {
    if (active) {
      activeSince.current = Date.now();
      return () => {
        const started = activeSince.current;
        activeSince.current = null;
        if (!started) return;
        const watched = Date.now() - started;
        const completed = watched > 25_000;
        void recordClipView(clip.id, watched, completed);
      };
    }
    // Reset transient UI when the slide scrolls away
    const t = setTimeout(() => {
      pausedRef.current = false;
      setPaused(false);
      setFlash(false);
      setTapArmed(true);
      setEmbedReady(false);
    }, 0);
    return () => clearTimeout(t);
  }, [active, clip.id]);

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

  function onLike() {
    if (!signedIn) {
      setHint("Sign in to like clips");
      setTimeout(() => setHint(null), 1800);
      return;
    }
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
    if (next) {
      setLikeBurst(true);
      setTimeout(() => setLikeBurst(false), 500);
    }
    startTransition(async () => {
      const res = await toggleClipLike(clip.id);
      if (res.error) {
        setLiked(!next);
        setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)));
        setHint(res.error);
        setTimeout(() => setHint(null), 2200);
      }
    });
  }

  const isOfficial = clip.author === "official";

  return (
    <article className="clips-slide relative h-[100dvh] w-full snap-start snap-always overflow-hidden bg-black">
      <div className="absolute inset-0 z-0">
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

      {hint ? (
        <div className="pointer-events-none absolute inset-x-0 top-24 z-50 flex justify-center">
          <span className="fs-fade-up rounded-full bg-black/70 px-4 py-1.5 text-xs font-semibold text-white ring-1 ring-white/15">
            {hint}
          </span>
        </div>
      ) : null}

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
          onClick={onLike}
          className="flex flex-col items-center gap-1"
          aria-label={liked ? "Unlike" : "Like"}
        >
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-lg ring-1 ring-white/25 backdrop-blur-md transition ${
              liked ? "text-[var(--live)]" : "text-[var(--beige)]"
            } ${likeBurst ? "fs-like-burst" : ""}`}
          >
            ♥
          </span>
          <span className="text-[11px] text-[var(--beige-muted)]">
            {formatCount(likeCount)}
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

        {!isOfficial && clip.uploaderId ? (
          <Link
            href={`/u/${clip.author}`}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-[var(--sky)] ring-1 ring-white/25 backdrop-blur-md"
          >
            @
          </Link>
        ) : clip.matchId !== "matches" ? (
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
        {clip.caption ? (
          <p className="mt-1.5 max-w-[78%] text-sm text-[var(--beige-muted)]">{clip.caption}</p>
        ) : null}
        <p className="mt-2 text-sm text-[var(--beige-muted)]">
          {isOfficial ? "Official match video · sound on" : `@${clip.author} · fan clip`}
          {clip.views ? ` · ${formatCount(clip.views)} views` : ""}
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

function EmptyTab({ tab, signedIn }: { tab: ReelTabKey; signedIn: boolean }) {
  const copy =
    tab === "following"
      ? {
          title: "Follow a club to fill this tab",
          body: "Clips from the teams you follow land here first — goals, highlights and fan uploads.",
          cta: { href: "/follow", label: "Follow teams" },
        }
      : tab === "friends"
        ? {
            title: signedIn ? "No friend clips yet" : "Sign in to see friends' clips",
            body: signedIn
              ? "Follow people from their profile, or post the first clip yourself."
              : "Clips posted by the people you follow show up here.",
            cta: signedIn
              ? { href: "/clips/upload", label: "Post a clip" }
              : { href: "/login", label: "Sign in" },
          }
        : {
            title: "Tonight's tape is loading",
            body: "Official league highlights with audio. Add YOUTUBE_API_KEY in Vercel if this stays empty.",
            cta: { href: "/matches", label: "Browse matches" },
          };

  return (
    <div className="flex h-[100dvh] snap-start flex-col items-center justify-center bg-[var(--ink)] px-6 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--sky)]">Clips</p>
      <h1 className="fs-display mt-4 text-3xl text-[var(--beige)]">{copy.title}</h1>
      <p className="mt-3 max-w-sm text-sm text-[var(--beige-muted)]">{copy.body}</p>
      <Link href={copy.cta.href} className="fs-btn-primary mt-8">
        {copy.cta.label}
      </Link>
    </div>
  );
}

export function ClipsReel({
  clips,
  tab = "fyp",
  counts,
  signedIn = false,
  startId,
}: {
  clips: ClipReelItem[];
  tab?: ReelTabKey;
  counts?: Partial<Record<ReelTabKey, number>>;
  signedIn?: boolean;
  startId?: string | null;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(() => {
    if (!startId) return 0;
    const i = clips.findIndex((c) => c.id === startId);
    return i >= 0 ? i : 0;
  });
  const [soundOn, setSoundOn] = useState(false);

  const toggleSound = useCallback(() => setSoundOn((v) => !v), []);

  // Jump to a deep-linked clip
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !startId) return;
    const i = clips.findIndex((c) => c.id === startId);
    if (i > 0) el.scrollTo({ top: i * el.clientHeight });
  }, [startId, clips]);

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / el.clientHeight);
    setActiveIndex(Math.max(0, Math.min(clips.length - 1, idx)));
  }, [clips.length]);

  return (
    <div className="relative bg-black">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link
          href="/"
          className="pointer-events-auto grid h-9 w-9 place-items-center rounded-full bg-black/45 text-[var(--beige)] ring-1 ring-white/10"
          aria-label="Home"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />
          </svg>
        </Link>
        <nav className="pointer-events-auto fs-reel-tabs flex items-center gap-1 rounded-full bg-black/45 p-1 ring-1 ring-white/10 backdrop-blur-md">
          {TABS.map((t) => {
            const active = t.key === tab;
            const n = counts?.[t.key];
            return (
              <Link
                key={t.key}
                href={t.key === "fyp" ? "/clips" : `/clips?tab=${t.key}`}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-[var(--beige)] text-[var(--ink)]"
                    : "text-[var(--beige-muted)] hover:text-[var(--beige)]"
                }`}
              >
                {t.label}
                {!active && n ? <span className="ml-1 opacity-60">{n}</span> : null}
              </Link>
            );
          })}
        </nav>
        <Link
          href={signedIn ? "/clips/upload" : "/login?next=/clips/upload"}
          className="pointer-events-auto grid h-9 w-9 place-items-center rounded-full bg-[var(--sky)] text-[var(--ink)] ring-1 ring-[var(--sky)]"
          aria-label="Post a clip"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Link>
      </div>

      {clips.length > 0 ? (
        <div className="pointer-events-none absolute right-3 top-[calc(max(0.75rem,env(safe-area-inset-top))+2.9rem)] z-30 rounded-full bg-black/40 px-2.5 py-1 text-[11px] text-[var(--beige-dim)] ring-1 ring-white/10">
          {activeIndex + 1} / {clips.length}
        </div>
      ) : null}

      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="h-[100dvh] snap-y snap-mandatory overflow-y-auto overscroll-y-contain"
      >
        {clips.length === 0 ? (
          <EmptyTab tab={tab} signedIn={signedIn} />
        ) : (
          clips.map((clip, i) => (
            <ClipSlide
              key={clip.id}
              clip={clip}
              active={i === activeIndex}
              soundOn={soundOn}
              signedIn={signedIn}
              onToggleSound={toggleSound}
            />
          ))
        )}
      </div>
    </div>
  );
}
