import { ClipsReelWithStreak } from "@/components/clips/clips-reel-with-streak";
import { BRAND } from "@/lib/brand";
import type { ReelTab } from "@/lib/clips/build-reel";
import { loadClipReelFor } from "@/lib/clips/load-reel";

export const metadata = {
  title: `Clips — ${BRAND.name}`,
  description:
    "For You, Following and Friends — official highlights and fan clips, ranked for you.",
};

export const dynamic = "force-dynamic";

function parseTab(raw: string | string[] | undefined): ReelTab {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v === "following" || v === "friends" ? v : "fyp";
}

export default async function ClipsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tab = parseTab(params.tab);
  const startId = typeof params.start === "string" ? params.start : null;
  const reel = await loadClipReelFor(tab);

  return (
    <main className="fixed inset-0 z-40 bg-black lg:static lg:inset-auto lg:z-auto lg:min-h-[100dvh]">
      <div className="mx-auto h-full w-full lg:flex lg:min-h-[100dvh] lg:items-center lg:justify-center lg:bg-[var(--ink)] lg:py-8">
        <div className="relative h-full w-full overflow-hidden lg:h-[780px] lg:w-[390px] lg:rounded-[1.25rem] lg:shadow-[0_0_0_1px_rgba(239,230,216,0.14),0_40px_80px_rgba(0,0,0,0.55)]">
          <ClipsReelWithStreak
            clips={reel.clips}
            tab={reel.tab}
            counts={reel.counts}
            signedIn={Boolean(reel.viewer.userId)}
            startId={startId}
          />
        </div>
      </div>
    </main>
  );
}
