"use client";

import { useEffect, useMemo, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationActionState,
} from "@/app/notifications/actions";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/lib/matches/types";

const initial: NotificationActionState = {};

export function NotificationList({
  userId,
  initialNotifications,
}: {
  userId: string;
  initialNotifications: Notification[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState(initialNotifications);
  const [, markReadAction, markPending] = useActionState(
    markNotificationRead,
    initial,
  );

  useEffect(() => {
    setItems(initialNotifications);
  }, [initialNotifications]);

  useEffect(() => {
    const channel = supabase.channel(
      `notifications:${userId}:${crypto.randomUUID()}`,
    );

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const row = payload.new as {
          id: string;
          title: string;
          body: string;
          read_at: string | null;
          created_at: string;
        };
        setItems((prev) => [
          {
            id: row.id,
            title: row.title,
            body: row.body,
            readAt: row.read_at,
            createdAt: row.created_at,
          },
          ...prev,
        ]);
      },
    );

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  async function markAllRead() {
    await markAllNotificationsRead();
    setItems((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
    );
    router.refresh();
  }

  const unread = items.filter((n) => !n.readAt).length;

  return (
    <div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-[var(--beige-muted)]">
          {unread > 0 ? `${unread} unread` : "All caught up"}
        </p>
        {unread > 0 ? (
          <button
            type="button"
            onClick={markAllRead}
            className="text-xs font-semibold uppercase tracking-wider text-[var(--sky)] hover:text-[var(--beige)]"
          >
            Mark all read
          </button>
        ) : null}
      </div>

      <ul className="mt-6">
        {items.length === 0 ? (
          <li className="border border-[var(--line)] px-4 py-6 text-sm text-[var(--beige-dim)]">
            Nothing yet — lock in a prediction and check back after full time.
          </li>
        ) : (
          items.map((n) => (
            <li
              key={n.id}
              className={`fs-board px-4 py-4 ${
                n.readAt ? "opacity-70" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  {!n.readAt ? (
                    <span className="mb-1 inline-block text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--sky)]">
                      New
                    </span>
                  ) : null}
                  <p className="font-medium text-[var(--beige)]">{n.title}</p>
                  <p className="mt-1 text-sm text-[var(--beige-muted)]">
                    {n.body}
                  </p>
                  <p className="mt-2 text-xs text-[var(--beige-dim)]">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                {!n.readAt ? (
                  <form action={markReadAction}>
                    <input type="hidden" name="id" value={n.id} />
                    <button
                      type="submit"
                      disabled={markPending}
                      className="shrink-0 border border-[var(--line-strong)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--beige-muted)] hover:border-[var(--sky)] hover:text-[var(--beige)]"
                    >
                      Read
                    </button>
                  </form>
                ) : null}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
