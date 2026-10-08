import type { SupabaseClient } from "@supabase/supabase-js";
import type { MatchIncident } from "@/lib/football-api/match-events";
import { fetchMatchIncidents } from "@/lib/football-api/match-events";

type LiveMatch = {
  id: string;
  external_id: string;
  home_team: string;
  away_team: string;
};

export async function syncMatchIncidents(
  supabase: SupabaseClient,
  match: LiveMatch,
): Promise<number> {
  const incidents = await fetchMatchIncidents(match.external_id);
  let opened = 0;

  for (const incident of incidents) {
    const { data: existing } = await supabase
      .from("match_incidents")
      .select("id")
      .eq("external_event_id", incident.externalId)
      .maybeSingle();

    if (existing) continue;

    const { data: openTribunal } = await supabase
      .from("tribunals")
      .select("id")
      .eq("match_id", match.id)
      .eq("status", "open")
      .maybeSingle();

    let tribunalId: string | null = null;

    if (!openTribunal) {
      const { data: tribunal, error } = await supabase
        .from("tribunals")
        .insert({
          match_id: match.id,
          question: incident.question,
          incident_type: incident.incidentType,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Tribunal auto-open failed:", error.message);
        continue;
      }

      tribunalId = tribunal.id;
      opened += 1;

      const { data: watchers } = await supabase
        .from("predictions")
        .select("user_id")
        .eq("match_id", match.id);

      for (const watcher of watchers ?? []) {
        await supabase.from("notifications").insert({
          user_id: watcher.user_id,
          title: "The Tribunal is open",
          body: `${match.home_team} vs ${match.away_team}: ${incident.question}`,
        });
      }
    } else {
      tribunalId = openTribunal.id;
    }

    await supabase.from("match_incidents").insert({
      match_id: match.id,
      external_event_id: incident.externalId,
      incident_type: incident.incidentType,
      description: incident.description,
      tribunal_id: tribunalId,
    });
  }

  return opened;
}

export async function syncAllLiveIncidents(supabase: SupabaseClient) {
  const { data: liveMatches } = await supabase
    .from("matches")
    .select("id, external_id, home_team, away_team")
    .eq("status", "live")
    .not("external_id", "is", null);

  let totalOpened = 0;
  for (const match of liveMatches ?? []) {
    totalOpened += await syncMatchIncidents(supabase, match as LiveMatch);
  }
  return totalOpened;
}
