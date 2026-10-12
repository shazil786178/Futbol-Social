import Link from "next/link";
import { TopBinsGame } from "@/components/game/top-bins";
import { PageShell } from "@/components/layout/page-shell";
import { BRAND } from "@/lib/brand";
import { loadTopBinsBoard, resultEmoji } from "@/lib/games/top-bins";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: `Top Bins — ${BRAND.name}`,
  description:
    "The daily free kick. Same wall, same keeper, same wind for everyone on the planet. Five attempts.",
};

export const dynamic = "force-dynamic";

export default async function TopBinsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const board = await loadTopBinsBoard(supabase, user?.id ?? null);
  const k = board.kick;

  return (
    <PageShell wide>
      <header className="fs-fade-up">
        <p className="fs-kicker !text-[var(--gold)]">Top Bins · daily free kick · {board.dayKey}</p>
        <h1 className="fs-display mt-2 text-4xl sm:text-5xl">{k.title}</h1>
        <p className="mt-2 text-sm text-[var(--beige-muted)]">
          {k.stadium}. {k.distance} metres out, {k.wall.count}-man wall
          {k.wall.jumps ? " that jumps" : ""}, keeper leaning{" "}
          {k.keeper.bias < -0.15 ? "left" : k.keeper.bias > 0.15 ? "right" : "nowhere"}.
          Everyone on Earth gets this exact kick today.
        </p>
      </header>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="fs-fade-up-delay">
          <TopBinsGame kick={k} signedIn={Boolean(user)} alreadyPlayed={board.mine} />
        </div>

        <aside className="space-y-4 fs-fade-up-delay-2">
          <div className="fs-panel px-5 py-4">
            <div className="flex items-center justify-between">
              <p className="fs-kicker">Today&apos;s board</p>
              <span className="text-xs text-[var(--beige-dim)]">{board.players} played</span>
            </div>
            {board.top.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--beige-dim)]">
                Nobody has taken it yet. First on the board?
              </p>
            ) : (
              <ol className="mt-3 space-y-2">
                {board.top.map((r, i) => (
                  <li key={r.userId} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className={`fs-score w-6 text-right ${i === 0 ? "fs-gold" : "text-[var(--beige-dim)]"}`}>
                        {i + 1}
                      </span>
                      <Link href={`/u/${r.username}`} className="truncate hover:text-[var(--sky)]">
                        @{r.username}
                      </Link>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs tracking-wider">{r.attempts.map((a) => resultEmoji(a.result)).join("")}</span>
                      <span className="fs-score text-base">{r.score}</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="fs-panel px-5 py-4 text-sm text-[var(--beige-muted)]">
            <p className="fs-kicker">How scoring works</p>
            <ul className="mt-2 space-y-1.5">
              <li>🎯 Top bins — 120</li>
              <li>⚽ Corner — 80</li>
              <li>🥅 Goal — 45</li>
              <li>🧱 Post — 8</li>
              <li>+ pace bonus over 22 m/s</li>
              <li>× 1.25 for 2 in a row, × 1.5 for 3+</li>
            </ul>
          </div>

          <Link href="/call" className="fs-panel block px-5 py-4 transition hover:border-[var(--sky)]">
            <p className="fs-kicker">Next up</p>
            <p className="fs-display mt-1 text-lg">Make The Call →</p>
          </Link>
        </aside>
      </div>
    </PageShell>
  );
}
