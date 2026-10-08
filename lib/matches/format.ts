import type { Match, MatchStatus } from "./types";

/**
 * Trust the synced status. The clock only cleans up obviously stale rows —
 * it never promotes a game to "live" on its own (that produced fake 0–0s).
 */
export function resolveMatchStatus(
  kickoffAt: string,
  storedStatus: MatchStatus | string,
): MatchStatus {
  const minutesSinceKickoff =
    (Date.now() - new Date(kickoffAt).getTime()) / 60000;

  if (storedStatus === "finished") return "finished";
  if (storedStatus === "live") {
    if (minutesSinceKickoff < -15) return "upcoming";
    return minutesSinceKickoff >= 240 ? "finished" : "live";
  }
  if (minutesSinceKickoff >= 180) return "finished";
  return "upcoming";
}

/** Kicked off per the schedule but the feed hasn't confirmed it yet. */
export function isAwaitingKickoffUpdate(
  match: Pick<Match, "status" | "kickoffAt">,
): boolean {
  if (match.status !== "upcoming") return false;
  const mins = (Date.now() - new Date(match.kickoffAt).getTime()) / 60000;
  return mins >= 0 && mins < 180;
}

/** Kick-off is later than now (minus an optional grace window). */
export function kicksOffAfterNow(kickoffAt: string, graceMs = 0): boolean {
  return new Date(kickoffAt).getTime() > Date.now() - graceMs;
}

/** Upcoming game within ~20 min of kick-off or still waiting on the feed. */
export function isNearKickoff(match: Pick<Match, "status" | "kickoffAt">): boolean {
  if (match.status !== "upcoming") return false;
  const mins = (Date.now() - new Date(match.kickoffAt).getTime()) / 60000;
  return mins > -20 && mins < 180;
}

export function hasScore(
  match: Pick<Match, "homeScore" | "awayScore">,
): boolean {
  return match.homeScore != null && match.awayScore != null;
}

export function withResolvedStatus<T extends Match>(match: T): T {
  return {
    ...match,
    status: resolveMatchStatus(match.kickoffAt, match.status),
  };
}

export function formatKickoff(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatScore(
  match: Pick<Match, "status" | "homeScore" | "awayScore">,
): string {
  if (match.status === "upcoming") return "vs";
  if (match.homeScore == null || match.awayScore == null) return "– : –";
  return `${match.homeScore}–${match.awayScore}`;
}

/** LIVE 67' · FT · Kick-off 20:00 */
export function statusClockLabel(
  match: Pick<Match, "status" | "minute" | "kickoffAt">,
): string {
  if (match.status === "finished") return "FT";
  if (match.status === "upcoming") {
    return isAwaitingKickoffUpdate(match)
      ? "Kicking off"
      : formatKickoffTime(match.kickoffAt);
  }
  return match.minute != null ? `LIVE ${match.minute}'` : "LIVE";
}

export function formatKickoffTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  if (sameDay) return time;
  return `${d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })} · ${time}`;
}

export function statusLabel(status: MatchStatus): string {
  switch (status) {
    case "live":
      return "Live";
    case "finished":
      return "FT";
    default:
      return "Upcoming";
  }
}

export function statusTone(status: MatchStatus): string {
  switch (status) {
    case "live":
      return "fs-status fs-status--live";
    case "finished":
      return "fs-status fs-status--finished";
    default:
      return "fs-status fs-status--upcoming";
  }
}

export function canPredict(match: Match): boolean {
  return (
    resolveMatchStatus(match.kickoffAt, match.status) === "upcoming" &&
    new Date(match.kickoffAt).getTime() > Date.now()
  );
}
