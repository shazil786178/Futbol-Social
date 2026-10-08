"use client";

import { useEffect, useRef } from "react";
import {
  adsEnabled,
  adsenseClient,
  adsenseSlot,
  SPONSOR_MAIL,
  type AdPlacement,
} from "@/lib/ads/config";

type Props = {
  placement?: AdPlacement;
  className?: string;
  /** Tighter strip between list items */
  compact?: boolean;
};

/**
 * Monetization unit: real AdSense when configured, otherwise a terrace-styled
 * sponsor placeholder so layout + direct deals work before approval.
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

  if (!adsEnabled()) return null;

  const live = Boolean(client && slot);

  return (
    <aside
      className={`fs-ad ${compact ? "fs-ad--compact" : ""} ${className}`}
      aria-label="Sponsored"
    >
      <p className="fs-ad__label">Sponsored</p>
      {live ? (
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={client!}
          data-ad-slot={slot!}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      ) : (
        <a
          href={`mailto:${SPONSOR_MAIL}?subject=${encodeURIComponent("Futbol Social sponsorship")}`}
          className="fs-ad__placeholder"
        >
          <span className="fs-ad__placeholder-title">Your brand in the stand</span>
          <span className="fs-ad__placeholder-meta">
            Reach fans during live matches · {SPONSOR_MAIL}
          </span>
        </a>
      )}
    </aside>
  );
}
