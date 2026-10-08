/** Public ad config — set in .env.local / Vercel. */

export function adsEnabled() {
  if (process.env.NEXT_PUBLIC_ADS_ENABLED === "false") return false;
  // Show slots whenever ads are not explicitly off (placeholders until AdSense is live)
  return process.env.NEXT_PUBLIC_ADS_ENABLED !== "0";
}

export function adsenseClient() {
  const id = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();
  return id && id.startsWith("ca-pub-") ? id : null;
}

export type AdPlacement = "banner" | "inline" | "feed" | "sidebar";

export function adsenseSlot(placement: AdPlacement): string | null {
  const map: Record<AdPlacement, string | undefined> = {
    banner: process.env.NEXT_PUBLIC_ADSENSE_SLOT_BANNER,
    inline: process.env.NEXT_PUBLIC_ADSENSE_SLOT_INLINE,
    feed: process.env.NEXT_PUBLIC_ADSENSE_SLOT_FEED,
    sidebar: process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR,
  };
  const slot = map[placement]?.trim();
  return slot || null;
}

export const SPONSOR_MAIL =
  process.env.NEXT_PUBLIC_SPONSOR_EMAIL?.trim() || "sponsors@futbolsocial.app";
