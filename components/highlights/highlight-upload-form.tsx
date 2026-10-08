"use client";

import { useActionState, useRef, useState } from "react";
import { submitHighlight, type ActionState } from "@/app/features/actions";

const initial: ActionState = {};
const MAX_MB = 100;

export function HighlightUploadForm({
  matchId,
  matchLabel,
}: {
  matchId: string;
  matchLabel: string;
}) {
  const [state, action, pending] = useActionState(submitHighlight, initial);
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
        <p className="fs-kicker">Fan upload</p>
        <h3 className="fs-display mt-1 text-xl text-[var(--beige)]">
          Upload a fan clip
        </h3>
        <p className="mt-1 text-xs text-[var(--beige-dim)]">
          {matchLabel} · Original fan video only · MP4/WebM/MOV · max {MAX_MB} MB
        </p>
      </div>
      <input type="hidden" name="matchId" value={matchId} />
      <input
        name="title"
        required
        placeholder="Clip title (e.g. Last-minute equalizer)"
        className="fs-field"
      />
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
          share it). It is not broadcast, pay-TV, or other copyrighted match
          footage.
        </span>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="fs-btn-primary disabled:opacity-60"
      >
        {pending ? "Uploading…" : "Upload fan clip"}
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
