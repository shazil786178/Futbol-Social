"use client";

import { useEffect, useState } from "react";
import { LiveMatch } from "@/components/games/live-match";
import type { ChaosId } from "@/lib/games/arcade";
import {
  ZERO_FALLBACK,
  ZERO_KEY,
  grantXp,
  keeperBlurb,
  keeperForLevel,
  styleFor,
  type ZeroAttrs,
  type ZeroSave,
} from "@/lib/games/football-zero";
import { EMPTY_LIVE, type LiveEvent } from "@/lib/games/live";
import { loadSave, writeSave } from "@/lib/games/save";

type Mode = "keeper" | "dribble" | "goat";

const BOSSES: { chaos: ChaosId; line: string }[] = [
  { chaos: "bounce", line: "Boss: a hundred bodies. Jump the slides." },
  { chaos: "gravity", line: "Boss: the stadium is coming apart." },
  { chaos: "moving-goal", line: "Boss: the goals will not stay still." },
  { chaos: "giant-ball", line: "Boss: a giant ball eats the lane." },
];

export function FootballZero() {
  const [save, setSave] = useState<ZeroSave>(ZERO_FALLBACK);
  const [mode, setMode] = useState<Mode>("keeper");
  const [tries, setTries] = useState(3);
  const [flash, setFlash] = useState<string | null>(null);
  const [run, setRun] = useState(0);

  useEffect(() => {
    setSave(loadSave(ZERO_KEY, ZERO_FALLBACK));
  }, []);
  useEffect(() => {
    writeSave(ZERO_KEY, save);
  }, [save]);

  const level = save.keeperLevel;
  const kind = keeperForLevel(level);
  const mods = {
    ...EMPTY_LIVE,
    shot: save.attrs.shooting * 0.08 + (save.style === "cannon" ? 0.28 : 0),
    curl: save.attrs.control * 0.1 + (save.style === "curve" ? 0.4 : 0),
    pace: save.attrs.speed * 0.08 + (save.style === "speed" ? 0.22 : 0),
    magnet: save.attrs.dribbling * 0.06,
    grace: save.attrs.dribbling * 0.08 + (save.attrs.special >= 3 ? 0.45 : 0),
    sprint: save.attrs.speed >= 3 ? 1 : 0,
  };

  function onKeeper(event: LiveEvent) {
    if (event.type === "goal") {
      setSave((s) => {
        const next = grantXp({ ...s, coins: s.coins + 8 + level, keeperLevel: s.keeperLevel + 1 }, 14);
        return { ...next, style: styleFor(next.attrs) };
      });
      setTries(3);
      setFlash(`Level ${level} broken.`);
      setRun((n) => n + 1);
      return;
    }
    if (event.type === "save" || event.type === "tackle") {
      setTries((t) => {
        if (t <= 1) {
          setSave((s) => grantXp({ ...s, coins: s.coins + 1 }, 3));
          setFlash("The keeper held. Three more.");
          setRun((n) => n + 1);
          return 3;
        }
        return t - 1;
      });
    }
  }

  function onDribble(event: LiveEvent) {
    if (event.type === "clear") {
      setSave((s) => {
        const next = grantXp(
          { ...s, coins: s.coins + 6 + s.dribbleLevel, dribbleLevel: s.dribbleLevel + 1 },
          12,
        );
        return { ...next, style: styleFor(next.attrs) };
      });
      setFlash("Through.");
      setRun((n) => n + 1);
    }
    if (event.type === "tackle") {
      setFlash("Tackled. Run it again.");
      setRun((n) => n + 1);
    }
    if (event.type === "coin") {
      setSave((s) => ({ ...s, coins: s.coins + 1 }));
    }
  }

  function spend(key: keyof ZeroAttrs) {
    setSave((s) => {
      if (s.unspent <= 0) return s;
      const attrs = { ...s.attrs, [key]: s.attrs[key] + 1 };
      return { ...s, unspent: s.unspent - 1, attrs, style: styleFor(attrs) };
    });
  }

  const boss = save.dribbleLevel % 10 === 0 ? BOSSES[Math.max(0, Math.floor(save.dribbleLevel / 10) - 1) % 4] : null;

  return (
    <div className="fs-game">
      <header className="fs-game__head">
        <div>
          <p className="fs-kicker !text-[var(--gold)]">Football Zero</p>
          <h2 className="fs-display text-3xl">Become a legend.</h2>
        </div>
        <p className="fs-game__stats">
          {save.coins} coins · {save.xp} xp · {save.unspent} points
        </p>
      </header>

      <div className="fs-reel-tabs mt-2 inline-flex flex-wrap gap-1 rounded-full bg-[var(--ink-raised)] p-1">
        {(
          [
            ["keeper", "Break the keeper"],
            ["dribble", "Impossible dribble"],
            ["goat", "The GOAT"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${mode === id ? "bg-[var(--beige)] text-[var(--ink)]" : "text-[var(--beige-muted)]"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "keeper" ? (
        <div className="mt-4">
          <p className="text-sm text-[var(--beige-muted)]">
            Level {level}. {keeperBlurb(level)} {tries} chance{tries === 1 ? "" : "s"} left.
          </p>
          {flash ? <p className="fs-game__note">{flash}</p> : null}
          <LiveMatch
            active
            resetKey={`k-${level}-${run}`}
            role="attack"
            keeper={kind}
            skill={Math.min(0.9, 0.15 + level * 0.01)}
            defenders={level >= 15 ? 1 : 0}
            mods={mods}
            chaos={null}
            onEvent={onKeeper}
          />
        </div>
      ) : null}

      {mode === "dribble" ? (
        <div className="mt-4">
          <p className="text-sm text-[var(--beige-muted)]">
            Course {save.dribbleLevel}. {boss ? boss.line : "Dodge, jump the slide, carry it into the box."}
          </p>
          {flash ? <p className="fs-game__note">{flash}</p> : null}
          <LiveMatch
            active
            resetKey={`d-${save.dribbleLevel}-${run}`}
            role="carry"
            keeper="normal"
            skill={0.2 + save.dribbleLevel * 0.03}
            defenders={boss ? 5 : Math.min(4, 1 + Math.floor(save.dribbleLevel / 3))}
            mods={mods}
            chaos={boss ? boss.chaos : null}
            onEvent={onDribble}
          />
        </div>
      ) : null}

      {mode === "goat" ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Attr name="Speed" detail="You reach top speed, and sprint lasts." value={save.attrs.speed} onAdd={() => spend("speed")} disabled={save.unspent <= 0} />
          <Attr name="Shooting" detail="Strikes leave harder." value={save.attrs.shooting} onAdd={() => spend("shooting")} disabled={save.unspent <= 0} />
          <Attr name="Dribbling" detail="The ball sticks, and slides miss." value={save.attrs.dribbling} onAdd={() => spend("dribbling")} disabled={save.unspent <= 0} />
          <Attr name="Control" detail="Shots bend on purpose." value={save.attrs.control} onAdd={() => spend("control")} disabled={save.unspent <= 0} />
          <Attr name="Special" detail="At 3, the first tackle slides off you." value={save.attrs.special} onAdd={() => spend("special")} disabled={save.unspent <= 0} />
          <div className="fs-panel px-4 py-4">
            <p className="fs-kicker">Style</p>
            <p className="fs-display mt-2 text-2xl">
              {save.style === "speed" ? "Speed demon" : save.style === "curve" ? "Curve merchant" : save.style === "cannon" ? "Cannon" : "Nobody — yet"}
            </p>
            <p className="mt-1 text-sm text-[var(--beige-muted)]">
              Put 3 points into Speed, Control, or Shooting and the pitch starts treating you like that player.
              Goals and nutmegs also open skill moves on the pitch: you start with Power shot and La Croqueta.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Attr({
  name,
  detail,
  value,
  onAdd,
  disabled,
}: {
  name: string;
  detail: string;
  value: number;
  onAdd: () => void;
  disabled: boolean;
}) {
  return (
    <div className="fs-panel flex items-center justify-between gap-3 px-4 py-4">
      <div>
        <p className="fs-display text-xl">{name}</p>
        <p className="text-sm text-[var(--beige-muted)]">{detail}</p>
      </div>
      <button type="button" className="fs-chip fs-chip--mint" onClick={onAdd} disabled={disabled}>
        {value} +
      </button>
    </div>
  );
}
