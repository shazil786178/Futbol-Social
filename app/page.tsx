import Link from "next/link";
import { redirect } from "next/navigation";
import { HeroClip } from "@/components/home/hero-clip";
import { StartScreen, type StartProfile } from "@/components/home/start-screen";
import { MatchCard } from "@/components/match/match-card";
import { createClient } from "@/lib/supabase/server";
import { AdSlot } from "@/components/ads/ad-slot";
import { BRAND } from "@/lib/brand";
import { loadClipReel } from "@/lib/clips/load-reel";
import { listMatches } from "@/lib/matches/data";
import { formatScore, statusClockLabel } from "@/lib/matches/format";

export const dynamic = "force-dynamic";

async function loadStartProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<(StartProfile & { onboarded: boolean }) | null> {
  const full = await supabase
    .from("profiles")
    .select("username, football_iq, supported_team, favorite_player, favorite_league, onboarded_at")
    .eq("id", userId)
    .maybeSingle();

  if (!full.error && full.data) {
    return { ...full.data, onboarded: Boolean(full.data.onboarded_at) };
  }

  // Survey columns not migrated yet — only nag users with no club at all
  const basic = await supabase
    .from("profiles")
    .select("username, football_iq, supported_team")
    .eq("id", userId)
    .maybeSingle();
  if (!basic.data) return null;
  return { ...basic.data, onboarded: Boolean(basic.data.supported_team) };
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const profile = await loadStartProfile(supabase, user.id);
    if (profile && !profile.onboarded) redirect("/welcome");
    if (profile) {
      return <StartScreen supabase={supabase} userId={user.id} profile={profile} />;
    }
  }

  const [matches, clips] = await Promise.all([listMatches(), loadClipReel()]);
  const featured = clips[0] ?? null;
  const live = matches.filter((m) => m.status === "live");
  const upcoming = matches
    .filter((m) => m.status === "upcoming")
    .sort((a, b) => +new Date(a.kickoffAt) - +new Date(b.kickoffAt))
    .slice(0, 6);
  const tonight = [...live, ...upcoming].slice(0, 8);

  const tickerItems = tonight.length > 0 ? tonight : matches.slice(0, 6);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <section className="relative flex min-h-[92vh] flex-col justify-end overflow-hidden px-4 pb-16 pt-24 sm:min-h-[88vh] sm:justify-center sm:pb-20">
        <HeroClip clip={featured} />

        <div className="pointer-events-none relative mx-auto w-full max-w-4xl">
          <p className="fs-fade-up text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--sky)]">
            {live.length > 0 ? (
              <span className="inline-flex items-center gap-2">
                <span className="fs-live-dot" />
                {live.length} live right now
              </span>
            ) : featured ? (
              "The night is on · tap for clips"
            ) : (
              "The match is the feed"
            )}
          </p>

          <h1 className="fs-display fs-fade-up-delay mt-4 max-w-[11ch] text-[clamp(3.4rem,12vw,7rem)] font-semibold leading-[0.9] text-[var(--beige)]">
            {BRAND.name}
          </h1>

          <p className="fs-fade-up-delay-2 mt-6 max-w-md text-[1.08rem] leading-relaxed text-[var(--beige-muted)]">
            {featured
              ? `${featured.title}. Open Clips and stay in the night.`
              : "Live rooms. Match clips. Takes that only make sense while the whistle is out."}
          </p>

          <div className="pointer-events-auto fs-fade-up-delay-2 mt-10 flex flex-wrap items-center gap-3">
            <Link href="/clips" className="fs-btn-primary">
              Watch clips
            </Link>
            <Link href="/feed" className="fs-btn-ghost">
              Open today
            </Link>
          </div>
        </div>
      </section>

      {tickerItems.length > 0 ? (
        <div className="overflow-hidden border-y border-[var(--line-strong)] bg-[var(--ink-raised)]">
          <div className="fs-ticker gap-12 py-3.5 pr-12 text-xs tracking-wide text-[var(--beige-muted)]">
            {[...tickerItems, ...tickerItems].map((m, i) => (
              <Link
                key={`${m.id}-${i}`}
                href={`/matches/${m.id}`}
                className="inline-flex items-center gap-2.5 whitespace-nowrap hover:text-[var(--beige)]"
              >
                {m.status === "live" ? <span className="fs-live-dot" /> : null}
                <span className="text-[var(--beige-dim)]">
                  {m.competitionName}
                </span>
                <span className="font-medium text-[var(--beige)]">
                  {m.homeTeam}{" "}
                  <span className="font-mono text-[var(--sky)]">
                    {formatScore(m)}
                  </span>{" "}
                  {m.awayTeam}
                </span>
                <span className="text-[var(--sky)]">{statusClockLabel(m)}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-3xl px-4">
        <AdSlot placement="banner" />
      </div>

      <section className="mx-auto w-full max-w-3xl px-4 py-16">
        <div className="fs-section-head">
          <div>
            <p className="fs-kicker">On the board</p>
            <h2 className="fs-display mt-2 text-3xl text-[var(--beige)] sm:text-4xl">
              {live.length > 0 ? "Live & next" : "Coming up"}
            </h2>
          </div>
          <Link
            href="/matches"
            className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--sky)] hover:text-[var(--beige)]"
          >
            All fixtures
          </Link>
        </div>

        <div className="grid gap-x-3 sm:grid-cols-2">
          {(tonight.length > 0 ? tonight : matches.slice(0, 6)).map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>

        <div className="mt-12">
          <div className="fs-section-head mb-1">
            <p className="fs-kicker">Stay in it</p>
          </div>
          <Link href="/fantasy" className="fs-board group flex items-center gap-4 px-3 py-5">
            <div className="min-w-0 flex-1">
              <p className="fs-display text-xl text-[var(--beige)] sm:text-2xl">
                Champions League Fantasy
              </p>
              <p className="mt-1 text-sm text-[var(--beige-dim)] group-hover:text-[var(--beige-muted)]">
                £100m. Eleven players. Real points every matchday.
              </p>
            </div>
            <span className="shrink-0 text-sm text-[var(--sky)]">Play →</span>
          </Link>
          <Link href="/shots" className="fs-board group flex items-center gap-4 px-1 py-5">
            <div className="min-w-0 flex-1">
              <p className="fs-display text-xl text-[var(--beige)] sm:text-2xl">
                Shots from the stands
              </p>
              <p className="mt-1 text-sm text-[var(--beige-dim)] group-hover:text-[var(--beige-muted)]">
                High-res fan photos. Rate players. Tag clubs.
              </p>
            </div>
            <span className="shrink-0 text-[11px] uppercase tracking-wider text-[var(--sky)]">
              Open →
            </span>
          </Link>
          <Link href="/clips" className="fs-board group flex items-center gap-4 px-1 py-5">
            <div className="min-w-0 flex-1">
              <p className="fs-display text-xl text-[var(--beige)] sm:text-2xl">
                Clips that pull you back
              </p>
              <p className="mt-1 text-sm text-[var(--beige-dim)] group-hover:text-[var(--beige-muted)]">
                Swipe the night’s moments. Tap through to the match room.
              </p>
            </div>
            <span className="shrink-0 text-[11px] uppercase tracking-wider text-[var(--sky)]">
              Open →
            </span>
          </Link>
          <Link href="/rival" className="fs-board group flex items-center gap-4 px-1 py-5">
            <div className="min-w-0 flex-1">
              <p className="fs-display text-xl text-[var(--beige)] sm:text-2xl">
                Rival Mode
              </p>
              <p className="mt-1 text-sm text-[var(--beige-dim)] group-hover:text-[var(--beige-muted)]">
                One fixture. Two fans. Bragging rights for the week.
              </p>
            </div>
            <span className="shrink-0 text-[11px] uppercase tracking-wider text-[var(--sky)]">
              Pair →
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
