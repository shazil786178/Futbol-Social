import Link from "next/link";
import { notFound } from "next/navigation";
import { FollowUserButton } from "@/components/clips/follow-user-button";
import { PageShell } from "@/components/layout/page-shell";
import { BRAND } from "@/lib/brand";
import { getProfileByUsername, listHighlights } from "@/lib/matches/data";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [followRes, followersRes, clips] = await Promise.all([
    user
      ? supabase
          .from("user_follows")
          .select("followee_id")
          .eq("follower_id", user.id)
          .eq("followee_id", profile.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("user_follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("followee_id", profile.id),
    listHighlights().catch(() => []),
  ]);
  const myClips = clips.filter((c) => c.userId === profile.id).slice(0, 12);
  const isMe = user?.id === profile.id;

  return (
    <PageShell>
      <header className="fs-fade-up border-b border-[var(--line-strong)] pb-6">
        <p className="fs-kicker">Fan profile</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h1 className="fs-display text-4xl text-[var(--beige)]">@{profile.username}</h1>
          {!isMe ? (
            <FollowUserButton
              userId={profile.id}
              initialFollowing={Boolean(followRes.data)}
              signedIn={Boolean(user)}
            />
          ) : (
            <Link href="/clips/upload" className="fs-btn-primary text-sm">
              Post a clip
            </Link>
          )}
        </div>
        <p className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--beige-muted)]">
          <span>
            {BRAND.iqLabel}:{" "}
            <span className="font-mono font-semibold text-[var(--sky)]">{profile.football_iq}</span>
          </span>
          <span>
            Followers:{" "}
            <span className="font-mono font-semibold text-[var(--beige)]">
              {followersRes.count ?? 0}
            </span>
          </span>
          <span>
            Clips:{" "}
            <span className="font-mono font-semibold text-[var(--beige)]">{myClips.length}</span>
          </span>
        </p>
        {profile.oracle_badge ? (
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--sky)]">
            Oracle Badge
          </p>
        ) : null}
      </header>

      <section className="mt-8">
        <h2 className="fs-display text-xl">Clips</h2>
        {myClips.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--beige-dim)]">No clips posted yet.</p>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {myClips.map((c) => (
              <Link
                key={c.id}
                href={`/clips?tab=friends&start=${encodeURIComponent(c.id)}`}
                className="group relative aspect-[9/16] overflow-hidden rounded-lg bg-[var(--ink-raised)] ring-1 ring-[var(--line)]"
              >
                {c.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                ) : c.videoUrl ? (
                  <video src={c.videoUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                ) : null}
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-[11px] font-medium text-white">
                  {c.title}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Link
        href="/leaderboard"
        className="mt-8 inline-block text-xs font-semibold uppercase tracking-wider text-[var(--sky)] hover:text-[var(--beige)]"
      >
        Leaderboard →
      </Link>
    </PageShell>
  );
}
