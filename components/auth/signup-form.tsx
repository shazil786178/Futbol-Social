"use client";

import { useActionState } from "react";
import { signup, type SignupState } from "@/app/signup/actions";

const initialState: SignupState = {};

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(signup, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label
          htmlFor="username"
          className="block text-xs font-medium uppercase tracking-wider text-[var(--beige-dim)]"
        >
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          minLength={3}
          maxLength={20}
          pattern="[a-zA-Z0-9_]+"
          placeholder="football_fan_26"
          className="fs-field py-3"
        />
        <p className="text-xs text-[var(--beige-dim)]">
          3–20 characters. Letters, numbers, underscores.
        </p>
      </div>

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
      </div>

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="block text-xs font-medium uppercase tracking-wider text-[var(--beige-dim)]"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          placeholder="••••••••"
          className="fs-field py-3"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="confirmPassword"
          className="block text-xs font-medium uppercase tracking-wider text-[var(--beige-dim)]"
        >
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          placeholder="••••••••"
          className="fs-field py-3"
        />
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
          className="border border-[var(--sky)]/40 bg-[var(--sky)]/10 px-4 py-3 text-sm text-[var(--sky)]"
        >
          {state.success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="fs-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
