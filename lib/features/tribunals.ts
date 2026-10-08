import type { SupabaseClient } from "@supabase/supabase-js";

export async function closeOpenTribunalsForMatch(
  supabase: SupabaseClient,
  matchId: string,
) {
  await supabase
    .from("tribunals")
    .update({
      status: "closed",
      closed_at: new Date().toISOString(),
    })
    .eq("match_id", matchId)
    .eq("status", "open");
}
