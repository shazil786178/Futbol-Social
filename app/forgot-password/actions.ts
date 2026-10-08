"use server";

import { redirect } from "next/navigation";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { getSiteUrl } from "@/lib/auth/site-url";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ForgotPasswordState = {
  error?: string;
  success?: string;
};

/**
 * Prefer an instant recovery session (no email) when the service role is
 * available — avoids Supabase’s ~2 emails/hour built-in SMTP limit on localhost.
 * Falls back to email when admin isn’t configured.
 */
export async function requestPasswordReset(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = formData.get("email")?.toString().trim();
  if (!email) {
    return { error: "Email is required." };
  }

  const siteUrl = await getSiteUrl();
  const redirectTo = `${siteUrl}/auth/callback?next=/reset-password`;

  if (hasAdminClient()) {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });

      if (error) {
        // Unknown email — don’t leak; same success copy as email path
        if (/not found|unable to find|user not found/i.test(error.message)) {
          return {
            success:
              "If an account exists for that email, you can set a new password next.",
          };
        }
        return { error: getAuthErrorMessage(error.message) };
      }

      const tokenHash = data.properties?.hashed_token;
      if (tokenHash) {
        const supabase = await createClient();
        const { error: otpError } = await supabase.auth.verifyOtp({
          type: "recovery",
          token_hash: tokenHash,
        });
        if (!otpError) {
          redirect("/reset-password");
        }
      }

      // Last resort: send them through Supabase’s action link
      if (data.properties?.action_link) {
        redirect(data.properties.action_link);
      }
    } catch (err) {
      // redirect() throws — rethrow
      if (
        err &&
        typeof err === "object" &&
        "digest" in err &&
        String((err as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
      ) {
        throw err;
      }
      console.error("Instant recovery failed:", err);
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    return { error: getAuthErrorMessage(error.message) };
  }

  return {
    success:
      "If an account exists for that email, we sent a reset link. Open it in this same browser. Supabase only allows a couple of emails per hour — if you already requested one, use that link instead.",
  };
}
