import { StayLoop } from "@/components/layout/stay-loop";
import { LivePulse } from "@/components/realtime/live-pulse";
import { listMatches } from "@/lib/matches/data";
import { isNearKickoff } from "@/lib/matches/format";
import { getDailyState } from "@/lib/streaks/daily";
import { createClient } from "@/lib/supabase/server";

export async function StayLoopHost() {
  const matches = await listMatches();
  const live = matches.filter((m) => m.status === "live");
  const aroundKickoff = matches.some(isNearKickoff);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const daily = user ? await getDailyState(supabase, user.id) : null;
  const callOpen = daily?.missions.find((m) => m.id === "call" && !m.done);
  const nextMission = daily?.missions.find((m) => !m.done);

  const liveMatch = live[0];
  const href = liveMatch
    ? `/matches/${liveMatch.id}?tab=chat`
    : callOpen
      ? "/call"
      : nextMission
        ? nextMission.href
        : "/clips";
  const label = liveMatch
    ? `${liveMatch.homeTeam} vs ${liveMatch.awayTeam}`
    : callOpen
      ? "The Call is open"
      : nextMission
        ? nextMission.label
        : "Watch tonight's tape";

  return (
    <>
      <LivePulse active={live.length > 0 || aroundKickoff} />
      <StayLoop href={href} label={label} live={Boolean(liveMatch)} />
    </>
  );
}
