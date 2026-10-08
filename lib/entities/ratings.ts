import { createClient } from "@/lib/supabase/server";

export type RatingSummary = {
  average: number | null;
  count: number;
  mine: number | null;
};

export async function getEntityRating(
  entityType: "player" | "team",
  entityKey: string,
  userId?: string | null,
): Promise<RatingSummary> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("entity_ratings")
      .select("rating, user_id")
      .eq("entity_type", entityType)
      .eq("entity_key", entityKey);

    const rows = data ?? [];
    if (rows.length === 0) {
      return { average: null, count: 0, mine: null };
    }

    const sum = rows.reduce((a, r) => a + r.rating, 0);
    const mine = userId
      ? (rows.find((r) => r.user_id === userId)?.rating ?? null)
      : null;

    return {
      average: Math.round((sum / rows.length) * 10) / 10,
      count: rows.length,
      mine,
    };
  } catch {
    return { average: null, count: 0, mine: null };
  }
}
