import type { SupabaseClient } from "@supabase/supabase-js";

/** Pro tier — the subscription that pays for the servers. */

export const PRO_PRICE_LABEL =
  process.env.NEXT_PUBLIC_PRO_PRICE_LABEL?.trim() || "$4.99 / month";

export const PRO_PERKS = [
  { title: "No ads, ever", body: "Every page, every clip, every match room." },
  { title: "Unlimited AI Pundit", body: "Ask as much as you like. Free accounts get 5 a day." },
  { title: "Train plans", body: "A personalised weekly plan, rebuilt every Monday." },
  { title: "Second touch on The Pitch", body: "Everyone else gets one. You get two." },
  { title: "Top Bins replay", body: "One extra attempt a day and your full shot history." },
  { title: "Early Call results", body: "See how the planet is splitting before it closes." },
  { title: "Pro badge", body: "On your profile, your clips and the leaderboards." },
] as const;

export function stripeConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_PRICE_ID?.trim(),
  );
}

export async function getIsPro(
  supabase: SupabaseClient,
  userId: string | null,
): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await supabase
    .from("profiles")
    .select("is_pro")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return false;
  return Boolean((data as { is_pro?: boolean }).is_pro);
}
