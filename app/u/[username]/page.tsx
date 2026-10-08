import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { BRAND } from "@/lib/brand";
import { getProfileByUsername } from "@/lib/matches/data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return { title: `@${username} — ${BRAND.name}` };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);

  if (!profile) notFound();

  return (
    <PageShell>
      <header className="fs-fade-up border-b border-[var(--line-strong)] pb-6">
        <p className="fs-kicker">Fan profile</p>
        <h1 className="fs-display mt-2 text-4xl text-[var(--beige)]">
          @{profile.username}
        </h1>
        <p className="mt-3 text-sm text-[var(--beige-muted)]">
          {BRAND.iqLabel}:{" "}
          <span className="font-mono font-semibold text-[var(--sky)]">
            {profile.football_iq}
          </span>
        </p>
        {profile.oracle_badge ? (
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--sky)]">
            Oracle Badge
          </p>
        ) : null}
      </header>

      <Link
        href="/leaderboard"
        className="mt-8 inline-block text-xs font-semibold uppercase tracking-wider text-[var(--sky)] hover:text-[var(--beige)]"
      >
        Leaderboard →
      </Link>
    </PageShell>
  );
}
