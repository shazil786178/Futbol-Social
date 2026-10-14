import { GamesShell, type GameTab } from "@/components/games/games-shell";
import { PageShell } from "@/components/layout/page-shell";
import { BRAND } from "@/lib/brand";

export const metadata = {
  title: `Games — ${BRAND.name}`,
  description: "Football Rogue, Football Zero, and Football Pets. Short matches. One more.",
};

export const dynamic = "force-dynamic";

function parseTab(raw: string | string[] | undefined): GameTab {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "zero" || v === "pets") return v;
  return "rogue";
}

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <PageShell wide>
      <GamesShell tab={parseTab(params.tab)} />
    </PageShell>
  );
}
