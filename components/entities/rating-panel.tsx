"use client";

import { useActionState } from "react";
import Link from "next/link";
import { rateEntity, type RateActionState } from "@/app/shots/actions";

const initial: RateActionState = {};

export function RatingPanel({
  entityType,
  entityKey,
  entityLabel,
  average,
  count,
  mine,
  signedIn,
}: {
  entityType: "player" | "team";
  entityKey: string;
  entityLabel: string;
  average: number | null;
  count: number;
  mine: number | null;
  signedIn: boolean;
}) {
  const [state, action, pending] = useActionState(rateEntity, initial);

  return (
    <section className="fs-panel overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] px-4 py-4 sm:px-5">
        <div>
          <p className="fs-kicker !text-[var(--sky)]">Fan rating</p>
          <p className="fs-display mt-1 text-3xl text-[var(--beige)]">
            {average != null ? average.toFixed(1) : "—"}
            <span className="ml-1 text-lg text-[var(--beige-dim)]">/10</span>
          </p>
          <p className="mt-1 text-xs text-[var(--beige-dim)]">
            {count === 0
              ? "No ratings yet — be first."
              : `${count} fan${count === 1 ? "" : "s"}`}
            {mine != null ? ` · you: ${mine}` : ""}
          </p>
        </div>
        <div className="flex gap-1" aria-hidden>
          {Array.from({ length: 10 }, (_, i) => {
            const filled = average != null && i < Math.round(average);
            return (
              <span
                key={i}
                className={`h-2 w-2 ${filled ? "bg-[var(--sky)]" : "bg-[var(--line-strong)]"}`}
              />
            );
          })}
        </div>
      </div>

      {signedIn ? (
        <form action={action} className="px-4 py-4 sm:px-5">
          <input type="hidden" name="entityType" value={entityType} />
          <input type="hidden" name="entityKey" value={entityKey} />
          <input type="hidden" name="entityLabel" value={entityLabel} />
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--beige-dim)]">
            Your score
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Array.from({ length: 10 }, (_, i) => {
              const n = i + 1;
              const active = mine === n;
              return (
                <button
                  key={n}
                  type="submit"
                  name="rating"
                  value={n}
                  disabled={pending}
                  className={`min-w-[2.25rem] border px-2 py-2 font-mono text-sm font-semibold transition ${
                    active
                      ? "border-[var(--sky)] bg-[var(--sky)] text-[var(--ink)]"
                      : "border-[var(--line-strong)] text-[var(--beige-muted)] hover:border-[var(--sky)] hover:text-[var(--beige)]"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
          {state.error ? (
            <p className="mt-3 text-sm text-[var(--live)]">{state.error}</p>
          ) : null}
          {state.success ? (
            <p className="mt-3 text-sm text-[var(--sky)]">{state.success}</p>
          ) : null}
        </form>
      ) : (
        <p className="px-4 py-4 text-sm text-[var(--beige-muted)] sm:px-5">
          <Link href="/login" className="text-[var(--sky)] hover:text-[var(--beige)]">
            Sign in
          </Link>{" "}
          to drop a rating.
        </p>
      )}
    </section>
  );
}
