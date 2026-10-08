"use client";

import { useActionState, useState } from "react";
import { sendChatMessage, type ActionState } from "@/app/matches/actions";
import { useRealtimeChat } from "@/components/realtime/hooks";
import type { ChatMessage, Match } from "@/lib/matches/types";

const initial: ActionState = {};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h`;
}

export function MatchChatRoom({
  match,
  messages,
}: {
  match: Match;
  messages: ChatMessage[];
}) {
  const [state, action, pending] = useActionState(sendChatMessage, initial);
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const liveMessages = useRealtimeChat(match.id, messages);

  async function askAi(e: React.FormEvent) {
    e.preventDefault();
    if (!aiQuestion.trim()) return;
    setAiLoading(true);
    setAiReply(null);
    try {
      const res = await fetch("/api/chat-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match.id,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          status: match.status,
          score:
            match.homeScore == null || match.awayScore == null
              ? "not yet known"
              : `${match.homeScore}–${match.awayScore}`,
          question: aiQuestion.trim(),
        }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      setAiReply(data.reply ?? data.error ?? "No response.");
    } catch {
      setAiReply("Tactics desk is offline. Try again in a moment.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <div className="fs-panel">
        <div className="border-b border-[var(--line)] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--sky)]">
            Terrace chat
          </p>
          <p className="mt-0.5 text-sm text-[var(--beige-dim)]">
            Already loud — jump in.
          </p>
        </div>
        <ul className="max-h-[420px] divide-y divide-[var(--line)] overflow-y-auto">
          {liveMessages.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-[var(--beige-dim)]">
              No posts yet. Open the stand.
            </li>
          ) : (
            liveMessages.map((msg) => (
              <li
                key={msg.id}
                className="flex gap-3 px-4 py-3 hover:bg-white/[0.02]"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--line-strong)] bg-[var(--ink)] text-[10px] font-bold text-[var(--beige-muted)]">
                  {msg.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-semibold text-[var(--beige)]">
                      @{msg.username}
                    </span>{" "}
                    <span className="text-[var(--beige-dim)]">
                      · {timeAgo(msg.createdAt)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-[var(--beige-muted)]">
                    {msg.body}
                  </p>
                </div>
              </li>
            ))
          )}
        </ul>
        <form action={action} className="border-t border-[var(--line)] p-4">
          <input type="hidden" name="matchId" value={match.id} />
          <textarea
            name="body"
            rows={2}
            maxLength={280}
            placeholder="Say something before the next chance…"
            className="fs-field resize-none"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-[var(--beige-dim)]">280 · sign in</span>
            <button
              type="submit"
              disabled={pending}
              className="fs-btn-primary !px-4 !py-1.5 text-xs"
            >
              {pending ? "…" : "Post"}
            </button>
          </div>
          {state.error ? (
            <p className="mt-2 text-xs text-[var(--live)]">{state.error}</p>
          ) : null}
        </form>
      </div>

      <aside className="border border-[var(--line)] bg-[var(--ink)] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--beige-dim)]">
          Tactics desk
        </p>
        <p className="mt-1 text-xs text-[var(--beige-muted)]">
          Lineups, offside calls, what this means for {match.homeTeam} vs{" "}
          {match.awayTeam}.
        </p>
        <form onSubmit={askAi} className="mt-3 space-y-2">
          <input
            value={aiQuestion}
            onChange={(e) => setAiQuestion(e.target.value)}
            placeholder="Was that offside?"
            className="fs-field text-xs"
          />
          <button
            type="submit"
            disabled={aiLoading}
            className="fs-btn-ghost w-full !py-2 text-xs"
          >
            {aiLoading ? "…" : "Ask"}
          </button>
        </form>
        {aiReply ? (
          <p className="mt-3 border-t border-[var(--line)] pt-3 text-xs leading-relaxed text-[var(--beige-muted)]">
            {aiReply}
          </p>
        ) : null}
      </aside>
    </div>
  );
}
