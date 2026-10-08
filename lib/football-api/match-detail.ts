import type { CompetitionId } from "@/lib/brand";
import { fetchEspnRows, findSameFixture } from "./live-scores";

const BASE_URL = "https://api.football-data.org/v4";
const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";

const ESPN_SLUG: Partial<Record<CompetitionId, string>> = {
  mls: "usa.1",
  friendlies: "fifa.friendly",
  epl: "eng.1",
  laliga: "esp.1",
  bundesliga: "ger.1",
  ucl: "uefa.champions",
};

export type MatchEvent = {
  id: string;
  type: "goal" | "own_goal" | "penalty" | "penalty_miss" | "yellow" | "red" | "subst";
  minute: number | null;
  teamSide: "home" | "away" | null;
  playerName: string | null;
  assistName: string | null;
  detail: string | null;
};

export type LineupPlayer = {
  name: string;
  number: number | null;
  position: string | null;
  starter: boolean;
};

export type MatchLineup = {
  side: "home" | "away";
  teamName: string;
  formation: string | null;
  starters: LineupPlayer[];
  bench: LineupPlayer[];
};

export type MatchGameData = {
  events: MatchEvent[];
  lineups: MatchLineup[];
  minute: number | null;
  source: "football-data" | "espn" | "none";
};

type FdPlayer = { name?: string; position?: string; shirtNumber?: number };
type FdTeamBlock = {
  name?: string;
  formation?: string | null;
  lineup?: FdPlayer[];
  bench?: FdPlayer[];
};

type FdDetail = {
  minute?: number | null;
  homeTeam?: FdTeamBlock;
  awayTeam?: FdTeamBlock;
  goals?: {
    minute?: number;
    injuryTime?: number | null;
    type?: string;
    team?: { id?: number; name?: string };
    scorer?: { name?: string };
    assist?: { name?: string } | null;
  }[];
  bookings?: {
    minute?: number;
    card?: string;
    team?: { name?: string };
    player?: { name?: string };
  }[];
  substitutions?: {
    minute?: number;
    team?: { name?: string };
    playerOut?: { name?: string };
    playerIn?: { name?: string };
  }[];
};

function mapFdGoalType(type?: string): MatchEvent["type"] {
  switch (type) {
    case "OWN":
      return "own_goal";
    case "PENALTY":
      return "penalty";
    default:
      return "goal";
  }
}

function sideFromTeam(
  teamName: string | undefined,
  home: string,
  away: string,
): "home" | "away" | null {
  if (!teamName) return null;
  const t = teamName.toLowerCase();
  if (home.toLowerCase().includes(t) || t.includes(home.toLowerCase())) {
    return "home";
  }
  if (away.toLowerCase().includes(t) || t.includes(away.toLowerCase())) {
    return "away";
  }
  return null;
}

function mapFdLineup(
  side: "home" | "away",
  block: FdTeamBlock | undefined,
): MatchLineup | null {
  if (!block?.name) return null;
  const starters = (block.lineup ?? []).map((p) => ({
    name: p.name ?? "Unknown",
    number: p.shirtNumber ?? null,
    position: p.position ?? null,
    starter: true,
  }));
  const bench = (block.bench ?? []).map((p) => ({
    name: p.name ?? "Unknown",
    number: p.shirtNumber ?? null,
    position: p.position ?? null,
    starter: false,
  }));
  if (starters.length === 0 && bench.length === 0) return null;
  return {
    side,
    teamName: block.name,
    formation: block.formation ?? null,
    starters,
    bench,
  };
}

async function fetchFootballDataDetail(
  externalId: string,
  homeTeam: string,
  awayTeam: string,
): Promise<MatchGameData | null> {
  const token = process.env.FOOTBALL_DATA_API_KEY;
  if (!token) return null;

  const res = await fetch(`${BASE_URL}/matches/${externalId}`, {
    headers: { "X-Auth-Token": token },
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;

  const match = (await res.json()) as FdDetail;
  const events: MatchEvent[] = [];

  for (const g of match.goals ?? []) {
    const minute =
      g.minute != null
        ? g.minute + (g.injuryTime ? g.injuryTime : 0)
        : null;
    events.push({
      id: `fd-goal-${g.minute}-${g.scorer?.name ?? "x"}`,
      type: mapFdGoalType(g.type),
      minute,
      teamSide: sideFromTeam(g.team?.name, homeTeam, awayTeam),
      playerName: g.scorer?.name ?? null,
      assistName: g.assist?.name ?? null,
      detail: g.type ?? "GOAL",
    });
  }

  for (const b of match.bookings ?? []) {
    const isRed = b.card === "RED" || b.card === "YELLOW_RED";
    events.push({
      id: `fd-card-${b.minute}-${b.player?.name ?? "x"}`,
      type: isRed ? "red" : "yellow",
      minute: b.minute ?? null,
      teamSide: sideFromTeam(b.team?.name, homeTeam, awayTeam),
      playerName: b.player?.name ?? null,
      assistName: null,
      detail: b.card ?? null,
    });
  }

  for (const s of match.substitutions ?? []) {
    events.push({
      id: `fd-sub-${s.minute}-${s.playerIn?.name ?? "x"}`,
      type: "subst",
      minute: s.minute ?? null,
      teamSide: sideFromTeam(s.team?.name, homeTeam, awayTeam),
      playerName: s.playerIn?.name ?? null,
      assistName: s.playerOut?.name ?? null,
      detail: "Substitution",
    });
  }

  events.sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));

  const lineups = [
    mapFdLineup("home", match.homeTeam),
    mapFdLineup("away", match.awayTeam),
  ].filter((x): x is MatchLineup => x != null);

  return {
    events,
    lineups,
    minute: match.minute ?? null,
    source: "football-data",
  };
}

type EspnSummary = {
  header?: {
    competitions?: {
      status?: { displayClock?: string; period?: number };
      competitors?: {
        homeAway?: string;
        team?: { displayName?: string };
        roster?: {
          roster?: {
            athlete?: { displayName?: string };
            jersey?: string;
            position?: { abbreviation?: string };
            starter?: boolean;
          }[];
        };
      }[];
    }[];
  };
  scoringPlays?: {
    clock?: { displayValue?: string };
    period?: { number?: number };
    team?: { displayName?: string };
    text?: string;
    scorers?: { athlete?: { displayName?: string } }[];
    scoringType?: { name?: string };
  }[];
  boxscore?: {
    players?: {
      team?: { displayName?: string };
      statistics?: {
        athletes?: {
          athlete?: { displayName?: string; jersey?: string };
          starter?: boolean;
          position?: { abbreviation?: string };
        }[];
      }[];
    }[];
  };
};

function parseEspnMinute(clock?: string): number | null {
  if (!clock) return null;
  const m = clock.match(/(\d+)/);
  return m ? Number.parseInt(m[1], 10) : null;
}

async function fetchEspnDetail(
  competitionId: CompetitionId,
  espnEventId: string,
  homeTeam: string,
  awayTeam: string,
): Promise<MatchGameData | null> {
  const slug = ESPN_SLUG[competitionId] ?? "usa.1";
  const url = `${ESPN_BASE}/${slug}/summary?event=${espnEventId}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;

  const json = (await res.json()) as EspnSummary;
  const competition = json.header?.competitions?.[0];
  const minute = parseEspnMinute(competition?.status?.displayClock);

  const events: MatchEvent[] = (json.scoringPlays ?? []).map((play, i) => {
    const typeName = (play.scoringType?.name ?? "").toLowerCase();
    let type: MatchEvent["type"] = "goal";
    if (typeName.includes("own")) type = "own_goal";
    if (typeName.includes("pen")) type = "penalty";
    return {
      id: `espn-goal-${i}-${play.clock?.displayValue ?? i}`,
      type,
      minute: parseEspnMinute(play.clock?.displayValue),
      teamSide: sideFromTeam(play.team?.displayName, homeTeam, awayTeam),
      playerName: play.scorers?.[0]?.athlete?.displayName ?? null,
      assistName: null,
      detail: play.text ?? play.scoringType?.name ?? "Goal",
    };
  });

  const lineups: MatchLineup[] = [];
  for (const competitor of competition?.competitors ?? []) {
    const side = competitor.homeAway === "home" ? "home" : "away";
    const roster = competitor.roster?.roster ?? [];
    if (roster.length === 0) continue;
    const starters = roster
      .filter((r) => r.starter !== false)
      .map((r) => ({
        name: r.athlete?.displayName ?? "Unknown",
        number: r.jersey ? Number.parseInt(r.jersey, 10) : null,
        position: r.position?.abbreviation ?? null,
        starter: true,
      }));
    const bench = roster
      .filter((r) => r.starter === false)
      .map((r) => ({
        name: r.athlete?.displayName ?? "Unknown",
        number: r.jersey ? Number.parseInt(r.jersey, 10) : null,
        position: r.position?.abbreviation ?? null,
        starter: false,
      }));
    lineups.push({
      side,
      teamName: competitor.team?.displayName ?? side,
      formation: null,
      starters,
      bench,
    });
  }

  // Fallback boxscore rosters
  if (lineups.length === 0) {
    for (const block of json.boxscore?.players ?? []) {
      const athletes = block.statistics?.[0]?.athletes ?? [];
      if (!athletes.length || !block.team?.displayName) continue;
      const side = sideFromTeam(block.team.displayName, homeTeam, awayTeam);
      if (!side) continue;
      const starters = athletes
        .filter((a) => a.starter !== false)
        .map((a) => ({
          name: a.athlete?.displayName ?? "Unknown",
          number: a.athlete?.jersey
            ? Number.parseInt(a.athlete.jersey, 10)
            : null,
          position: a.position?.abbreviation ?? null,
          starter: true,
        }));
      const bench = athletes
        .filter((a) => a.starter === false)
        .map((a) => ({
          name: a.athlete?.displayName ?? "Unknown",
          number: a.athlete?.jersey
            ? Number.parseInt(a.athlete.jersey, 10)
            : null,
          position: a.position?.abbreviation ?? null,
          starter: false,
        }));
      lineups.push({
        side,
        teamName: block.team.displayName,
        formation: null,
        starters,
        bench,
      });
    }
  }

  return {
    events,
    lineups,
    minute,
    source: "espn",
  };
}

/** Live game sheet: goals, cards, lineups (best-effort by provider). */
export async function fetchMatchGameData(input: {
  externalId: string | null;
  competitionId: CompetitionId;
  homeTeam: string;
  awayTeam: string;
  kickoffAt?: string;
}): Promise<MatchGameData> {
  const empty: MatchGameData = {
    events: [],
    lineups: [],
    minute: null,
    source: "none",
  };

  if (!input.externalId) return empty;

  try {
    if (input.externalId.startsWith("espn-")) {
      const espnId = input.externalId.replace(/^espn-/, "");
      return (
        (await fetchEspnDetail(
          input.competitionId,
          espnId,
          input.homeTeam,
          input.awayTeam,
        )) ?? empty
      );
    }

    const fd = await fetchFootballDataDetail(
      input.externalId,
      input.homeTeam,
      input.awayTeam,
    );
    if (fd && (fd.events.length > 0 || fd.lineups.length > 0)) return fd;

    // Free tier often omits scorers/lineups — use the same fixture on ESPN
    if (input.kickoffAt) {
      const kickoff = new Date(input.kickoffAt).getTime();
      const twins = await fetchEspnRows(
        input.competitionId,
        new Date(kickoff - 86_400_000),
        new Date(kickoff + 86_400_000),
      );
      const twin = findSameFixture(
        {
          home_team: input.homeTeam,
          away_team: input.awayTeam,
          kickoff_at: input.kickoffAt,
        },
        twins,
      );
      if (twin) {
        const espn = await fetchEspnDetail(
          input.competitionId,
          twin.external_id.replace(/^espn-/, ""),
          input.homeTeam,
          input.awayTeam,
        );
        if (espn) return { ...espn, minute: espn.minute ?? fd?.minute ?? null };
      }
    }

    return fd ?? empty;
  } catch (err) {
    console.error("fetchMatchGameData failed:", err);
    return empty;
  }
}
