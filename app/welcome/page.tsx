import { redirect } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { WelcomeSurvey } from "@/components/onboarding/welcome-survey";
import { BRAND } from "@/lib/brand";
import { CATALOG_PLAYERS, CATALOG_TEAMS } from "@/lib/entities/catalog";
import { similarity } from "@/lib/football-api/live-scores";
import { listUniqueTeams } from "@/lib/matches/data";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: `Welcome — ${BRAND.name}`,
};

/** Use the fixture-feed spelling so Rival Mode and "my club" matching line up. */
function feedName(name: string, feedTeams: string[]): string {
  let best = name;
  let bestScore = 0.99;
  for (const t of feedTeams) {
    const s = similarity(name, t);
    if (s > bestScore) {
      best = t;
      bestScore = s;
    }
  }
  return best;
}

export default async function WelcomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, feedTeams] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, supported_team")
      .eq("id", user.id)
      .maybeSingle(),
    listUniqueTeams(),
  ]);

  const popularTeams = CATALOG_TEAMS.slice(0, 12).map((t) => feedName(t.name, feedTeams));
  const allTeams = [...new Set([...feedTeams, ...popularTeams])].sort((a, b) =>
    a.localeCompare(b),
  );

  return (
    <PageShell>
      <WelcomeSurvey
        username={profile?.username ?? "fan"}
        popularTeams={popularTeams}
        allTeams={allTeams}
        popularPlayers={CATALOG_PLAYERS.slice(0, 12).map((p) => ({
          name: p.name,
          team: p.team,
        }))}
        initialTeam={profile?.supported_team ?? null}
      />
    </PageShell>
  );
}
