import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { BRAND } from "@/lib/brand";
import { getLeaderboard } from "@/lib/matches/data";

export const metadata = { title: `Leaderboard — ${BRAND.name}` };

export default async function LeaderboardPage() {
  const rows = await getLeaderboard();

  return (
    <PageShell>
      <header className="fs-fade-up border-b border-[var(--line-strong)] pb-6">
        <p className="fs-kicker">Standings</p>
        <h1 className="fs-display mt-2 text-4xl text-[var(--beige)]">
          Leaderboard
        </h1>
        <p className="mt-2 text-sm text-[var(--beige-muted)]">
          Top fans by {BRAND.iqLabel}.
        </p>
      </header>

      <ol className="mt-2">
        {rows.length === 0 ? (
          <li className="py-8 text-sm text-[var(--beige-dim)]">
            No profiles yet — be the first on the board.
          </li>
        ) : (
          rows.map((row, i) => (
            <li key={row.id}>
              <Link
                href={`/u/${row.username}`}
                className="fs-board group flex items-center justify-between gap-3 px-1 py-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-7 font-mono text-sm tabular-nums text-[var(--beige-dim)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="truncate font-medium text-[var(--beige)] group-hover:text-white">
                    @{row.username}
                    {row.oracle_badge ? (
                      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--sky)]">
                        Oracle
                      </span>
                    ) : null}
                  </span>
                </div>
                <span className="font-mono font-semibold tabular-nums text-[var(--sky)]">
                  {row.football_iq}
                </span>
              </Link>
            </li>
          ))
        )}
      </ol>
    </PageShell>
  );
}
