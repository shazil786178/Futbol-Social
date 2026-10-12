"use server";

import { redirect } from "next/navigation";
import { getSiteUrl } from "@/lib/auth/site-url";
import { stripeConfigured } from "@/lib/pro/plan";
import { createClient } from "@/lib/supabase/server";

export type ProState = { error?: string };

/** Creates a Stripe Checkout session with plain fetch — no SDK needed. */
export async function startProCheckout(_prev: ProState): Promise<ProState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/pro");

  if (!stripeConfigured()) {
    return { error: "Pro isn't switched on yet — add STRIPE_SECRET_KEY and STRIPE_PRICE_ID in Vercel." };
  }

  const site = await getSiteUrl();
  const body = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": process.env.STRIPE_PRICE_ID!.trim(),
    "line_items[0][quantity]": "1",
    success_url: `${site}/pro?success=1`,
    cancel_url: `${site}/pro?canceled=1`,
    client_reference_id: user.id,
    "metadata[user_id]": user.id,
    allow_promotion_codes: "true",
  });
  if (user.email) body.set("customer_email", user.email);

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY!.trim()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("Stripe checkout:", res.status, text.slice(0, 300));
    return { error: "Couldn't start checkout. Try again in a moment." };
  }
  const session = (await res.json()) as { url?: string };
  if (!session.url) return { error: "Stripe did not return a checkout link." };
  redirect(session.url);
}

/** Stripe customer portal so people can cancel without emailing you. */
export async function openBillingPortal(_prev: ProState): Promise<ProState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/pro");
  if (!process.env.STRIPE_SECRET_KEY) return { error: "Billing isn't configured." };

  const { data } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();
  const customer = (data as { stripe_customer_id?: string | null } | null)?.stripe_customer_id;
  if (!customer) return { error: "No billing account found for you yet." };

  const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY.trim()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ customer, return_url: `${await getSiteUrl()}/pro` }),
    cache: "no-store",
  });
  if (!res.ok) return { error: "Couldn't open billing." };
  const session = (await res.json()) as { url?: string };
  if (!session.url) return { error: "Stripe did not return a link." };
  redirect(session.url);
}
