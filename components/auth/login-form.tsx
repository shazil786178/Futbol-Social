"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type LoginState } from "@/app/login/actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="space-y-5">
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
        <div className="flex items-center justify-between">
          <label
            htmlFor="password"
            className="block text-xs font-medium uppercase tracking-wider text-[var(--beige-dim)]"
          >
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-xs text-[var(--beige-dim)] transition hover:text-[var(--sky)]"
          >
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
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

      <button
        type="submit"
        disabled={isPending}
        className="fs-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
