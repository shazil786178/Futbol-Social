import Link from "next/link";
import { ThePitchGame } from "@/components/game/the-pitch";
import { PageShell } from "@/components/layout/page-shell";
import { BRAND } from "@/lib/brand";
import { loadPitchBoard } from "@/lib/games/the-pitch";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: `The Pitch — ${BRAND.name}`,
  description:
    "One ball. One street. The whole planet. You get one touch a day — the same ball everyone else is kicking.",
};

export const dynamic = "force-dynamic";

export default async function PitchPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const board = await loadPitchBoard(supabase, user?.id ?? null);

  return (
    <PageShell wide>
      <header className="fs-fade-up">
        <p className="fs-kicker !text-[var(--gold)]">The Pitch</p>
        <h1 className="fs-display mt-2 text-4xl sm:text-6xl">
          One ball.
          <br />
          The whole planet.
        </h1>
        <p className="mt-3 max-w-xl text-sm text-[var(--beige-muted)]">
          This is not a game you play against the computer. There is one football
          on Earth in this app. You get one touch a day. Overnight someone in
          another city will kick it. In the morning you open it to see if we scored.
        </p>
      </header>

      <div className="mt-6 fs-fade-up-delay">
        <ThePitchGame board={board} signedIn={Boolean(user)} />
      </div>

      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        <Link href="/clips" className="fs-panel px-5 py-4 transition hover:border-[var(--sky)]">
          <p className="fs-kicker">Then watch</p>
          <p className="fs-display mt-1 text-lg">Tonight&apos;s tape →</p>
        </Link>
        <Link href="/train" className="fs-panel px-5 py-4 transition hover:border-[var(--sky)]">
          <p className="fs-kicker">Then train</p>
          <p className="fs-display mt-1 text-lg">Get better this week →</p>
        </Link>
        <Link href="/pundit" className="fs-panel px-5 py-4 transition hover:border-[var(--sky)]">
          <p className="fs-kicker">Then talk</p>
          <p className="fs-display mt-1 text-lg">Ask the AI Pundit →</p>
        </Link>
      </div>
    </PageShell>
  );
}
