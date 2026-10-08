"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/** Sends users who land on any page with #access_token to /auth/verify. */
export function AuthHashHandler() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname.startsWith("/auth/")) return;

    const hash = window.location.hash;
    if (!hash.includes("access_token")) return;

    const target = `/auth/verify${window.location.search}${hash}`;
    router.replace(target);
  }, [pathname, router]);

  return null;
}
