import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type FollowedTeam = {
  id: string;
  teamName: string;
  createdAt: string;
};

export type FollowedPlayer = {
  id: string;
  playerName: string;
  teamName: string | null;
  createdAt: string;
};

export async function listFollowedTeams(userId: string): Promise<FollowedTeam[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("followed_teams")
    .select("id, team_name, created_at")
    .eq("user_id", userId)
    .order("team_name");

  return (data ?? []).map((r) => ({
    id: r.id,
    teamName: r.team_name,
    createdAt: r.created_at,
  }));
}

export async function listFollowedPlayers(
  userId: string,
): Promise<FollowedPlayer[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("followed_players")
    .select("id, player_name, team_name, created_at")
    .eq("user_id", userId)
    .order("player_name");

  return (data ?? []).map((r) => ({
    id: r.id,
    playerName: r.player_name,
    teamName: r.team_name,
    createdAt: r.created_at,
  }));
}

/** Distinct team names from synced matches for the follow directory. */
export async function listDirectoryTeams(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select("home_team, away_team")
    .order("kickoff_at", { ascending: false })
    .limit(800);

  const teams = new Set<string>();
  for (const row of data ?? []) {
    if (row.home_team) teams.add(row.home_team);
    if (row.away_team) teams.add(row.away_team);
  }
  return [...teams].sort((a, b) => a.localeCompare(b));
}

const POPULAR_PLAYERS = [
  { name: "Erling Haaland", team: "Manchester City" },
  { name: "Kylian Mbappé", team: "Real Madrid" },
  { name: "Mohamed Salah", team: "Liverpool" },
  { name: "Vinícius Júnior", team: "Real Madrid" },
  { name: "Harry Kane", team: "Bayern Munich" },
  { name: "Jude Bellingham", team: "Real Madrid" },
  { name: "Bukayo Saka", team: "Arsenal" },
  { name: "Lionel Messi", team: "Inter Miami" },
  { name: "Robert Lewandowski", team: "Barcelona" },
  { name: "Pedri", team: "Barcelona" },
  { name: "Florian Wirtz", team: "Bayer Leverkusen" },
  { name: "Lautaro Martínez", team: "Inter Milan" },
  { name: "Cole Palmer", team: "Chelsea" },
  { name: "Phil Foden", team: "Manchester City" },
  { name: "Lamine Yamal", team: "Barcelona" },
];

export function listPopularPlayers() {
  return POPULAR_PLAYERS;
}

function teamMatches(followed: string, home: string, away: string) {
  const f = followed.toLowerCase();
  return (
    home.toLowerCase().includes(f) ||
    f.includes(home.toLowerCase()) ||
    away.toLowerCase().includes(f) ||
    f.includes(away.toLowerCase()) ||
    home.toLowerCase() === f ||
    away.toLowerCase() === f
  );
}

/** Notify followers when a followed team's match goes live or finishes. */
export async function notifyFollowersOfMatchUpdates(
  supabase: SupabaseClient,
  matches: {
    id: string;
    home_team: string;
    away_team: string;
    status: string;
    home_score: number | null;
    away_score: number | null;
  }[],
  previous: Map<string, { home: number | null; away: number | null; status?: string }>,
) {
  const { data: follows } = await supabase
    .from("followed_teams")
    .select("user_id, team_name");

  if (!follows?.length) return 0;

  let sent = 0;

  for (const match of matches) {
    const prev = previous.get(match.id);
    const becameLive = match.status === "live" && prev?.status !== "live";
    const finished =
      match.status === "finished" &&
      prev?.status !== "finished" &&
      match.home_score != null;
    const goalScored =
      prev &&
      match.home_score != null &&
      match.away_score != null &&
      (match.home_score > (prev.home ?? 0) ||
        match.away_score > (prev.away ?? 0));

    if (!becameLive && !finished && !goalScored) continue;

    const relevant = follows.filter((f) =>
      teamMatches(f.team_name, match.home_team, match.away_team),
    );
    if (!relevant.length) continue;

    let title = "Match update";
    let body = `${match.home_team} vs ${match.away_team}`;
    if (becameLive) {
      title = "Your team is live";
      body = `${match.home_team} vs ${match.away_team} has kicked off.`;
    } else if (goalScored) {
      title = "Goal!";
      body = `${match.home_team} ${match.home_score}–${match.away_score} ${match.away_team}`;
    } else if (finished) {
      title = "Full time";
      body = `FT: ${match.home_team} ${match.home_score}–${match.away_score} ${match.away_team}`;
    }

    for (const follower of relevant) {
      await supabase.from("notifications").insert({
        user_id: follower.user_id,
        title,
        body: `${follower.team_name}: ${body}`,
      });
      sent += 1;
    }
  }

  return sent;
}
