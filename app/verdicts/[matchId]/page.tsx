import { notFound } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { StructuredVerdictForm } from "@/components/verdict/structured-verdict-form";
import { getVerdictStats } from "@/lib/features/data";
import { getMatch } from "@/lib/matches/data";
import { BRAND } from "@/lib/brand";

export default async function MatchVerdictPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const match = await getMatch(matchId);
  if (!match) notFound();

  const stats = (await getVerdictStats(matchId))[0];

  return (
    <PageShell>
      <Link href="/verdicts" className="text-sm text-zinc-500 hover:text-white">
        ← All verdicts
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-white">
        {match.homeTeam} vs {match.awayTeam}
      </h1>

      {stats ? (
        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ["Match", stats.avgMatch],
            ["Referee", stats.avgReferee],
            ["Home", stats.avgHome],
            ["Away", stats.avgAway],
          ].map(([label, val]) => (
            <div key={label as string} className="rounded-xl border border-white/10 bg-zinc-900/80 p-4 text-center">
              <dt className="text-xs text-zinc-500">{label}</dt>
              <dd className="text-2xl font-bold text-amber-400">{val}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">No fan ratings yet.</p>
      )}

      {match.status === "finished" ? (
        <div className="mt-8">
          <StructuredVerdictForm matchId={matchId} />
        </div>
      ) : (
        <p className="mt-8 text-sm text-zinc-500">Structured verdicts open after full time.</p>
      )}
    </PageShell>
  );
}
