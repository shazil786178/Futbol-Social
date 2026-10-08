import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { BRAND } from "@/lib/brand";
import { getVerdictStats } from "@/lib/features/data";
import { getMatch, listMatches } from "@/lib/matches/data";

export const metadata = { title: `Verdicts — ${BRAND.name}` };

export default async function VerdictsPage() {
  const [stats, matches] = await Promise.all([getVerdictStats(), listMatches()]);
  const matchMap = new Map(matches.map((m) => [m.id, m]));

  return (
    <PageShell wide>
      <h1 className="text-3xl font-bold text-white">Fan verdict dashboards</h1>
      <p className="mt-2 text-zinc-400">
        Structured 1–10 ratings — fan-sourced data for journalists and creators.
      </p>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-zinc-500">
              <th className="py-3 pr-4">Match</th>
              <th className="py-3 pr-4">Fans</th>
              <th className="py-3 pr-4">Match</th>
              <th className="py-3 pr-4">Ref</th>
              <th className="py-3 pr-4">Home</th>
              <th className="py-3 pr-4">Away</th>
            </tr>
          </thead>
          <tbody>
            {stats.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-zinc-500">
                  No structured verdicts yet. Rate a finished match from its page.
                </td>
              </tr>
            ) : (
              stats.map((s) => {
                const m = matchMap.get(s.matchId);
                return (
                  <tr key={s.matchId} className="border-b border-white/5 text-zinc-300">
                    <td className="py-3 pr-4">
                      <Link href={`/verdicts/${s.matchId}`} className="text-emerald-400 hover:underline">
                        {m ? `${m.homeTeam} vs ${m.awayTeam}` : s.matchId}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">{s.count}</td>
                    <td className="py-3 pr-4">{s.avgMatch}</td>
                    <td className="py-3 pr-4">{s.avgReferee}</td>
                    <td className="py-3 pr-4">{s.avgHome}</td>
                    <td className="py-3 pr-4">{s.avgAway}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
