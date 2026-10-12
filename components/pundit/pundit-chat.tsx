"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { askPundit, type PunditTurn } from "@/app/pundit/actions";

export function PunditChat({
  suggestions,
  signedIn,
  isPro,
  freePerDay,
}: {
  suggestions: string[];
  signedIn: boolean;
  isPro: boolean;
  /** Present when an optional model key is configured. Answers work either way. */
  aiLive?: boolean;
  freePerDay: number;
}) {
  const [turns, setTurns] = useState<PunditTurn[]>([]);
  const [input, setInput] = useState("");
  const [remaining, setRemaining] = useState<number | null>(isPro ? null : freePerDay);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, pending]);

  function send(text: string) {
    const q = text.trim();
    if (!q || pending) return;
    setError(null);
    const history = turns;
    setTurns((t) => [...t, { role: "user", content: q }]);
    setInput("");
    start(async () => {
      const res = await askPundit(history, q);
      if (res.error) {
        setError(res.error);
        if (res.remaining != null) setRemaining(res.remaining);
        return;
      }
      setTurns((t) => [...t, { role: "assistant", content: res.answer }]);
      if (res.remaining != null) setRemaining(res.remaining);
    });
  }

  return (
    <div className="fs-pundit">
      <div className="fs-pundit__log">
        {turns.length === 0 ? (
          <div className="fs-fade-up">
            <p className="text-sm text-[var(--beige-muted)]">
              Ask about tonight, your club, who to captain, or why that result
              happened. Answers come from the live scores and fixtures already in
              the app — no extra key.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="fs-chip fs-chip--ghost hover:border-[var(--sky)] hover:text-[var(--beige)]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {turns.map((t, i) => (
          <div
            key={i}
            className={`fs-pundit__msg fs-pundit__msg--${t.role} fs-fade-up`}
          >
            {t.role === "assistant" ? <span className="fs-pundit__avatar">P</span> : null}
            <div className="fs-pundit__bubble">
              {t.content.split("\n").map((line, j) => (
                <p key={j}>{line}</p>
              ))}
            </div>
          </div>
        ))}

        {pending ? (
          <div className="fs-pundit__msg fs-pundit__msg--assistant">
            <span className="fs-pundit__avatar">P</span>
            <div className="fs-pundit__bubble fs-pundit__typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="mt-3 text-sm text-[var(--live)]">
            {error}{" "}
            {/Pro/.test(error) ? (
              <Link href="/pro" className="text-[var(--gold)] underline">
                See Pro →
              </Link>
            ) : null}
          </p>
        ) : null}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="fs-pundit__composer"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={signedIn ? "Ask the Pundit…" : "Ask the Pundit (sign in for full answers)…"}
          maxLength={600}
          className="fs-field flex-1"
        />
        <button type="submit" disabled={pending || !input.trim()} className="fs-btn-primary disabled:opacity-50">
          Ask
        </button>
      </form>
      <p className="mt-2 text-[11px] text-[var(--beige-dim)]">
        {isPro
          ? "Pro · unlimited questions"
          : remaining != null
            ? `${remaining} of ${freePerDay} free questions left today · `
            : ""}
        {!isPro ? (
          <Link href="/pro" className="text-[var(--gold)]">
            Go Pro for unlimited
          </Link>
        ) : null}
      </p>
    </div>
  );
}
