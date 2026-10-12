"use client";

import { useActionState } from "react";
import { openBillingPortal, startProCheckout, type ProState } from "@/app/pro/actions";

const initial: ProState = {};

export function ProCheckoutButton({
  isPro,
  configured,
  priceLabel,
  signedIn,
}: {
  isPro: boolean;
  configured: boolean;
  priceLabel: string;
  signedIn: boolean;
}) {
  const [state, action, pending] = useActionState(startProCheckout, initial);
  const [portalState, portalAction, portalPending] = useActionState(openBillingPortal, initial);

  if (isPro) {
    return (
      <form action={portalAction} className="space-y-2">
        <p className="fs-chip fs-chip--mint">You&apos;re Pro · thank you</p>
        <button type="submit" disabled={portalPending} className="fs-btn-ghost text-sm disabled:opacity-60">
          {portalPending ? "Opening…" : "Manage billing"}
        </button>
        {portalState.error ? <p className="text-xs text-[var(--live)]">{portalState.error}</p> : null}
      </form>
    );
  }

  if (!configured) {
    return (
      <div className="space-y-2">
        <a
          href={`mailto:${process.env.NEXT_PUBLIC_SPONSOR_EMAIL ?? "hello@futbolsocial.app"}?subject=${encodeURIComponent("Futbol Social Pro waitlist")}`}
          className="fs-btn-primary fs-btn-gold"
        >
          Join the Pro waitlist · {priceLabel}
        </a>
        <p className="text-xs text-[var(--beige-dim)]">Payments go live once Stripe is connected.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-2">
      <button type="submit" disabled={pending} className="fs-btn-primary fs-btn-gold disabled:opacity-60">
        {pending ? "Opening checkout…" : signedIn ? `Go Pro · ${priceLabel}` : `Sign in to go Pro · ${priceLabel}`}
      </button>
      <p className="text-xs text-[var(--beige-dim)]">Cancel any time. Secure checkout by Stripe.</p>
      {state.error ? <p className="text-xs text-[var(--live)]">{state.error}</p> : null}
    </form>
  );
}
