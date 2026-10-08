import Link from "next/link";
import { UnreadBadge } from "@/components/notifications/unread-badge";
import { DesktopPrimaryNav } from "@/components/layout/desktop-primary-nav";
import { BRAND } from "@/lib/brand";
import { countUnreadNotifications, listMatches } from "@/lib/matches/data";
import { getDailyState } from "@/lib/streaks/daily";
import { createClient } from "@/lib/supabase/server";
import { formatScore, statusClockLabel } from "@/lib/matches/format";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const matches = await listMatches();
  const live = matches.filter((m) => m.status === "live").slice(0, 4);

  let username: string | null = null;
  let unreadCount = 0;
  let streak = 0;
  if (user) {
    const [{ data: profile }, unread, daily] = await Promise.all([
      supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle(),
      countUnreadNotifications(user.id),
      getDailyState(supabase, user.id),
    ]);
    username = profile?.username ?? null;
    streak = daily?.streakCount ?? 0;
    unreadCount = unread;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[rgba(10,15,26,0.86)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="group flex min-w-0 shrink-0 items-center gap-2">
          <span
            aria-hidden
            className="grid h-7 w-7 place-items-center rounded-full bg-[var(--sky)] text-[var(--paper-ink)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 4.2 3.4 2.5-1.3 4h-4.2l-1.3-4L12 6.2Z" />
            </svg>
          </span>
          <span className="fs-display block truncate text-[1.3rem] leading-none text-[var(--beige)]">
            {BRAND.name}
          </span>
        </Link>

        <DesktopPrimaryNav />

        <div className="flex shrink-0 items-center gap-2.5">
          {user ? (
            <>
              <Link
                href="/feed"
                className="hidden items-baseline gap-1.5 font-mono text-xs text-[var(--sky)] sm:inline-flex"
                title="Daily streak"
              >
                <span className="text-[var(--beige-dim)]">●</span>
                <span className="tabular-nums font-semibold">{streak}d</span>
              </Link>
              <UnreadBadge userId={user.id} initialCount={unreadCount} />
              <Link
                href="/profile"
                className="hidden text-xs text-[var(--beige-muted)] transition hover:text-[var(--beige)] sm:inline"
              >
                @{username ?? "you"}
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-2 py-1.5 text-xs text-[var(--beige-muted)] transition hover:text-[var(--beige)]"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="fs-btn-primary !px-3.5 !py-1.5 text-xs"
              >
                Join
              </Link>
            </>
          )}
        </div>
      </div>

      {live.length > 0 ? (
        <div className="border-t border-[var(--line)]">
          <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-4 py-2 text-xs">
            <span className="inline-flex shrink-0 items-center gap-1.5 pr-1 font-semibold text-[var(--live)]">
              <span className="fs-live-dot" />
              Live
            </span>
            {live.map((m) => (
              <Link
                key={m.id}
                href={`/matches/${m.id}?tab=chat`}
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--ink-soft)] px-3 py-1 text-[var(--beige-muted)] transition hover:text-[var(--beige)]"
              >
                <span className="text-[var(--beige)]">{m.homeTeam}</span>
                <span className="fs-score text-sm text-[var(--beige)]">
                  {formatScore(m)}
                </span>
                <span className="text-[var(--beige)]">{m.awayTeam}</span>
                <span className="text-[var(--live)]">{statusClockLabel(m).replace("LIVE ", "")}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
