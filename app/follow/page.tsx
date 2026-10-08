import Link from "next/link";
import { redirect } from "next/navigation";
import {
  FollowPlayerForm,
  FollowTeamForm,
} from "@/components/follow/follow-forms";
import { PageShell } from "@/components/layout/page-shell";
import { BRAND } from "@/lib/brand";
import {
  listDirectoryTeams,
  listFollowedPlayers,
  listFollowedTeams,
  listPopularPlayers,
} from "@/lib/features/follows";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: `Follow — ${BRAND.name}` };

export default async function FollowPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/follow");

  const [teams, followedTeams, followedPlayers] = await Promise.all([
    listDirectoryTeams(),
    listFollowedTeams(user.id),
    listFollowedPlayers(user.id),
  ]);

  return (
    <PageShell wide>
      <header className="fs-fade-up border-b border-[var(--line-strong)] pb-6">
        <p className="fs-kicker">Watchlist</p>
        <h1 className="fs-display mt-2 text-4xl text-[var(--beige)] sm:text-5xl">
          Follow
        </h1>
        <p className="fs-hang mt-4 max-w-lg text-sm leading-relaxed text-[var(--beige-muted)]">
          Tap a player or club to open their card — portrait, fan rating, and
          photo reel. Alerts land in{" "}
          <Link
            href="/notifications"
            className="text-[var(--sky)] hover:text-[var(--beige)]"
          >
            Notifications
          </Link>
          .
        </p>
      </header>

      <div className="mt-10 grid gap-12 lg:grid-cols-2">
        <section>
          <h2 className="fs-kicker !text-[var(--sky)]">Teams</h2>
          <p className="mt-2 text-sm text-[var(--beige-dim)]">
            {teams.length} clubs from synced fixtures.
          </p>
          <div className="mt-4">
            <FollowTeamForm teams={teams} following={followedTeams} />
          </div>
        </section>

        <section>
          <h2 className="fs-kicker !text-[var(--sky)]">Players</h2>
          <p className="mt-2 text-sm text-[var(--beige-dim)]">
            Tap a chip for rating + photos — or type any name.
          </p>
          <div className="mt-4">
            <FollowPlayerForm
              popular={listPopularPlayers()}
              following={followedPlayers}
            />
          </div>
        </section>
      </div>
    </PageShell>
  );
}
