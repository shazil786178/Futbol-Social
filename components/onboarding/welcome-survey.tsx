"use client";

import { useActionState, useState } from "react";
import { completeOnboarding, type WelcomeState } from "@/app/welcome/actions";
import { TeamCrest } from "@/components/match/team-crest";

type Option = { value: string; label: string; hint?: string };

const LEAGUES: Option[] = [
  { value: "epl", label: "Premier League" },
  { value: "laliga", label: "La Liga" },
  { value: "bundesliga", label: "Bundesliga" },
  { value: "ucl", label: "Champions League" },
  { value: "mls", label: "MLS" },
  { value: "all", label: "A bit of everything" },
];

const WATCH: Option[] = [
  { value: "stadium", label: "In the stands", hint: "Season ticket energy" },
  { value: "tv", label: "On the TV", hint: "Sofa, snacks, shouting" },
  { value: "phone", label: "On my phone", hint: "Wherever I am" },
  { value: "highlights", label: "Highlights after", hint: "No time for 90 minutes" },
];

const SINCE: Option[] = [
  { value: "born", label: "Born into it" },
  { value: "kid", label: "Since I was a kid" },
  { value: "years", label: "A few years" },
  { value: "new", label: "This season, honestly" },
];

function Tiles({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: Option[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => (
        <label key={o.value} className="fs-option relative">
          <input
            type="radio"
            name={`${name}-pick`}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
          <span>
            <span className="block">{o.label}</span>
            {o.hint ? (
              <span className="block text-xs font-normal text-[var(--beige-dim)]">
                {o.hint}
              </span>
            ) : null}
          </span>
        </label>
      ))}
    </div>
  );
}

export function WelcomeSurvey({
  username,
  popularTeams,
  allTeams,
  popularPlayers,
  initialTeam,
}: {
  username: string;
  popularTeams: string[];
  allTeams: string[];
  popularPlayers: { name: string; team: string }[];
  initialTeam: string | null;
}) {
  const [step, setStep] = useState(0);
  const [team, setTeam] = useState(initialTeam ?? "");
  const [player, setPlayer] = useState("");
  const [league, setLeague] = useState("");
  const [watch, setWatch] = useState("");
  const [since, setSince] = useState("");
  const [state, action, pending] = useActionState<WelcomeState, FormData>(
    completeOnboarding,
    {},
  );

  const steps = [
    {
      title: "Who do you support?",
      sub: "Your club runs your start screen, Rival Mode and alerts.",
      ready: team.trim().length > 1,
      body: (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {popularTeams.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTeam(t)}
                className={`fs-option ${team === t ? "!border-[var(--sky)] !bg-[var(--sky-glow)] !text-[var(--beige)]" : ""}`}
              >
                <TeamCrest name={t} />
                <span className="truncate">{t}</span>
              </button>
            ))}
          </div>
          <input
            list="welcome-teams"
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            placeholder="Or search any club…"
            className="fs-field mt-3"
          />
          <datalist id="welcome-teams">
            {allTeams.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </>
      ),
    },
    {
      title: "Favourite player?",
      sub: "We'll follow them for you and surface their moments.",
      ready: true,
      body: (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {popularPlayers.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => setPlayer(p.name)}
                className={`fs-option ${player === p.name ? "!border-[var(--sky)] !bg-[var(--sky-glow)] !text-[var(--beige)]" : ""}`}
              >
                <span className="min-w-0">
                  <span className="block truncate">{p.name}</span>
                  <span className="block truncate text-xs font-normal text-[var(--beige-dim)]">
                    {p.team}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <input
            value={player}
            onChange={(e) => setPlayer(e.target.value)}
            placeholder="Or type anyone…"
            className="fs-field mt-3"
          />
        </>
      ),
    },
    {
      title: "Which competition do you live for?",
      sub: "We'll put it first on your board.",
      ready: Boolean(league),
      body: <Tiles name="league" options={LEAGUES} value={league} onChange={setLeague} />,
    },
    {
      title: "How do you usually watch?",
      sub: "Helps us decide between live rooms and highlight reels.",
      ready: Boolean(watch),
      body: <Tiles name="watch" options={WATCH} value={watch} onChange={setWatch} />,
    },
    {
      title: "How long have you been a fan?",
      sub: "No wrong answers. Well, maybe one.",
      ready: Boolean(since),
      body: <Tiles name="since" options={SINCE} value={since} onChange={setSince} />,
    },
  ];

  const current = steps[step];
  const last = step === steps.length - 1;

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="flex items-center justify-between text-xs text-[var(--beige-dim)]">
        <span>
          Welcome, <span className="text-[var(--beige)]">@{username}</span>
        </span>
        <span>
          {step + 1} / {steps.length}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--ink-soft)]">
        <div
          className="h-full rounded-full bg-[var(--sky)] transition-all duration-500"
          style={{ width: `${((step + 1) / steps.length) * 100}%` }}
        />
      </div>

      <div key={step} className="fs-fade-up mt-8">
        <h1 className="fs-display text-3xl sm:text-4xl">{current.title}</h1>
        <p className="mt-2 text-sm text-[var(--beige-muted)]">{current.sub}</p>
        <div className="mt-6">{current.body}</div>
      </div>

      <form action={action} className="mt-8 flex items-center justify-between gap-3">
        <input type="hidden" name="team" value={team} />
        <input type="hidden" name="player" value={player} />
        <input type="hidden" name="league" value={league} />
        <input type="hidden" name="watch" value={watch} />
        <input type="hidden" name="since" value={since} />

        {step > 0 ? (
          <button type="button" onClick={() => setStep(step - 1)} className="fs-btn-ghost">
            Back
          </button>
        ) : (
          <button type="submit" name="skip" value="1" className="text-sm text-[var(--beige-dim)] hover:text-[var(--beige)]">
            Skip for now
          </button>
        )}

        {last ? (
          <button type="submit" disabled={pending || !team} className="fs-btn-primary">
            {pending ? "Setting up…" : "Take me to my board"}
          </button>
        ) : (
          <button
            type="button"
            disabled={!current.ready}
            onClick={() => setStep(step + 1)}
            className="fs-btn-primary"
          >
            {step === 1 && !player ? "Skip" : "Next"}
          </button>
        )}
      </form>

      {state.error ? (
        <p className="mt-3 text-sm text-[var(--live)]">{state.error}</p>
      ) : null}
    </div>
  );
}
