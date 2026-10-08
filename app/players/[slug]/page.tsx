import Link from "next/link";
import { EntityHero } from "@/components/entities/entity-hero";
import { RatingPanel } from "@/components/entities/rating-panel";
import { PageShell } from "@/components/layout/page-shell";
import { ShotGrid } from "@/components/shots/shot-grid";
import { BRAND } from "@/lib/brand";
import { resolvePlayer } from "@/lib/entities/catalog";
import { getEntityRating } from "@/lib/entities/ratings";
import { entitySlug } from "@/lib/entities/slug";
import { listPhotosForEntity } from "@/lib/photos/data";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const player = resolvePlayer(slug);
  return { title: `${player.name} — ${BRAND.name}` };
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const player = resolvePlayer(slug);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [rating, photos] = await Promise.all([
    getEntityRating("player", player.slug, user?.id),
    listPhotosForEntity("player", player.slug),
  ]);

  const cover = photos[0]?.imageUrl ?? null;

  return (
    <PageShell wide>
      <Link
        href="/shots"
        className="text-xs uppercase tracking-wider text-[var(--beige-dim)] hover:text-[var(--sky)]"
      >
        ← Shots
      </Link>

      <div className="mt-4">
        <EntityHero
          kind="player"
          name={player.name}
          subtitle={
            [player.role, player.team].filter(Boolean).join(" · ") || null
          }
          subtitleHref={
            player.team ? `/teams/${entitySlug(player.team)}` : null
          }
          coverUrl={cover}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <RatingPanel
            entityType="player"
            entityKey={player.slug}
            entityLabel={player.name}
            average={rating.average}
            count={rating.count}
            mine={rating.mine}
            signedIn={Boolean(user)}
          />

          <section>
            <div className="fs-section-head mb-3">
              <h2 className="fs-kicker !text-[var(--sky)]">Photo reel</h2>
              <Link
                href={`/shots`}
                className="text-[11px] uppercase tracking-wider text-[var(--beige-dim)] hover:text-[var(--sky)]"
              >
                Add shot →
              </Link>
            </div>
            <ShotGrid shots={photos} />
          </section>
        </div>

        <aside className="space-y-3">
          <Link
            href={`/follow`}
            className="fs-board block px-4 py-4 text-sm text-[var(--beige)]"
          >
            Follow from your watchlist →
          </Link>
          {player.team ? (
            <Link
              href={`/teams/${entitySlug(player.team)}`}
              className="fs-board block px-4 py-4 text-sm text-[var(--beige-muted)] hover:text-[var(--beige)]"
            >
              Open {player.team} club card →
            </Link>
          ) : null}
          <Link
            href={`/shots`}
            className="fs-btn-primary w-full text-sm"
          >
            Publish a photo of {player.name.split(" ").slice(-1)[0]}
          </Link>
        </aside>
      </div>
    </PageShell>
  );
}
