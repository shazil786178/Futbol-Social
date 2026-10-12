import { NextResponse } from "next/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** Verifies Stripe's signature header without the SDK (HMAC-SHA256). */
async function verify(payload: string, header: string | null, secret: string) {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((kv) => {
      const [k, v] = kv.split("=");
      return [k?.trim(), v?.trim()];
    }),
  ) as Record<string, string | undefined>;
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${payload}`));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

type StripeEvent = {
  type: string;
  data: {
    object: {
      id?: string;
      customer?: string | null;
      client_reference_id?: string | null;
      metadata?: Record<string, string>;
      status?: string;
    };
  };
};

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  if (!hasAdminClient()) return NextResponse.json({ error: "No admin client" }, { status: 503 });

  const payload = await req.text();
  const ok = await verify(payload, req.headers.get("stripe-signature"), secret);
  if (!ok) return NextResponse.json({ error: "Bad signature" }, { status: 400 });

  const event = JSON.parse(payload) as StripeEvent;
  const supabase = createAdminClient();
  const obj = event.data.object;

  if (event.type === "checkout.session.completed") {
    const userId = obj.metadata?.user_id ?? obj.client_reference_id;
    if (userId) {
      await supabase
        .from("profiles")
        .update({
          is_pro: true,
          pro_since: new Date().toISOString(),
          stripe_customer_id: obj.customer ?? null,
        })
        .eq("id", userId);
    }
  } else if (
    event.type === "customer.subscription.deleted" ||
    (event.type === "customer.subscription.updated" &&
      obj.status &&
      !["active", "trialing", "past_due"].includes(obj.status))
  ) {
    if (obj.customer) {
      await supabase
        .from("profiles")
        .update({ is_pro: false })
        .eq("stripe_customer_id", obj.customer);
    }
  } else if (event.type === "customer.subscription.updated" && obj.customer && obj.status === "active") {
    await supabase.from("profiles").update({ is_pro: true }).eq("stripe_customer_id", obj.customer);
  }

  return NextResponse.json({ received: true });
}
