import Link from "next/link";
import { EntityHero } from "@/components/entities/entity-hero";
import { RatingPanel } from "@/components/entities/rating-panel";
import { PageShell } from "@/components/layout/page-shell";
import { ShotGrid } from "@/components/shots/shot-grid";
import { BRAND } from "@/lib/brand";
import { CATALOG_PLAYERS, resolveTeam } from "@/lib/entities/catalog";
import { getEntityRating } from "@/lib/entities/ratings";
import { entitySlug, portraitUrl } from "@/lib/entities/slug";
import { listPhotosForEntity } from "@/lib/photos/data";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const team = resolveTeam(slug);
  return { title: `${team.name} — ${BRAND.name}` };
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const team = resolveTeam(slug);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [rating, photos] = await Promise.all([
    getEntityRating("team", team.slug, user?.id),
    listPhotosForEntity("team", team.slug),
  ]);

  const roster = CATALOG_PLAYERS.filter(
    (p) => entitySlug(p.team) === team.slug,
  );
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
          kind="team"
          name={team.name}
          subtitle={team.league}
          coverUrl={cover}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <RatingPanel
            entityType="team"
            entityKey={team.slug}
            entityLabel={team.name}
            average={rating.average}
            count={rating.count}
            mine={rating.mine}
            signedIn={Boolean(user)}
          />

          {roster.length > 0 ? (
            <section>
              <div className="fs-section-head mb-3">
                <h2 className="fs-kicker !text-[var(--sky)]">On the card</h2>
              </div>
              <div className="fs-player-rail">
                {roster.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/players/${p.slug}`}
                    className="fs-player-chip group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={portraitUrl(p.name, "player")}
                      alt=""
                      className="h-14 w-14 object-cover"
                    />
                    <span className="mt-1.5 line-clamp-2 text-center text-[10px] font-semibold leading-tight text-[var(--beige-muted)] group-hover:text-[var(--beige)]">
                      {p.name.split(" ").slice(-1)[0]}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <div className="fs-section-head mb-3">
              <h2 className="fs-kicker !text-[var(--sky)]">Club shots</h2>
              <Link
                href="/shots"
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
            href="/follow"
            className="fs-board block px-4 py-4 text-sm text-[var(--beige)]"
          >
            Follow {team.name} →
          </Link>
          <Link href="/shots" className="fs-btn-primary w-full text-sm">
            Publish a {team.name} photo
          </Link>
          <Link
            href="/rooms"
            className="fs-board block px-4 py-4 text-sm text-[var(--beige-muted)]"
          >
            Club rooms →
          </Link>
        </aside>
      </div>
    </PageShell>
  );
}
