"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Client fallback when Supabase redirects with tokens in the URL hash
 * (happens if Site URL is "/" instead of /auth/callback).
 */
export default function AuthVerifyPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Confirming your email…");

  useEffect(() => {
    const supabase = createClient();

    async function confirm() {
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next") ?? "/feed";
      const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/feed";

      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!error) {
          router.replace(safeNext);
          return;
        }
      }

      const code = params.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          router.replace(safeNext);
          return;
        }
      }

      const tokenHash = params.get("token_hash");
      const type = params.get("type");
      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          type: type as "signup" | "email" | "recovery",
          token_hash: tokenHash,
        });
        if (!error) {
          router.replace(safeNext);
          return;
        }
      }

      setMessage("This confirmation link is invalid or has expired.");
      router.replace("/login?error=confirmation_link_failed");
    }

    void confirm();
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-950 px-4 text-center text-white">
      <p className="text-lg font-medium">{message}</p>
      <p className="text-sm text-zinc-500">You can close this tab if you are redirected.</p>
    </div>
  );
}
