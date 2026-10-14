"use client";

import { useEffect, useState } from "react";
import { LiveMatch } from "@/components/games/live-match";
import { EMPTY_LIVE, type LiveEvent } from "@/lib/games/live";
import {
  PETS_KEY,
  SPECIES,
  freshPets,
  petName,
  rivalScore,
  stageOf,
  type Pet,
  type PetsSave,
  type SpeciesId,
} from "@/lib/games/pets";
import { loadSave, writeSave } from "@/lib/games/save";

const ORDER: SpeciesId[] = ["kicklet", "glovo", "nutter", "thunder", "bounce"];

export function FootballPets() {
  const [save, setSave] = useState<PetsSave>(freshPets());
  const [shots, setShots] = useState(0);
  const [gloves, setGloves] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const day = new Date().toISOString().slice(0, 10);
  const rival = rivalScore(day);
  const todayGoals = save.dayKey === day ? save.dayGoals : 0;

  useEffect(() => {
    const loaded = loadSave(PETS_KEY, freshPets());
    if (!loaded.roster?.length) {
      setSave(freshPets());
      return;
    }
    setSave(loaded);
  }, []);
  useEffect(() => {
    writeSave(PETS_KEY, save);
  }, [save]);

  const active = save.roster.find((p) => p.id === save.activeId) ?? save.roster[0]!;

  function train(event: LiveEvent) {
    if (event.type !== "goal" && event.type !== "save" && event.type !== "nutmeg" && event.type !== "concede") return;
    const goal = event.type === "goal";
    const save = event.type === "save";
    const nutmeg = event.type === "nutmeg";
    setShots((n) => n + (goal || save ? 1 : 0));
    setSave((s) => {
      const roster = s.roster.map((p) => {
        if (p.id !== s.activeId) return p;
        return {
          ...p,
          xp: p.xp + (goal ? 8 : save ? 6 : nutmeg ? 2 : 1),
          longShots: p.longShots + (goal && event.type === "goal" && event.long ? 1 : 0),
          dribbles: p.dribbles + ((goal && event.type === "goal" && event.dribbled) || nutmeg ? 1 : 0),
          saves: p.saves + (save ? 1 : 0),
        };
      });
      const sameDay = s.dayKey === day;
      return {
        ...s,
        coins: s.coins + (goal ? 4 : 1),
        dayKey: day,
        dayGoals: (sameDay ? s.dayGoals : 0) + (goal ? 1 : 0),
        roster,
      };
    });
  }

  function hatch() {
    const missing = ORDER.filter((id) => !save.roster.some((p) => p.species === id));
    if (!missing.length || save.coins < 40) return;
    const species = missing[Math.floor(Math.random() * missing.length)]!;
    const pet: Pet = {
      id: `pet-${species}-${Date.now()}`,
      species,
      xp: 0,
      longShots: 0,
      dribbles: 0,
      saves: 0,
      team: save.roster.length,
    };
    setSave((s) => ({ ...s, coins: s.coins - 40, roster: [...s.roster, pet], activeId: pet.id }));
  }

  function beatRival() {
    if (todayGoals < rival || save.bestRival >= rival) return;
    setSave((s) => ({ ...s, bestRival: rival, tickets: s.tickets + 1, coins: s.coins + 15 }));
    setNote("Ghost beaten. A ticket landed — the next hatch is watching.");
  }

  return (
    <div className="fs-game">
      <header className="fs-game__head">
        <div>
          <p className="fs-kicker !text-[var(--gold)]">Football Pets</p>
          <h2 className="fs-display text-3xl">{petName(active)}</h2>
        </div>
        <div className="fs-game__stats">
          <span>{save.coins} coins</span>
          <span>stage {stageOf(active) + 1}/3</span>
          <span>{shots}/5 drills</span>
        </div>
      </header>
      <p className="text-sm text-[var(--beige-muted)]">
        Train them in a real drill. Finish from your own half and they become a striker. Nutmeg someone and they become a trickster. Put the gloves on and the saves change them again.
      </p>

      <div className="fs-pets mt-4">
        {save.roster.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`fs-pet ${p.id === active.id ? "is-on" : ""}`}
            onClick={() => setSave((s) => ({ ...s, activeId: p.id }))}
          >
            <Creature pet={p} />
            <span className="fs-display mt-2 block text-sm">{petName(p)}</span>
            <span className="text-[11px] text-[var(--beige-dim)]">{p.xp} xp</span>
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="fs-chip fs-chip--ghost" onClick={hatch} disabled={save.coins < 40}>
          Hatch · 40
        </button>
        <button type="button" className={`fs-chip ${gloves ? "fs-chip--mint" : "fs-chip--ghost"}`} onClick={() => setGloves((g) => !g)}>
          {gloves ? "Gloves on" : "Gloves"}
        </button>
        <button type="button" className="fs-chip fs-chip--mint" onClick={beatRival} disabled={todayGoals < rival || save.bestRival >= rival}>
          Ghost {todayGoals}/{rival}
        </button>
      </div>
      {note ? <p className="fs-game__note">{note}</p> : null}

      <LiveMatch
        active
        resetKey={`${active.id}-${gloves ? "g" : "a"}`}
        role={gloves ? "keeper" : "attack"}
        keeper={stageOf(active) === 2 ? "arms" : stageOf(active) === 1 ? "teleport" : "normal"}
        skill={0.25 + stageOf(active) * 0.12}
        defenders={gloves ? 0 : 1}
        mods={{ ...EMPTY_LIVE, shot: stageOf(active) * 0.15, pace: stageOf(active) * 0.08 }}
        chaos={null}
        color={SPECIES[active.species].tint}
        onEvent={train}
      />
    </div>
  );
}

function Creature({ pet }: { pet: Pet }) {
  const tint = SPECIES[pet.species].tint;
  const stage = stageOf(pet);
  const r = 18 + stage * 8;
  return (
    <svg viewBox="0 0 80 64" className="mx-auto h-16 w-20" aria-hidden>
      <ellipse cx="40" cy="40" rx={r + 6} ry={r * 0.72} fill={tint} opacity="0.9" />
      <circle cx={30} cy={34} r={3 + stage} fill="#0a0f1a" />
      <circle cx={50} cy={34} r={3 + stage} fill="#0a0f1a" />
      {stage > 0 ? <path d="M28 48 Q40 56 52 48" fill="none" stroke="#0a0f1a" strokeWidth="2" /> : null}
      {stage > 1 ? <polygon points="40,8 46,22 34,22" fill={tint} /> : null}
    </svg>
  );
}
