"use client";

import { useActionState } from "react";
import {
  requestPasswordReset,
  type ForgotPasswordState,
} from "@/app/forgot-password/actions";

const initial: ForgotPasswordState = {};

export function ForgotPasswordForm() {
  const [state, action, isPending] = useActionState(
    requestPasswordReset,
    initial,
  );

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-xs font-medium uppercase tracking-wider text-[var(--beige-dim)]"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className="fs-field py-3"
        />
        <p className="text-xs text-[var(--beige-dim)]">
          We&apos;ll take you straight to choose a new password (no email wait on
          local). If email is required, open the link in this same browser.
        </p>
      </div>

      {state.error ? (
        <p
          role="alert"
          className="border border-[var(--live)]/40 bg-[var(--live)]/10 px-4 py-3 text-sm text-[var(--live)]"
        >
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p
          role="status"
          className="border border-[var(--sky)]/30 bg-[var(--sky)]/10 px-4 py-3 text-sm text-[var(--sky)]"
        >
          {state.success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="fs-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Working…" : "Continue to reset password"}
      </button>
    </form>
  );
}
