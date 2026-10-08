"use client";

import Script from "next/script";
import { adsenseClient } from "@/lib/ads/config";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/** Loads Google AdSense once when a publisher ID is configured. */
export function AdsenseLoader() {
  const client = adsenseClient();
  if (!client) return null;

  return (
    <Script
      id="adsense-loader"
      async
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
      crossOrigin="anonymous"
    />
  );
}
