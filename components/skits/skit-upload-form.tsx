"use client";

import { useActionState, useRef, useState } from "react";
import { submitSkit, type ActionState } from "@/app/features/actions";
import type { Match } from "@/lib/matches/types";

const initial: ActionState = {};
const MAX_MB = 50;

export function SkitUploadForm({ matches }: { matches: Match[] }) {
  const [state, action, pending] = useActionState(submitSkit, initial);
  const [duration, setDuration] = useState("");
  const videoRef = useRef<HTMLInputElement>(null);

  function onVideoPick() {
    const file = videoRef.current?.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      setDuration(String(Math.round(probe.duration)));
    };
    probe.src = url;
  }

  return (
    <form action={action} className="fs-panel space-y-4 p-5">
      <div>
        <p className="fs-kicker">Fan comedy</p>
        <h3 className="fs-display mt-1 text-xl text-[var(--beige)]">
          Upload a fan skit
        </h3>
        <p className="mt-1 text-xs text-[var(--beige-dim)]">
          Original fan comedy only · MP4, WebM, or MOV · max {MAX_MB} MB
        </p>
      </div>
      <input name="title" required placeholder="Title" className="fs-field" />
      <input
        name="tag"
        placeholder="Tag (meme, VAR comedy…)"
        className="fs-field"
      />
      <select name="matchId" defaultValue="" className="fs-field">
        <option value="">Tie to a match (optional)</option>
        {matches.map((m) => (
          <option key={m.id} value={m.id}>
            {m.homeTeam} vs {m.awayTeam}
          </option>
        ))}
      </select>
      <input type="hidden" name="duration" value={duration} />
      <input
        ref={videoRef}
        name="video"
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        required
        onChange={onVideoPick}
        className="w-full text-sm text-[var(--beige-muted)] file:mr-3 file:border-0 file:bg-[var(--beige)] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[var(--ink)]"
      />
      <label className="flex items-start gap-2 text-xs leading-relaxed text-[var(--beige-muted)]">
        <input
          type="checkbox"
          name="rightsAttested"
          value="yes"
          required
          className="mt-0.5"
        />
        <span>
          I confirm this is my original fan content (or I have permission to
          share it). It does not use unauthorized broadcast footage or
          impersonate real athletes.
        </span>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="fs-btn-primary disabled:opacity-60"
      >
        {pending ? "Uploading…" : "Publish skit"}
      </button>
      {state.error ? (
        <p className="text-sm text-[var(--live)]">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-[var(--sky)]">{state.success}</p>
      ) : null}
    </form>
  );
}
