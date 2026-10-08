"use client";

import { useActionState, useRef, useState } from "react";
import { publishShot, type ShotActionState } from "@/app/shots/actions";
import { CATALOG_PLAYERS, CATALOG_TEAMS } from "@/lib/entities/catalog";

const initial: ShotActionState = {};

export function ShotComposer({ signedIn }: { signedIn: boolean }) {
  const [state, action, pending] = useActionState(publishShot, initial);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!signedIn) {
    return (
      <div className="fs-panel px-4 py-5 text-center sm:px-6">
        <p className="fs-kicker !text-[var(--sky)]">Publish</p>
        <p className="mt-2 text-sm text-[var(--beige-muted)]">
          <a href="/login" className="text-[var(--sky)] hover:text-[var(--beige)]">
            Sign in
          </a>{" "}
          to drop a match-day photo into Shots.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="fs-panel overflow-hidden">
      <div className="border-b border-[var(--line)] px-4 py-3 sm:px-5">
        <p className="fs-kicker !text-[var(--sky)]">New shot</p>
        <p className="mt-1 text-sm text-[var(--beige-muted)]">
          High-res fan photo · caption · tag a player or club
        </p>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-[140px_1fr] sm:p-5">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="relative flex aspect-square items-center justify-center overflow-hidden border border-dashed border-[var(--line-strong)] bg-[var(--ink)] text-xs uppercase tracking-wider text-[var(--beige-dim)] transition hover:border-[var(--sky)] hover:text-[var(--beige)]"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            "Add photo"
          )}
        </button>
        <input
          ref={inputRef}
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          required
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) {
              setPreview(null);
              return;
            }
            setPreview(URL.createObjectURL(f));
          }}
        />

        <div className="space-y-3">
          <textarea
            name="caption"
            rows={3}
            maxLength={500}
            placeholder="What’s in the frame?"
            className="fs-field resize-none"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--beige-dim)]">
              Player (optional)
              <input
                name="playerLabel"
                list="shot-players"
                placeholder="e.g. Salah"
                className="fs-field mt-1.5"
              />
              <datalist id="shot-players">
                {CATALOG_PLAYERS.map((p) => (
                  <option key={p.slug} value={p.name} />
                ))}
              </datalist>
            </label>
            <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--beige-dim)]">
              Team (optional)
              <input
                name="teamLabel"
                list="shot-teams"
                placeholder="e.g. Liverpool"
                className="fs-field mt-1.5"
              />
              <datalist id="shot-teams">
                {CATALOG_TEAMS.map((t) => (
                  <option key={t.slug} value={t.name} />
                ))}
              </datalist>
            </label>
          </div>
          <label className="flex items-start gap-2 text-xs leading-relaxed text-[var(--beige-muted)]">
            <input
              type="checkbox"
              name="rightsAttested"
              value="yes"
              required
              className="mt-0.5"
            />
            <span>
              I took this or have permission to share it. No pirated broadcast
              frames.
            </span>
          </label>
          <button
            type="submit"
            disabled={pending}
            className="fs-btn-primary w-full sm:w-auto disabled:opacity-60"
          >
            {pending ? "Publishing…" : "Publish shot"}
          </button>
          {state.error ? (
            <p className="text-sm text-[var(--live)]">{state.error}</p>
          ) : null}
          {state.success ? (
            <p className="text-sm text-[var(--sky)]">{state.success}</p>
          ) : null}
        </div>
      </div>
    </form>
  );
}
