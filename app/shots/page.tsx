import Link from "next/link";
import { ShotComposer } from "@/components/shots/shot-composer";
import { ShotGrid } from "@/components/shots/shot-grid";
import { PageShell } from "@/components/layout/page-shell";
import { BRAND } from "@/lib/brand";
import { CATALOG_PLAYERS } from "@/lib/entities/catalog";
import { portraitUrl } from "@/lib/entities/slug";
import { listPhotoPosts } from "@/lib/photos/data";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: `Shots — ${BRAND.name}`,
  description: "Fan photos from the stands — Instagram-style match gallery.",
};

export default async function ShotsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const shots = await listPhotoPosts(48);

  return (
    <PageShell wide>
      <header className="fs-fade-up mb-6">
        <p className="fs-kicker">From the stands</p>
        <h1 className="fs-display mt-2 text-4xl text-[var(--beige)] sm:text-5xl">
          Shots
        </h1>
        <p className="fs-hang mt-4 max-w-lg text-sm leading-relaxed text-[var(--beige-muted)]">
          High-res fan photos. Tag a player or club — their card lights up with
          your frame.
        </p>
      </header>

      <div className="fs-fade-up-delay mb-8">
        <ShotComposer signedIn={Boolean(user)} />
      </div>

      <section className="mb-10">
        <div className="fs-section-head mb-3">
          <h2 className="fs-kicker !text-[var(--sky)]">Hot players</h2>
          <Link
            href="/follow"
            className="text-[11px] uppercase tracking-wider text-[var(--beige-dim)] hover:text-[var(--sky)]"
          >
            Follow →
          </Link>
        </div>
        <div className="fs-player-rail">
          {CATALOG_PLAYERS.slice(0, 12).map((p) => (
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

      <ShotGrid shots={shots} />
    </PageShell>
  );
}
