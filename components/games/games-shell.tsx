"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FootballPets } from "@/components/games/football-pets";
import { FootballRogue } from "@/components/games/football-rogue";
import { FootballZero } from "@/components/games/football-zero";

const TABS = [
  { id: "rogue", label: "Rogue" },
  { id: "zero", label: "Zero" },
  { id: "pets", label: "Pets" },
] as const;

export type GameTab = (typeof TABS)[number]["id"];

export function GamesShell({ tab }: { tab: GameTab }) {
  const router = useRouter();
  const [current, setCurrent] = useState<GameTab>(tab);

  useEffect(() => {
    setCurrent(tab);
  }, [tab]);

  function open(id: GameTab) {
    setCurrent(id);
    router.replace(id === "rogue" ? "/games" : `/games?tab=${id}`, { scroll: false });
  }

  return (
    <div>
      <header className="fs-fade-up">
        <p className="fs-kicker !text-[var(--gold)]">Games</p>
        <h1 className="fs-display mt-2 text-4xl sm:text-6xl">One more match.</h1>
        <p className="mt-3 max-w-xl text-sm text-[var(--beige-muted)]">
          Short matches you can feel. Rogue is the tournament. Zero is the career. Pets are the monsters you raise by how you actually play. Nothing here is sold as a way to win.
        </p>
      </header>

      <div className="fs-reel-tabs mt-6 inline-flex flex-wrap gap-1 rounded-full bg-[var(--ink-raised)] p-1 ring-1 ring-[var(--line)]" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={current === t.id}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${current === t.id ? "bg-[var(--beige)] text-[var(--ink)]" : "text-[var(--beige-muted)]"}`}
            onClick={() => open(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {current === "zero" ? <FootballZero /> : current === "pets" ? <FootballPets /> : <FootballRogue />}
      </div>

      <p className="mt-8 text-sm text-[var(--beige-dim)]">
        Also on the street:{" "}
        <Link href="/pitch" className="text-[var(--sky)]">
          The Pitch
        </Link>
        {" · "}
        <Link href="/topbins" className="text-[var(--sky)]">
          Top Bins
        </Link>
      </p>
    </div>
  );
}
