import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { BRAND } from "@/lib/brand";
import { listMatches, listWallPredictions } from "@/lib/matches/data";

export const metadata = {
  title: `Prediction Wall — ${BRAND.name}`,
  description: "Public live predictions — no login required.",
};

export default async function WallPage() {
  const [predictions, matches] = await Promise.all([
    listWallPredictions(),
    listMatches(),
  ]);

  const matchMap = new Map(matches.map((m) => [m.id, m]));

  return (
    <PageShell wide>
      <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Public</p>
      <h1 className="mt-2 text-3xl font-bold text-white">Prediction Wall</h1>
      <p className="mt-2 max-w-xl text-zinc-400">
        Every fan score pick, live. No account needed to watch — sign in to add yours.
        Embed:{" "}
        <Link href="/wall/embed" className="text-amber-400 hover:underline">
          /wall/embed
        </Link>
      </p>

      <ul className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3">
        {predictions.length === 0 ? (
          <li className="text-sm text-zinc-500">Predictions will appear here as fans lock them in.</li>
        ) : (
          predictions.map((p) => {
            const m = matchMap.get(p.matchId);
            return (
              <li
                key={p.id}
                className="mb-4 break-inside-avoid rounded-xl border border-white/10 bg-zinc-900/80 p-4"
              >
                <p className="text-xs text-zinc-500">
                  {m ? `${m.homeTeam} vs ${m.awayTeam}` : p.matchId}
                </p>
                <p className="mt-2 text-2xl font-bold text-amber-400">
                  {p.homeScore}–{p.awayScore}
                </p>
                <p className="mt-2 text-sm text-zinc-400">@{p.username}</p>
              </li>
            );
          })
        )}
      </ul>

      <Link href="/signup" className="mt-8 inline-block text-sm font-medium text-amber-400">
        Create account to predict →
      </Link>
    </PageShell>
  );
}
