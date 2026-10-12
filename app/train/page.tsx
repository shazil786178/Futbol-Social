import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { TrainPlanForm } from "@/components/train/train-plan-form";
import { TrainVideoCard } from "@/components/train/video-card";
import { aiEnabled } from "@/lib/ai/client";
import { BRAND } from "@/lib/brand";
import { getIsPro } from "@/lib/pro/plan";
import { loadTrainVideos, SKILLS, videosFor, type SkillId } from "@/lib/train/catalog";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: `Train — ${BRAND.name}`,
  description: "Get better at football: wingers, ball mastery, skill moves, finishing and more.",
};

export const dynamic = "force-dynamic";

export default async function TrainPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = typeof params.skill === "string" ? params.skill : "all";
  const skill = (SKILLS.some((s) => s.id === raw) ? raw : "all") as SkillId;
  const current = SKILLS.find((s) => s.id === skill)!;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [videos, isPro] = await Promise.all([
    loadTrainVideos(),
    getIsPro(supabase, user?.id ?? null),
  ]);
  const list = videosFor(videos, skill);

  return (
    <PageShell wide>
      <header className="fs-fade-up">
        <p className="fs-kicker">Train</p>
        <h1 className="fs-display mt-2 text-4xl sm:text-5xl">Get better this week.</h1>
        <p className="mt-3 max-w-xl text-sm text-[var(--beige-muted)]">
          Sessions from the best coaches on YouTube, sorted by what you want to fix,
          plus a weekly plan built for your position.
        </p>
      </header>

      <nav className="fs-skill-rail mt-6 flex gap-2 overflow-x-auto pb-2 fs-fade-up-delay" aria-label="Skills">
        {SKILLS.map((s) => (
          <Link
            key={s.id}
            href={s.id === "all" ? "/train" : `/train?skill=${s.id}`}
            className={`fs-chip whitespace-nowrap ${s.id === skill ? "fs-chip--mint" : "fs-chip--ghost"}`}
          >
            {s.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="fs-fade-up-delay">
          <div className="fs-section-head">
            <div>
              <h2 className="fs-display text-2xl">{current.label}</h2>
              <p className="mt-1 text-sm text-[var(--beige-dim)]">{current.blurb}</p>
            </div>
            <span className="text-xs text-[var(--beige-dim)]">{list.length} sessions</span>
          </div>
          {list.length === 0 ? (
            <p className="text-sm text-[var(--beige-dim)]">Nothing tagged here yet — try Everything.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {list.slice(0, 24).map((v, i) => (
                <div key={v.videoId} className="fs-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
                  <TrainVideoCard
                    videoId={v.videoId}
                    title={v.title}
                    channel={v.channelTitle}
                    thumbnailUrl={v.thumbnailUrl}
                    minutes={Math.max(1, Math.round(v.durationSec / 60))}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4 fs-fade-up-delay-2">
          <TrainPlanForm isPro={isPro} aiLive={aiEnabled()} />
          <Link href="/clips/upload" className="fs-panel block px-5 py-4 transition hover:border-[var(--sky)]">
            <p className="fs-kicker">Landed it?</p>
            <p className="fs-display mt-1 text-lg">Post the clip →</p>
            <p className="mt-1 text-xs text-[var(--beige-dim)]">Friends see it first. The feed picks it up if people watch.</p>
          </Link>
          <Link href="/topbins" className="fs-panel block px-5 py-4 transition hover:border-[var(--sky)]">
            <p className="fs-kicker">Then test it</p>
            <p className="fs-display mt-1 text-lg">Today&apos;s free kick →</p>
          </Link>
        </aside>
      </div>
    </PageShell>
  );
}
