import { ClipsReelWithStreak } from "@/components/clips/clips-reel-with-streak";
import { BRAND } from "@/lib/brand";
import { loadClipReel } from "@/lib/clips/load-reel";

export const metadata = {
  title: `Clips — ${BRAND.name}`,
  description: "Official match highlights — updated after every big game.",
};

export const dynamic = "force-dynamic";

export default async function ClipsPage() {
  const clips = await loadClipReel();

  return (
    <main className="fixed inset-0 z-40 bg-black lg:static lg:inset-auto lg:z-auto lg:min-h-[100dvh]">
      <div className="mx-auto h-full w-full lg:flex lg:min-h-[100dvh] lg:items-center lg:justify-center lg:bg-[var(--ink)] lg:py-8">
        <div className="relative h-full w-full overflow-hidden lg:h-[780px] lg:w-[390px] lg:rounded-[1.25rem] lg:shadow-[0_0_0_1px_rgba(239,230,216,0.14),0_40px_80px_rgba(0,0,0,0.55)]">
          <ClipsReelWithStreak clips={clips} />
        </div>
      </div>
    </main>
  );
}
