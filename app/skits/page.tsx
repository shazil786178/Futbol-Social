import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { SkitUploadForm } from "@/components/skits/skit-upload-form";
import { BRAND } from "@/lib/brand";
import { listMatches, listSkits } from "@/lib/matches/data";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: `Skits — ${BRAND.name}` };

export default async function SkitsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [skits, matches] = await Promise.all([listSkits(), listMatches()]);

  return (
    <PageShell wide>
      <h1 className="text-3xl font-bold text-white">Fan skits</h1>
      <p className="mt-2 text-zinc-400">Short comedy and memes from the terrace.</p>

      {user ? (
        <div className="mt-8">
          <SkitUploadForm matches={matches} />
        </div>
      ) : (
        <p className="mt-8 text-sm text-zinc-500">
          <Link href="/login" className="text-amber-400">
            Sign in
          </Link>{" "}
          to post a skit.
        </p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {skits.length === 0 ? (
          <p className="text-zinc-500">No skits yet — be the first.</p>
        ) : (
          skits.map((skit) => (
            <article
              key={skit.id}
              className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/80"
            >
              {skit.videoUrl ? (
                <video
                  src={skit.videoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="aspect-video w-full bg-black object-cover"
                />
              ) : null}
              <div className="p-4">
                <span className="text-[10px] font-semibold uppercase text-emerald-400">{skit.tag}</span>
                <h2 className="mt-2 text-sm font-medium text-white">{skit.title}</h2>
                <p className="mt-2 text-xs text-zinc-500">
                  @{skit.author} · {skit.duration}
                </p>
                {skit.matchId ? (
                  <Link
                    href={`/matches/${skit.matchId}`}
                    className="mt-3 inline-block text-xs text-amber-400"
                  >
                    View match →
                  </Link>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>
    </PageShell>
  );
}
