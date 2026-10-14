"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LiveMatch } from "@/components/games/live-match";
import { CHAOS, type ChaosId } from "@/lib/games/arcade";
import { EMPTY_LIVE, type LiveEvent, type LiveMods } from "@/lib/games/live";
import { loadSave, writeSave } from "@/lib/games/save";
import { submitArcadeBest } from "@/app/games/actions";

type Upgrade = {
  id: string;
  name: string;
  blurb: string;
  apply: (m: LiveMods) => LiveMods;
  chaos?: number;
};

const UPGRADES: Upgrade[] = [
  { id: "flame", name: "Flaming Boots", blurb: "Shots leave faster. Keepers are late.", apply: (m) => ({ ...m, shot: m.shot + 0.4 }) },
  { id: "banana", name: "Banana Ball", blurb: "Everything you hit hooks.", apply: (m) => ({ ...m, curl: m.curl + 0.85 }) },
  { id: "sprint", name: "Lightning Sprint", blurb: "Hold sprint and you leave them.", apply: (m) => ({ ...m, sprint: m.sprint + 1, pace: m.pace + 0.15 }) },
  { id: "split", name: "Three Balls", blurb: "One of them only has to go in.", apply: (m) => ({ ...m, split: true }) },
  { id: "giant", name: "Wrecking Ball", blurb: "The ball gets rude.", apply: (m) => ({ ...m, giant: true }) },
  { id: "magnet", name: "Glue Touch", blurb: "The ball stays on your feet.", apply: (m) => ({ ...m, magnet: m.magnet + 0.5 }) },
  { id: "under", name: "Ghost Touch", blurb: "Slides miss. Soft shots sneak under.", apply: (m) => ({ ...m, grace: m.grace + 0.75 }) },
  { id: "shock", name: "Shockwave", blurb: "Goals fill Chaos twice as fast.", apply: (m) => m, chaos: 2 },
];

type Character = { id: string; name: string; cost: number; mods: Partial<LiveMods> };

const CAST: Character[] = [
  { id: "street", name: "Street", cost: 0, mods: {} },
  { id: "trickster", name: "Trickster", cost: 60, mods: { curl: 0.45, magnet: 0.25 } },
  { id: "cannon", name: "Cannon", cost: 60, mods: { shot: 0.35 } },
];

type Meta = { coins: number; xp: number; best: number; owned: string[]; runs: number };
const META_KEY = "fs-rogue-meta";
const META_FALLBACK: Meta = { coins: 0, xp: 0, best: 0, owned: ["street"], runs: 0 };

const TARGETS = [1, 2, 2, 3, 4];

function pickThree(owned: string[], seed: number) {
  const pool = UPGRADES.filter((u) => !owned.includes(u.id));
  const out: Upgrade[] = [];
  let s = seed || 1;
  const bag = [...pool];
  while (out.length < 3 && bag.length) {
    s = (s * 16807) % 2147483647;
    const i = s % bag.length;
    out.push(bag.splice(i, 1)[0]!);
  }
  return out;
}

function modsFrom(ids: string[], character: Character): LiveMods {
  let mods: LiveMods = { ...EMPTY_LIVE, ...character.mods };
  for (const id of ids) {
    const u = UPGRADES.find((x) => x.id === id);
    if (u) mods = u.apply(mods);
  }
  return mods;
}

export function FootballRogue() {
  const [meta, setMeta] = useState<Meta>(META_FALLBACK);
  const [ready, setReady] = useState(false);
  const [character, setCharacter] = useState("street");
  const [phase, setPhase] = useState<"lobby" | "play" | "draft" | "dead" | "champ">("lobby");
  const [match, setMatch] = useState(0);
  const [goals, setGoals] = useState(0);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(40);
  const [ownedUp, setOwnedUp] = useState<string[]>([]);
  const [offer, setOffer] = useState<Upgrade[]>([]);
  const [chaos, setChaos] = useState(0);
  const [chaosLeft, setChaosLeft] = useState(0);
  const [chaosId, setChaosId] = useState<ChaosId | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const bag = useRef({ goals: 0, score: 0, match: 0, owned: [] as string[], ended: false, lives: 3 });

  useEffect(() => {
    setMeta(loadSave(META_KEY, META_FALLBACK));
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) writeSave(META_KEY, meta);
  }, [meta, ready]);

  useEffect(() => {
    if (phase !== "play") return;
    const id = window.setInterval(() => {
      setLeft((s) => (s <= 1 ? 0 : s - 1));
      setChaosLeft((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, match]);

  useEffect(() => {
    if (phase !== "play" || left !== 0) return;
    const need = TARGETS[bag.current.match] ?? 4;
    finishMatch(bag.current.goals >= need);
    // finishMatch reads the bag ref and only banks once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, left]);

  useEffect(() => {
    if (chaosLeft === 0 && chaosId) setChaosId(null);
  }, [chaosLeft, chaosId]);

  const hero = CAST.find((c) => c.id === character) ?? CAST[0]!;
  const mods = useMemo(() => modsFrom(ownedUp, hero), [ownedUp, hero]);
  const chaosBoost = ownedUp.includes("shock") ? 2 : 1;
  const target = TARGETS[match] ?? 4;

  function start() {
    bag.current = { goals: 0, score: 0, match: 0, owned: [], ended: false, lives: 3 };
    setPhase("play");
    setMatch(0);
    setGoals(0);
    setScore(0);
    setLeft(40);
    setOwnedUp([]);
    setChaos(0);
    setChaosLeft(0);
    setChaosId(null);
    setNote(null);
  }

  function finishMatch(won: boolean) {
    if (bag.current.ended) return;
    bag.current.ended = true;
    if (!won) {
      bank(false);
      setPhase("dead");
      return;
    }
    if (bag.current.match >= 4) {
      bank(true);
      setPhase("champ");
      return;
    }
    setOffer(pickThree(bag.current.owned, bag.current.score + bag.current.match * 17 + bag.current.goals));
    setPhase("draft");
  }

  function bank(champ: boolean) {
    const coins = score * 6 + (champ ? 50 : 8);
    const xp = score * 4 + (champ ? 30 : 0);
    setMeta((m) => ({
      ...m,
      coins: m.coins + coins,
      xp: m.xp + xp,
      best: Math.max(m.best, score),
      runs: m.runs + 1,
    }));
    void submitArcadeBest("rogue", score);
  }

  function take(u: Upgrade) {
    const owned = [...bag.current.owned, u.id];
    bag.current = { ...bag.current, owned, goals: 0, match: bag.current.match + 1, ended: false, lives: 3 };
    setOwnedUp(owned);
    setMatch(bag.current.match);
    setGoals(0);
    setLeft(40);
    setPhase("play");
  }

  function onEvent(event: LiveEvent) {
    if (bag.current.ended) return;
    if (event.type === "goal") {
      bag.current.goals += 1;
      bag.current.score += (chaosLeft > 0 ? 2 : 1) + (event.dribbled ? 1 : 0);
      setGoals(bag.current.goals);
      setScore(bag.current.score);
      setChaos((c) => Math.min(100, c + 22 * chaosBoost));
      if (bag.current.goals >= (TARGETS[bag.current.match] ?? 4)) finishMatch(true);
      return;
    }
    if (event.type === "nutmeg") setChaos((c) => Math.min(100, c + 4));
    if (event.type === "tackle") {
      bag.current.lives -= 1;
      setNote(bag.current.lives > 0 ? `${bag.current.lives} tackles left.` : "They got the ball off you.");
      if (bag.current.lives <= 0) finishMatch(false);
    }
  }

  function ignite() {
    if (chaos < 100 || chaosLeft > 0) return;
    const pick = CHAOS[Math.floor(Math.random() * CHAOS.length)]!;
    setChaosId(pick.id);
    setChaos(0);
    setChaosLeft(10);
    setNote(`${pick.label}. ${pick.blurb}`);
  }

  function buy(c: Character) {
    if (meta.owned.includes(c.id) || meta.coins < c.cost) return;
    setMeta((m) => ({ ...m, coins: m.coins - c.cost, owned: [...m.owned, c.id] }));
    setCharacter(c.id);
  }

  return (
    <div className="fs-game">
      <header className="fs-game__head">
        <div>
          <p className="fs-kicker !text-[var(--gold)]">Football Rogue</p>
          <h2 className="fs-display text-3xl">One more match.</h2>
        </div>
        <p className="fs-game__stats">
          {meta.coins} coins · {meta.xp} xp · best {meta.best}
        </p>
      </header>

      {phase === "lobby" ? (
        <div className="fs-game__lobby">
          <p className="text-sm text-[var(--beige-muted)]">
            Five matches. Run the ball, beat the body, finish. After every win you pick one upgrade.
            Lose the run, keep the coins.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {CAST.map((c) => {
              const owned = meta.owned.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`fs-chip ${character === c.id ? "fs-chip--mint" : "fs-chip--ghost"}`}
                  onClick={() => (owned ? setCharacter(c.id) : buy(c))}
                >
                  {c.name}
                  {owned ? "" : ` · ${c.cost}`}
                </button>
              );
            })}
          </div>
          <button type="button" className="fs-btn-primary mt-5" onClick={start}>
            Enter the tournament
          </button>
        </div>
      ) : null}

      {phase === "play" ? (
        <div>
          <p className="fs-game__bar">
            Match {match + 1}/5 · {goals}/{target} goals · {left}s · {bag.current.lives} lives · score {score}
          </p>
          <div className="fs-chaos">
            <div className="fs-chaos__meter">
              <span style={{ width: `${chaos}%` }} />
            </div>
            <button type="button" className="fs-chaos__btn" disabled={chaos < 100 || chaosLeft > 0} onClick={ignite}>
              {chaosLeft > 0 ? `Chaos ${chaosLeft}` : "Chaos"}
            </button>
          </div>
          {note ? <p className="fs-game__note">{note}</p> : null}
          <LiveMatch
            active
            resetKey={`${match}-${ownedUp.join("-")}`}
            role="attack"
            keeper={match >= 4 ? "giant" : match >= 3 ? "arms" : match >= 2 ? "teleport" : match >= 1 ? "gravity" : "normal"}
            skill={0.2 + match * 0.12}
            defenders={Math.min(3, match)}
            mods={mods}
            chaos={chaosLeft > 0 ? chaosId : null}
            onEvent={onEvent}
          />
        </div>
      ) : null}

      {phase === "draft" ? (
        <div className="fs-game__draft">
          <p className="fs-kicker">You won the match</p>
          <h3 className="fs-display mt-2 text-2xl">Pick one. It sticks for the run.</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {offer.map((u) => (
              <button key={u.id} type="button" className="fs-upgrade" onClick={() => take(u)}>
                <span className="fs-display text-lg">{u.name}</span>
                <span className="mt-1 block text-sm text-[var(--beige-muted)]">{u.blurb}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {phase === "dead" || phase === "champ" ? (
        <div className="fs-game__lobby">
          <p className="fs-kicker">{phase === "champ" ? "Tournament won" : "Run over"}</p>
          <h3 className="fs-display mt-2 text-4xl">{score} goals</h3>
          <p className="mt-2 text-sm text-[var(--beige-muted)]">
            {phase === "champ"
              ? "Five matches. The coins are yours. The next run will not look like this one."
              : "The keeper won this one. Coins still landed. The build is gone — the next one starts clean."}
          </p>
          <button type="button" className="fs-btn-primary mt-5" onClick={start}>
            One more match
          </button>
        </div>
      ) : null}
    </div>
  );
}
