import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { MatchCard } from "@/components/match/match-card";
import { BRAND } from "@/lib/brand";
import { listMatches } from "@/lib/matches/data";

export const metadata = { title: `Predictor — ${BRAND.name}` };

export default async function PredictorPage() {
  const matches = await listMatches();
  const upcoming = matches.filter((m) => m.status === "upcoming");

  return (
    <PageShell wide>
      <header className="fs-fade-up border-b border-[var(--line-strong)] pb-6">
        <p className="fs-kicker">Lock it before kickoff</p>
        <h1 className="fs-display mt-2 text-4xl text-[var(--beige)] sm:text-5xl">
          Predictor
        </h1>
        <p className="fs-hang mt-4 max-w-lg text-sm leading-relaxed text-[var(--beige-muted)]">
          Exact scores boost {BRAND.iqLabel}. Open any fixture for fan picks +
          the AI desk.
        </p>
      </header>

      <div className="mt-6">
        {upcoming.length === 0 ? (
          <p className="py-8 text-sm text-[var(--beige-dim)]">
            No upcoming fixtures right now.
          </p>
        ) : (
          upcoming.map((m) => (
            <div key={m.id}>
              <MatchCard match={m} />
              <Link
                href={`/matches/${m.id}?tab=predictor`}
                className="mb-3 mt-1 inline-block text-xs font-semibold uppercase tracking-wider text-[var(--sky)]"
              >
                Open predictor →
              </Link>
            </div>
          ))
        )}
      </div>
    </PageShell>
  );
}
