import { after, NextResponse } from "next/server";
import { syncUclGoalEvents } from "@/lib/fantasy/sync-goals";
import { refreshLiveScores } from "@/lib/football-api/live-scores";
import { runSyncJob } from "@/lib/jobs/sync-matches";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

const LIVE_MIN_GAP_MS = 25_000;
const FULL_STALE_MS = 3 * 3_600_000;

let lastLiveRun = 0;
let lastResult = { updated: 0, updatedIds: [] as string[] };
let fullSyncRunning = false;

/**
 * Called by open match pages. Throttled per server instance so a room full
 * of fans costs one ESPN round-trip, not hundreds.
 */
export async function POST() {
  if (!hasAdminClient()) {
    return NextResponse.json({ ok: false, updated: 0 });
  }

  const now = Date.now();
  if (now - lastLiveRun < LIVE_MIN_GAP_MS) {
    return NextResponse.json({ ok: true, cached: true, ...lastResult });
  }
  lastLiveRun = now;

  const supabase = createAdminClient();
  const result = await refreshLiveScores(supabase);
  lastResult = { updated: result.updated, updatedIds: result.updatedIds };

  if (result.updatedIds.some((id) => id.startsWith("ucl-"))) {
    after(() => syncUclGoalEvents(supabase).catch(() => 0));
  }

  // No cron (local dev / Vercel Hobby)? Pull the full fixture list when it's stale.
  if (!fullSyncRunning) {
    const { data } = await supabase
      .from("matches")
      .select("last_synced_at")
      .gte("kickoff_at", new Date(now + 2 * 86_400_000).toISOString())
      .order("last_synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastFull = data?.last_synced_at
      ? new Date(data.last_synced_at).getTime()
      : 0;

    if (now - lastFull > FULL_STALE_MS) {
      fullSyncRunning = true;
      after(async () => {
        try {
          await runSyncJob("full");
        } catch (err) {
          console.error("Background full sync failed:", err);
        } finally {
          fullSyncRunning = false;
        }
      });
    }
  }

  return NextResponse.json({ ok: true, ...lastResult });
}
