import { notFound } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { RoomPostForm } from "@/components/rooms/room-post-form";
import { getClubRoom, leagueBadgeClass, leagueShort } from "@/lib/club-rooms";
import { getRoomPosts } from "@/lib/features/data";
import { BRAND } from "@/lib/brand";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const room = getClubRoom(slug);
  return { title: room ? `${room.name} — ${BRAND.name}` : BRAND.name };
}

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const room = getClubRoom(slug);
  if (!room) notFound();

  const posts = await getRoomPosts(slug);

  return (
    <PageShell wide>
      <Link
        href="/rooms"
        className="text-xs uppercase tracking-wider text-[var(--beige-dim)] hover:text-[var(--sky)]"
      >
        ← All club rooms
      </Link>
      <header className="mt-4 border-b border-[var(--line-strong)] pb-6">
        <span
          className={`inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${leagueBadgeClass(room.leagueId)}`}
        >
          {leagueShort(room.leagueId)} · {room.leagueLabel}
        </span>
        <h1 className="fs-display mt-3 text-4xl text-[var(--beige)]">
          {room.name}
        </h1>
        <p className="mt-2 max-w-lg text-sm text-[var(--beige-muted)]">
          Unofficial fan room for {room.name} supporters — not affiliated with
          or endorsed by the club.
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
        <ul>
          {posts.length === 0 ? (
            <li className="py-8 text-sm text-[var(--beige-dim)]">
              Quiet terrace — start the chant.
            </li>
          ) : (
            posts.map((p) => (
              <li key={p.id} className="fs-board px-1 py-4">
                <p className="text-sm font-medium text-[var(--beige)]">
                  @{p.username}
                </p>
                <p className="mt-1 text-sm text-[var(--beige-muted)]">
                  {p.content}
                </p>
              </li>
            ))
          )}
        </ul>
        <RoomPostForm slug={slug} clubName={room.name} />
      </div>
    </PageShell>
  );
}
