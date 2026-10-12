import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipUploadForm } from "@/components/clips/clip-upload-form";
import { PageShell } from "@/components/layout/page-shell";
import { BRAND } from "@/lib/brand";
import { listMatches } from "@/lib/matches/data";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: `Post a clip — ${BRAND.name}`,
};

export const dynamic = "force-dynamic";

export default async function UploadClipPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/clips/upload");

  const matches = await listMatches();
  const now = Date.now();
  const recent = matches
    .filter((m) => Math.abs(+new Date(m.kickoffAt) - now) < 4 * 86_400_000)
    .sort((a, b) => Math.abs(+new Date(a.kickoffAt) - now) - Math.abs(+new Date(b.kickoffAt) - now))
    .slice(0, 40)
    .map((m) => ({ id: m.id, label: `${m.homeTeam} vs ${m.awayTeam} · ${m.competitionName}` }));
  const teams = [...new Set(matches.flatMap((m) => [m.homeTeam, m.awayTeam]))].sort();

  return (
    <PageShell>
      <div className="flex items-center justify-between">
        <div>
          <p className="fs-kicker">Clips</p>
          <h1 className="fs-display mt-2 text-3xl sm:text-4xl">Post a clip</h1>
        </div>
        <Link href="/clips" className="text-sm text-[var(--sky)]">
          Back to Clips →
        </Link>
      </div>
      <p className="mt-3 max-w-lg text-sm text-[var(--beige-muted)]">
        Your five-a-side screamer, the view from your seat, a skill you finally
        landed. Friends see it first; the For You feed picks it up if people watch.
      </p>
      <div className="mt-8">
        <ClipUploadForm matches={recent} teams={teams} />
      </div>
    </PageShell>
  );
}
