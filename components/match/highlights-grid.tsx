import type { Highlight } from "@/lib/matches/types";

export function HighlightsGrid({
  highlights,
  showMatch = false,
  matchLabel,
}: {
  highlights: Highlight[];
  showMatch?: boolean;
  matchLabel?: (id: string) => string;
}) {
  if (highlights.length === 0) {
    return (
      <p className="text-sm text-[var(--beige-dim)]">
        No official highlights linked yet — they sync after full-time.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {highlights.map((clip) => (
        <article key={clip.id} className="fs-panel overflow-hidden">
          {clip.embedUrl ? (
            <div className="relative aspect-video w-full bg-black">
              <iframe
                src={clip.embedUrl}
                title={clip.title}
                className="absolute inset-0 h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
          ) : clip.videoUrl ? (
            <video
              src={clip.videoUrl}
              controls
              playsInline
              preload="metadata"
              className="aspect-video w-full bg-black object-cover"
            />
          ) : (
            <div className="flex aspect-video items-center justify-center bg-[var(--ink)]">
              <span className="border border-[var(--line-strong)] px-3 py-1 text-sm font-bold text-[var(--beige)]">
                {clip.thumbnailLabel}
              </span>
            </div>
          )}
          <div className="p-4">
            {showMatch && matchLabel && clip.matchId ? (
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--sky)]">
                {matchLabel(clip.matchId)}
              </p>
            ) : clip.competitionLabel ? (
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--sky)]">
                {clip.competitionLabel}
              </p>
            ) : null}
            <h3 className="mt-1 text-sm font-medium text-[var(--beige)]">
              {clip.title}
            </h3>
            <p className="mt-2 text-xs text-[var(--beige-dim)]">
              {clip.source === "youtube" ? "YouTube · " : ""}
              {clip.duration}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}
