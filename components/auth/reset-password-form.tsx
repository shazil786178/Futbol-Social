"use client";

import { useActionState } from "react";
import {
  resetPassword,
  type ResetPasswordState,
} from "@/app/reset-password/actions";

const initialState: ResetPasswordState = {};

const inputClassName =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-zinc-500 outline-none transition focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20";

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    resetPassword,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          placeholder="••••••••"
          className={inputClassName}
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-zinc-300"
        >
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          placeholder="••••••••"
          className={inputClassName}
        />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-amber-400 py-3.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Updating password…" : "Update password"}
      </button>
    </form>
  );
}
