import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { listMatches, listWallPredictions } from "@/lib/matches/data";

export const metadata = {
  title: `Prediction Wall (embed) — ${BRAND.name}`,
  description: "Embeddable live fan predictions.",
};

export default async function WallEmbedPage() {
  const [predictions, matches] = await Promise.all([
    listWallPredictions(),
    listMatches(),
  ]);

  const matchMap = new Map(matches.map((m) => [m.id, m]));

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-white">
      <div className="mb-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
          {BRAND.name}
        </p>
        <h1 className="mt-1 text-2xl font-bold">Prediction Wall</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {predictions.length} fan picks · live
        </p>
      </div>

      <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3">
        {predictions.length === 0 ? (
          <li className="text-sm text-zinc-500">Waiting for predictions…</li>
        ) : (
          predictions.map((p) => {
            const m = matchMap.get(p.matchId);
            return (
              <li
                key={p.id}
                className="mb-4 break-inside-avoid rounded-xl border border-white/10 bg-zinc-900/90 p-4"
              >
                <p className="text-xs text-zinc-500">
                  {m ? `${m.homeTeam} vs ${m.awayTeam}` : p.matchId}
                </p>
                <p className="mt-2 text-3xl font-bold text-amber-400">
                  {p.homeScore}–{p.awayScore}
                </p>
                <p className="mt-2 text-sm text-zinc-400">@{p.username}</p>
              </li>
            );
          })
        )}
      </ul>

      <p className="mt-8 text-center text-xs text-zinc-600">
        <Link href="/wall" className="text-amber-400/80 hover:text-amber-400">
          Open full wall →
        </Link>
      </p>
    </div>
  );
}
