import { adsenseClient } from "@/lib/ads/config";

/** Required by Google AdSense once your publisher ID is live. */
export function GET() {
  const client = adsenseClient();
  const pub = client?.replace(/^ca-/, "") ?? null;
  const body = pub
    ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`
    : "# Add NEXT_PUBLIC_ADSENSE_CLIENT to enable ads.txt for AdSense\n";

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
