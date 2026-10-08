"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function UnreadBadge({
  userId,
  initialCount,
}: {
  userId: string;
  initialCount: number;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    // Unique name avoids Strict Mode reuse of an already-subscribed channel
    const channel = supabase.channel(`unread:${userId}:${crypto.randomUUID()}`);

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      () => setCount((c) => c + 1),
    );

    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const row = payload.new as { read_at: string | null };
        if (row.read_at) setCount((c) => Math.max(0, c - 1));
      },
    );

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  return (
    <Link
      href="/notifications"
      className="relative hidden rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--beige-muted)] transition hover:bg-white/5 hover:text-[var(--beige)] sm:inline"
    >
      Alerts
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-md bg-[var(--live)] px-1 text-[10px] font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
  );
}
