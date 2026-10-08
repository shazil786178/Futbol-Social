import { PageShell } from "@/components/layout/page-shell";
import { OracleForm } from "@/components/oracle/oracle-form";
import { BRAND } from "@/lib/brand";
import { getOraclePicks, getUserOracle } from "@/lib/features/data";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: `Oracle — ${BRAND.name}` };

export default async function OraclePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [picks, mine] = user
    ? await Promise.all([getOraclePicks(), getUserOracle(user.id)])
    : [await getOraclePicks(), null];

  return (
    <PageShell wide>
      <h1 className="text-3xl font-bold text-white">The Oracle</h1>
      <p className="mt-2 text-zinc-400">
        Season-long picks. Top 1% accuracy earns a permanent Oracle Badge on your profile.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {user && !mine ? (
          <OracleForm />
        ) : user && mine ? (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-6">
            <p className="text-xs font-semibold uppercase text-amber-400">Locked in</p>
            <p className="mt-2 text-white">UCL: {mine.ucl_winner}</p>
            <p className="text-zinc-300">Top scorer: {mine.top_scorer}</p>
            {mine.dark_horse ? <p className="text-zinc-400">Dark horse: {mine.dark_horse}</p> : null}
            {mine.accuracy_score != null ? (
              <p className="mt-3 text-sm text-emerald-400">
                Oracle accuracy: {mine.accuracy_score} pts
              </p>
            ) : (
              <p className="mt-3 text-xs text-zinc-500">
                Scored automatically when the UCL season ends (sync job).
              </p>
            )}
          </div>
        ) : (
          <p className="text-zinc-500">
            <a href="/login" className="text-amber-400">
              Sign in
            </a>{" "}
            to submit Oracle picks.
          </p>
        )}

        <div>
          <h2 className="font-semibold text-white">Community Oracle picks</h2>
          <ul className="mt-4 space-y-2">
            {picks.length === 0 ? (
              <li className="text-sm text-zinc-500">No picks yet.</li>
            ) : (
              picks.map((p, i) => (
                <li key={i} className="rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-3 text-sm">
                  <span className="font-medium text-white">@{p.username}</span>
                  <span className="text-zinc-500"> · UCL {p.uclWinner} · {p.topScorer}</span>
                  {p.accuracyScore != null ? (
                    <span className="ml-2 text-emerald-400">{p.accuracyScore} pts</span>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </PageShell>
  );
}
