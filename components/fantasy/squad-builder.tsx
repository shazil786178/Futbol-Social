"use client";

import { useActionState, useMemo, useState } from "react";
import { saveFantasySquad, type FantasyActionState } from "@/app/fantasy/actions";
import { teamInitials } from "@/components/match/team-crest";
import { entityAccent } from "@/lib/entities/slug";
import {
  FANTASY_CLUBS,
  FANTASY_PLAYERS,
  FANTASY_RULES,
  POSITION_LABEL,
  type FantasyPlayer,
  type FantasyPosition,
} from "@/lib/fantasy/players";

const POSITIONS: FantasyPosition[] = ["GK", "DEF", "MID", "FWD"];
const BY_SLUG = new Map(FANTASY_PLAYERS.map((p) => [p.slug, p]));

function lastName(name: string) {
  const parts = name.split(" ");
  return parts.length > 1 ? parts.slice(1).join(" ") : name;
}

export function SquadBuilder({
  initialPicks = [],
  initialCaptain = null,
  initialName = "",
}: {
  initialPicks?: string[];
  initialCaptain?: string | null;
  initialName?: string;
}) {
  const [picks, setPicks] = useState<string[]>(initialPicks);
  const [captain, setCaptain] = useState<string | null>(initialCaptain);
  const [teamName, setTeamName] = useState(initialName);
  const [posFilter, setPosFilter] = useState<FantasyPosition | "ALL">("ALL");
  const [clubFilter, setClubFilter] = useState<string>("ALL");
  const [query, setQuery] = useState("");
  const [state, action, pending] = useActionState<FantasyActionState, FormData>(
    saveFantasySquad,
    {},
  );

  const chosen = picks.map((s) => BY_SLUG.get(s)).filter(Boolean) as FantasyPlayer[];
  const spent = chosen.reduce((sum, p) => sum + p.price, 0);
  const left = FANTASY_RULES.budget - spent;

  const countBy = (pos: FantasyPosition) =>
    chosen.filter((p) => p.position === pos).length;
  const clubCount = (club: string) => chosen.filter((p) => p.club === club).length;

  function blockReason(p: FantasyPlayer): string | null {
    if (picks.includes(p.slug)) return null;
    if (picks.length >= FANTASY_RULES.squadSize) return "XI full";
    if (countBy(p.position) >= FANTASY_RULES.positions[p.position].max)
      return `${p.position} full`;
    if (clubCount(p.club) >= FANTASY_RULES.maxPerClub) return "3 per club";
    if (p.price > left + 1e-9) return "Too pricey";
    // keep room for the minimums still missing
    const slotsAfter = FANTASY_RULES.squadSize - picks.length - 1;
    const stillNeeded = POSITIONS.reduce((n, pos) => {
      const have = countBy(pos) + (pos === p.position ? 1 : 0);
      return n + Math.max(0, FANTASY_RULES.positions[pos].min - have);
    }, 0);
    if (stillNeeded > slotsAfter) return "Need other positions";
    return null;
  }

  function toggle(p: FantasyPlayer) {
    if (picks.includes(p.slug)) {
      setPicks(picks.filter((s) => s !== p.slug));
      if (captain === p.slug) setCaptain(null);
      return;
    }
    if (blockReason(p)) return;
    setPicks([...picks, p.slug]);
    if (!captain) setCaptain(p.slug);
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FANTASY_PLAYERS.filter(
      (p) =>
        (posFilter === "ALL" || p.position === posFilter) &&
        (clubFilter === "ALL" || p.club === clubFilter) &&
        (!q || p.name.toLowerCase().includes(q) || p.club.toLowerCase().includes(q)),
    ).sort((a, b) => b.price - a.price);
  }, [posFilter, clubFilter, query]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      {/* Pitch preview */}
      <div className="lg:order-2">
        <div className="lg:sticky lg:top-24">
          <div className="mb-3 grid grid-cols-3 gap-2 text-center">
            <div className="fs-panel px-2 py-2.5">
              <p className="fs-score text-2xl">{picks.length}/11</p>
              <p className="text-[11px] text-[var(--beige-dim)]">Players</p>
            </div>
            <div className="fs-panel px-2 py-2.5">
              <p className={`fs-score text-2xl ${left < 0 ? "text-[var(--live)]" : "fs-gold"}`}>
                £{left.toFixed(1)}m
              </p>
              <p className="text-[11px] text-[var(--beige-dim)]">Left</p>
            </div>
            <div className="fs-panel px-2 py-2.5">
              <p className="fs-score truncate text-2xl">
                {captain ? lastName(BY_SLUG.get(captain)?.name ?? "") : "—"}
              </p>
              <p className="text-[11px] text-[var(--beige-dim)]">Captain</p>
            </div>
          </div>

          <div className="fs-fantasy-pitch space-y-5">
            {(["FWD", "MID", "DEF", "GK"] as FantasyPosition[]).map((pos) => {
              const row = chosen.filter((p) => p.position === pos);
              const empty = Math.max(0, FANTASY_RULES.positions[pos].min - row.length);
              return (
                <div key={pos} className="flex flex-wrap justify-center gap-1.5">
                  {row.map((p) => (
                    <button
                      key={p.slug}
                      type="button"
                      onClick={() => setCaptain(p.slug)}
                      className="fs-fantasy-slot"
                      title="Tap to make captain"
                    >
                      <span
                        className="fs-fantasy-shirt"
                        style={{ background: entityAccent(p.club) }}
                      >
                        {teamInitials(p.club)}
                      </span>
                      <span className="fs-fantasy-name">
                        {captain === p.slug ? "C · " : ""}
                        {lastName(p.name)}
                      </span>
                      <span className="fs-fantasy-pts">£{p.price}m</span>
                    </button>
                  ))}
                  {Array.from({ length: empty }).map((_, i) => (
                    <div key={`${pos}-empty-${i}`} className="fs-fantasy-slot opacity-50">
                      <span className="fs-fantasy-shirt border border-dashed border-white/40 bg-transparent">
                        +
                      </span>
                      <span className="fs-fantasy-name">{pos}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-center text-xs text-[var(--beige-dim)]">
            Tap a shirt to make them captain (double points).
          </p>

          <form action={action} className="mt-4 space-y-3">
            <input type="hidden" name="picks" value={JSON.stringify(picks)} />
            <input type="hidden" name="captain" value={captain ?? ""} />
            <input
              name="team_name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              maxLength={32}
              placeholder="Team name (e.g. Galácticos FC)"
              className="fs-field"
            />
            <button
              type="submit"
              disabled={pending || picks.length !== FANTASY_RULES.squadSize || !captain}
              className="fs-btn-primary w-full"
            >
              {pending ? "Saving…" : initialPicks.length ? "Save changes" : "Lock in my XI"}
            </button>
            {state.error ? (
              <p className="text-sm text-[var(--live)]">{state.error}</p>
            ) : null}
            {state.success ? (
              <p className="text-sm text-[var(--sky)]">{state.success}</p>
            ) : null}
          </form>
        </div>
      </div>

      {/* Player market */}
      <div className="lg:order-1">
        <div className="flex flex-wrap gap-2">
          {(["ALL", ...POSITIONS] as const).map((pos) => (
            <button
              key={pos}
              type="button"
              onClick={() => setPosFilter(pos)}
              className={`fs-filter ${posFilter === pos ? "fs-filter--active" : ""}`}
            >
              {pos === "ALL"
                ? "All"
                : `${POSITION_LABEL[pos]} ${countBy(pos)}/${FANTASY_RULES.positions[pos].max}`}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search players or clubs"
            className="fs-field"
          />
          <select
            value={clubFilter}
            onChange={(e) => setClubFilter(e.target.value)}
            className="fs-field max-w-[11rem]"
          >
            <option value="ALL">All clubs</option>
            {FANTASY_CLUBS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <ul className="mt-4 space-y-1.5">
          {visible.map((p) => {
            const selected = picks.includes(p.slug);
            const reason = blockReason(p);
            return (
              <li key={p.slug}>
                <button
                  type="button"
                  onClick={() => toggle(p)}
                  disabled={!selected && Boolean(reason)}
                  className={`flex w-full items-center gap-3 rounded-[10px] border px-3 py-2.5 text-left transition ${
                    selected
                      ? "border-[var(--sky)] bg-[var(--sky-glow)]"
                      : "border-[var(--line)] bg-[var(--ink-raised)] hover:border-[var(--line-strong)] disabled:opacity-40"
                  }`}
                >
                  <span
                    className="fs-crest"
                    style={{ background: entityAccent(p.club) }}
                  >
                    {teamInitials(p.club)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[var(--beige)]">
                      {p.name}
                    </span>
                    <span className="block truncate text-xs text-[var(--beige-dim)]">
                      {p.position} · {p.club}
                      {!selected && reason ? ` · ${reason}` : ""}
                    </span>
                  </span>
                  <span className="fs-score text-lg text-[var(--beige-muted)]">
                    £{p.price.toFixed(1)}
                  </span>
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-full text-sm font-bold ${
                      selected
                        ? "bg-[var(--sky)] text-[var(--paper-ink)]"
                        : "bg-[var(--ink-soft)] text-[var(--beige-muted)]"
                    }`}
                  >
                    {selected ? "✓" : "+"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
