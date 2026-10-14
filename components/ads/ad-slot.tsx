"use client";

import { useEffect, useRef } from "react";
import {
  adsEnabled,
  adsenseClient,
  adsenseSlot,
  type AdPlacement,
} from "@/lib/ads/config";

type Props = {
  placement?: AdPlacement;
  className?: string;
  /** Tighter strip between list items */
  compact?: boolean;
};

/**
 * Real AdSense unit. Hidden until a client id and slot are set, so launch
 * pages do not show an empty sponsor box.
 */
export function AdSlot({
  placement = "inline",
  className = "",
  compact = false,
}: Props) {
  const pushed = useRef(false);
  const client = adsenseClient();
  const slot = adsenseSlot(placement);

  useEffect(() => {
    if (!client || !slot || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      /* AdSense not ready / blocked */
    }
  }, [client, slot]);

  const live = Boolean(client && slot);
  if (!adsEnabled() || !live) return null;

  return (
    <aside
      className={`fs-ad ${compact ? "fs-ad--compact" : ""} ${className}`}
      aria-label="Sponsored"
    >
      <p className="fs-ad__label">Sponsored</p>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={client!}
        data-ad-slot={slot!}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
