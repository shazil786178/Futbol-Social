"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage } from "@/lib/matches/types";

export function useRealtimeChat(
  matchId: string,
  initialMessages: ChatMessage[],
) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState(initialMessages);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    const channel = supabase.channel(`chat:${matchId}:${crypto.randomUUID()}`);

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `match_id=eq.${matchId}`,
      },
      () => {
        router.refresh();
      },
    );

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, matchId, router]);

  return messages;
}

export function useRealtimeMatchScores(onUpdate: () => void) {
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const channel = supabase.channel(`live-matches:${crypto.randomUUID()}`);

    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "matches" },
      () => onUpdate(),
    );

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, onUpdate]);
}
