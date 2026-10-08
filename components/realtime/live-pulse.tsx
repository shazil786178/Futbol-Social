"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useRealtimeMatchScores } from "@/components/realtime/hooks";

const POLL_MS = 30_000;

/**
 * Keeps scores honest without a reload: asks the server to pull fresh ESPN
 * scores while games are on, and re-renders when the matches table changes.
 */
export function LivePulse({ active }: { active: boolean }) {
  const router = useRouter();
  const debounce = useRef<number | null>(null);

  const refresh = useCallback(() => {
    if (debounce.current) window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => router.refresh(), 1200);
  }, [router]);

  useRealtimeMatchScores(refresh);

  useEffect(() => {
    let cancelled = false;

    const pull = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/live-scores", { method: "POST" });
        const data = (await res.json()) as { updated?: number };
        if (!cancelled && (active || (data.updated ?? 0) > 0)) refresh();
      } catch {
        /* offline — next tick will retry */
      }
    };

    void pull();
    if (!active) return () => {
      cancelled = true;
    };

    const id = window.setInterval(pull, POLL_MS);
    document.addEventListener("visibilitychange", pull);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", pull);
    };
  }, [active, refresh]);

  return null;
}
