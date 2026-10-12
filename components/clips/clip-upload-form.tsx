"use client";

import { useActionState, useRef, useState } from "react";
import { uploadClip, type UploadState } from "@/app/clips/actions";

const initial: UploadState = {};

export function ClipUploadForm({
  matches,
  teams,
}: {
  matches: { id: string; label: string }[];
  teams: string[];
}) {
  const [state, action, pending] = useActionState(uploadClip, initial);
  const [duration, setDuration] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  function onVideoPick() {
    const file = videoRef.current?.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      setDuration(String(Math.round(probe.duration)));
    };
    probe.src = url;
  }

  return (
    <form action={action} className="space-y-5">
      <label className="fs-upload-drop block cursor-pointer">
        {preview ? (
          <video
            src={preview}
            className="h-[22rem] w-full rounded-[1rem] bg-black object-contain"
            controls
            playsInline
            muted
          />
        ) : (
          <div className="grid h-[22rem] place-items-center rounded-[1rem] border border-dashed border-[var(--line-strong)] bg-[var(--ink-raised)] text-center">
            <div>
              <span className="fs-play-burst mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--sky)] text-[var(--ink)]">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              <p className="fs-display mt-4 text-xl">Drop your clip</p>
              <p className="mt-1 text-xs text-[var(--beige-dim)]">
                Vertical looks best · MP4, WebM or MOV · up to 100 MB
              </p>
            </div>
          </div>
        )}
        <input
          ref={videoRef}
          name="video"
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          required
          onChange={onVideoPick}
          className="sr-only"
        />
      </label>
      <input type="hidden" name="duration" value={duration} />

      <input
        name="title"
        required
        maxLength={120}
        placeholder="Title — e.g. Rocket from 30 yards at Sunday league"
        className="fs-field"
      />
      <textarea
        name="caption"
        maxLength={280}
        rows={2}
        placeholder="Caption (optional)"
        className="fs-field resize-none"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs text-[var(--beige-dim)]">
          Tag a club
          <input
            name="teamTag"
            list="clip-teams"
            placeholder="Arsenal, Barcelona…"
            className="fs-field mt-1"
          />
          <datalist id="clip-teams">
            {teams.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </label>
        <label className="block text-xs text-[var(--beige-dim)]">
          Attach to a match (optional)
          <select name="matchId" className="fs-field mt-1" defaultValue="">
            <option value="">None</option>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex items-start gap-2 text-xs leading-relaxed text-[var(--beige-muted)]">
        <input type="checkbox" name="rightsAttested" value="yes" required className="mt-0.5" />
        <span>
          This is my own footage (or I have permission). It is not broadcast,
          pay-TV or other copyrighted match video. Clips that break this get removed.
        </span>
      </label>

      <button type="submit" disabled={pending} className="fs-btn-primary w-full disabled:opacity-60">
        {pending ? "Uploading…" : "Post to Clips"}
      </button>
      {state.error ? <p className="text-sm text-[var(--live)]">{state.error}</p> : null}
    </form>
  );
}
