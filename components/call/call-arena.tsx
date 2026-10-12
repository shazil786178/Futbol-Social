"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { castCallVote, type CallVoteState } from "@/app/call/actions";
import type { CallBoard } from "@/lib/call/today";
import { withEmbedPlayback } from "@/lib/football-api/scorebat";

function formatLeft(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 0) return `${m}m left`;
  return `${total}s left`;
}

export function CallArena({
  board,
  signedIn,
}: {
  board: CallBoard;
  signedIn: boolean;
}) {
  const [left, setLeft] = useState(board.secondsLeft);
  const [state, action, pending] = useActionState<CallVoteState, FormData>(
    castCallVote,
    {},
  );

  useEffect(() => {
    const id = window.setInterval(
      () => setLeft((n) => Math.max(0, n - 1)),
      1000,
    );
    return () => window.clearInterval(id);
  }, []);

  const total = board.votesA + board.votesB;
  const pctA = total === 0 ? 50 : Math.round((board.votesA / total) * 100);
  const pctB = 100 - pctA;
  const revealed = Boolean(board.myChoice) || board.closed;
  const winner =
    board.votesA === board.votesB ? null : board.votesA > board.votesB ? "a" : "b";

  const clock = useMemo(() => formatLeft(left), [left]);

  return (
    <div className="fs-call">
      <header className="text-center">
        <p className="fs-kicker fs-call-kicker">The Call · closes midnight UTC</p>
        <h1 className="fs-display mt-3 text-4xl sm:text-6xl">{board.call.question}</h1>
        <p className="mt-3 text-sm text-[var(--beige-muted)]">
          {board.closed ? "Locked. This is how the planet split." : clock}
          {total > 0 ? ` · ${total} fan${total === 1 ? "" : "s"}` : ""}
        </p>
      </header>

      {board.call.clipEmbedUrl ? (
        <div className="fs-call-tape mt-8 overflow-hidden">
          <iframe
            src={withEmbedPlayback(board.call.clipEmbedUrl, {
              autoplay: false,
              sound: true,
            })}
            title={board.call.clipTitle ?? "Tonight's tape"}
            className="h-full w-full border-0"
            allow="autoplay; fullscreen; encrypted-media"
            allowFullScreen
          />
        </div>
      ) : null}

      <form action={action} className="mt-8 grid gap-3 sm:grid-cols-2">
        {(["a", "b"] as const).map((side) => {
          const label = side === "a" ? board.call.optionA : board.call.optionB;
          const pct = side === "a" ? pctA : pctB;
          const votes = side === "a" ? board.votesA : board.votesB;
          const mine = board.myChoice === side;
          const won = revealed && winner === side;
          return (
            <button
              key={side}
              type="submit"
              name="choice"
              value={side}
              disabled={pending || board.closed || Boolean(board.myChoice) || !signedIn}
              className={`fs-call-side ${side === "a" ? "fs-call-side--a" : "fs-call-side--b"} ${mine ? "fs-call-side--mine" : ""} ${won ? "fs-call-side--won" : ""}`}
            >
              <span className="fs-call-side__name">{label}</span>
              {revealed ? (
                <>
                  <span className="fs-score mt-2 block text-5xl">{pct}%</span>
                  <span className="mt-1 block text-xs opacity-80">{votes} votes</span>
                  <span
                    className="fs-call-bar"
                    style={{ transform: `scaleX(${pct / 100})` }}
                  />
                </>
              ) : (
                <span className="mt-2 block text-sm opacity-80">Tap to lock</span>
              )}
            </button>
          );
        })}
      </form>

      {!signedIn ? (
        <p className="mt-5 text-center text-sm text-[var(--beige-muted)]">
          <Link href="/signup" className="text-[var(--sky)]">
            Join
          </Link>{" "}
          or{" "}
          <Link href="/login" className="text-[var(--sky)]">
            sign in
          </Link>{" "}
          — The Call only counts if your name is on it.
        </p>
      ) : null}

      {state.error ? (
        <p className="mt-4 text-center text-sm text-[var(--live)]">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="mt-4 text-center text-sm text-[var(--sky)]">{state.success}</p>
      ) : null}

      {board.call.matchId ? (
        <p className="mt-8 text-center">
          <Link
            href={`/matches/${board.call.matchId}?tab=chat`}
            className="text-sm text-[var(--sky)]"
          >
            Argue it in the match room →
          </Link>
        </p>
      ) : (
        <p className="mt-8 text-center">
          <Link href="/clips" className="text-sm text-[var(--sky)]">
            Watch tonight&apos;s tape →
          </Link>
        </p>
      )}
    </div>
  );
}
