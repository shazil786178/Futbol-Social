import Link from "next/link";
import { entityAccent, entitySlug, portraitUrl } from "@/lib/entities/slug";

export function EntityHero({
  kind,
  name,
  subtitle,
  subtitleHref,
  coverUrl,
}: {
  kind: "player" | "team";
  name: string;
  subtitle?: string | null;
  subtitleHref?: string | null;
  coverUrl?: string | null;
}) {
  const portrait = coverUrl || portraitUrl(name, kind);
  const accent = entityAccent(name);

  return (
    <header className="relative overflow-hidden border border-[var(--line-strong)] bg-[var(--ink-raised)]">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: `
            radial-gradient(ellipse 70% 80% at 80% 20%, ${accent}, transparent 55%),
            linear-gradient(135deg, rgba(8,7,6,0.2), rgba(8,7,6,0.85))
          `,
        }}
      />
      <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:p-7">
        <div className="relative mx-auto h-40 w-40 shrink-0 overflow-hidden border border-[var(--line-strong)] shadow-[0_20px_50px_rgba(0,0,0,0.45)] sm:mx-0 sm:h-48 sm:w-48">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={portrait} alt="" className="h-full w-full object-cover" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ boxShadow: "inset 0 -40px 50px rgba(6,5,4,0.55)" }}
          />
        </div>
        <div className="min-w-0 flex-1 text-center sm:pb-1 sm:text-left">
          <p className="fs-kicker !text-[var(--sky)]">
            {kind === "player" ? "Player card" : "Club card"}
          </p>
          <h1 className="fs-display mt-2 text-4xl text-[var(--beige)] sm:text-5xl">
            {name}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-sm text-[var(--beige-muted)]">
              {subtitleHref ? (
                <Link href={subtitleHref} className="hover:text-[var(--sky)]">
                  {subtitle}
                </Link>
              ) : (
                subtitle
              )}
            </p>
          ) : null}
          <p className="mt-3 text-[10px] uppercase tracking-[0.16em] text-[var(--beige-dim)]">
            /{kind === "player" ? "players" : "teams"}/{entitySlug(name)}
          </p>
        </div>
      </div>
    </header>
  );
}
