"use client";

import { useState } from "react";
import type { Match } from "@/lib/matches/types";

type Prediction = {
  homeScore: number;
  awayScore: number;
  confidence: "low" | "medium" | "high";
  rationale: string;
};

export function AiPredictor({ match }: { match: Match }) {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          competition: match.competitionName,
          kickoffAt: match.kickoffAt,
        }),
      });
      const data = (await res.json()) as {
        prediction?: Prediction;
        error?: string;
        source?: string;
      };
      if (!res.ok || !data.prediction) {
        setError(data.error ?? "Could not get a model score.");
        return;
      }
      setPrediction(data.prediction);
      setSource(data.source ?? null);
    } catch {
      setError("Model desk is offline.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-[var(--line)] bg-[var(--ink)] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--beige-dim)]">
        Model desk
      </p>
      <p className="mt-1 text-sm text-[var(--beige-muted)]">
        A second opinion for {match.homeTeam} vs {match.awayTeam}. Fun only —
        your locked pick still owns Futbol IQ.
      </p>
      <button
        type="button"
        onClick={run}
        disabled={loading || match.status !== "upcoming"}
        className="fs-btn-ghost mt-4 !py-2 text-sm disabled:opacity-50"
      >
        {loading
          ? "Working…"
          : match.status !== "upcoming"
            ? "Before kickoff only"
            : "Get model score"}
      </button>

      {error ? <p className="mt-3 text-sm text-[var(--live)]">{error}</p> : null}

      {prediction ? (
        <div className="mt-4 border-t border-[var(--line)] pt-4">
          <p className="font-mono text-3xl font-semibold text-[var(--beige)]">
            {prediction.homeScore}–{prediction.awayScore}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-[var(--sky)]">
            {prediction.confidence}
            {source ? ` · ${source}` : ""}
          </p>
          <p className="mt-2 text-sm text-[var(--beige-muted)]">
            {prediction.rationale}
          </p>
        </div>
      ) : null}
    </div>
  );
}
