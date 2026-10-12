import {
  fetchScoreBatHighlights,
  flattenScoreBatHighlights,
  type SyncedHighlight,
} from "@/lib/football-api/scorebat";
import {
  fetchYouTubeHighlights,
  flattenYouTubeHighlights,
} from "@/lib/football-api/youtube";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COMPETITIONS } from "@/lib/brand";

function isMissingColumnError(message: string) {
  const m = message.toLowerCase();
  return (
    m.includes("embed_url") ||
    m.includes("embed_html") ||
    m.includes("thumbnail_url") ||
    m.includes("external_id") ||
    m.includes("competition_label") ||
    m.includes("source") ||
    m.includes("schema cache") ||
    m.includes("column")
  );
}

/** Official highlights from YouTube league channels (free) + ScoreBat. */
export async function syncScoreBatHighlights(
  supabase: SupabaseClient,
): Promise<{ highlightsUpserted: number; stubMatches: number }> {
  const [youtube, feed] = await Promise.all([
    fetchYouTubeHighlights().catch(() => []),
    fetchScoreBatHighlights().catch(() => []),
  ]);
  if (youtube.length === 0 && feed.length === 0) {
    return { highlightsUpserted: 0, stubMatches: 0 };
  }

  const { data: local } = await supabase
    .from("matches")
    .select("id, home_team, away_team, kickoff_at");

  const localMatches = (local ?? []).map((m) => ({
    id: m.id,
    homeTeam: m.home_team,
    awayTeam: m.away_team,
    kickoffAt: m.kickoff_at,
  }));

  const flattened: (SyncedHighlight & { source: "youtube" | "scorebat" })[] = [
    ...flattenYouTubeHighlights(youtube, localMatches).map((h) => ({
      ...h,
      source: "youtube" as const,
    })),
    ...flattenScoreBatHighlights(feed, localMatches).map((h) => ({
      ...h,
      source: "scorebat" as const,
    })),
  ];

  await supabase.from("competitions").upsert(
    COMPETITIONS.active.map((c) => ({ id: c.id, name: c.name })),
    { onConflict: "id" },
  );

  const stubs = new Map<
    string,
    {
      id: string;
      competition_id: string;
      home_team: string;
      away_team: string;
      kickoff_at: string;
      status: string;
      home_score: number | null;
      away_score: number | null;
      venue: string;
      external_id: string;
      last_synced_at: string;
    }
  >();

  for (const h of flattened) {
    if (!h.stubMatch) continue;
    stubs.set(h.stubMatch.id, {
      id: h.stubMatch.id,
      competition_id: h.stubMatch.competitionId,
      home_team: h.stubMatch.homeTeam,
      away_team: h.stubMatch.awayTeam,
      kickoff_at: h.stubMatch.kickoffAt,
      status: "finished",
      home_score: null,
      away_score: null,
      venue: "Highlights",
      external_id: `${h.source}-match-${h.stubMatch.id}`,
      last_synced_at: new Date().toISOString(),
    });
  }

  let stubMatches = 0;
  if (stubs.size > 0) {
    const { error } = await supabase
      .from("matches")
      .upsert([...stubs.values()], { onConflict: "id" });
    if (!error) stubMatches = stubs.size;
    else console.error("ScoreBat stub matches:", error.message);
  }

  const baseRows = flattened.map((h) => ({
    match_id: h.matchId,
    title: h.title.slice(0, 180),
    duration: "HL",
    thumbnail_label: h.videoTitle.slice(0, 24) || "HL",
    sort_order: h.sortOrder,
    video_url: h.embedUrl,
    embed_html: h.embedHtml,
    embed_url: h.embedUrl,
    thumbnail_url: h.thumbnailUrl,
    source: h.source,
    external_id: h.externalId,
    competition_label: h.competitionLabel,
  }));

  // Migration 017 adds published_at (used by the ranking). Probe once; fall
  // back to the 013 shape if the column is not there yet.
  let fullRows: Record<string, unknown>[] = baseRows.map((r, i) => ({
    ...r,
    published_at: flattened[i]!.happenedAt,
  }));
  {
    const { error } = await supabase
      .from("highlights")
      .select("published_at", { head: true, count: "exact" })
      .limit(1);
    if (error) fullRows = baseRows;
  }

  // Legacy shape if migration 013 not applied yet — store the embed in video_url.
  // match_id is NOT NULL before 013, so unlinked rows are skipped there.
  const legacyRows = flattened
    .filter((h) => h.matchId)
    .map((h) => ({
      match_id: h.matchId,
      title: h.title.slice(0, 180),
      duration: "HL",
      thumbnail_label: h.videoTitle.slice(0, 24) || "HL",
      sort_order: h.sortOrder,
      video_url: h.embedUrl,
    }));

  let highlightsUpserted = 0;
  let useLegacy = false;

  // Wipe previous official rows (embed URLs in video_url) before refresh
  await supabase
    .from("highlights")
    .delete()
    .like("video_url", "%scorebat.com/embed%");
  await supabase
    .from("highlights")
    .delete()
    .like("video_url", "%youtube.com/embed%");

  const { error: probeError } = await supabase
    .from("highlights")
    .insert(fullRows.slice(0, 1));

  if (probeError && isMissingColumnError(probeError.message)) {
    useLegacy = true;
    console.warn(
      "Migration 013 not applied — storing ScoreBat embeds in video_url. Run supabase/migrations/013_scorebat_highlights.sql",
    );
  } else if (probeError) {
    console.error("ScoreBat highlights probe:", probeError.message);
  } else {
    highlightsUpserted = 1;
  }

  const remaining = useLegacy ? legacyRows : fullRows.slice(highlightsUpserted);
  if (remaining.length > 0) {
    const chunkSize = 40;
    for (let i = 0; i < remaining.length; i += chunkSize) {
      const chunk = remaining.slice(i, i + chunkSize);
      const { error, count } = await supabase
        .from("highlights")
        .insert(chunk, { count: "exact" });
      if (error) {
        console.error("ScoreBat highlights insert:", error.message);
        break;
      }
      highlightsUpserted += count ?? chunk.length;
    }
  }

  // Drop scenery stock leftovers
  await supabase
    .from("highlights")
    .delete()
    .is("user_id", null)
    .like("video_url", "/clips/%");

  return { highlightsUpserted, stubMatches };
}
