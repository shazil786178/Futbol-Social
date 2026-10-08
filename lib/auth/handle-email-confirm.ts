import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";

function safeNext(next: string | null, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }
  return next;
}

function defaultNextForType(type: EmailOtpType | null): string {
  if (type === "recovery") return "/reset-password";
  if (type === "signup" || type === "email") return "/welcome";
  return "/";
}

function errorRedirect(origin: string, code: string) {
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(code)}`,
  );
}

export async function handleEmailConfirmRequest(
  request: NextRequest,
  fallbackNext?: string,
) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const authError = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (authError) {
    const message =
      errorDescription?.replace(/\+/g, " ") ?? "Email confirmation failed.";
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(message)}`,
    );
  }

  const next = safeNext(
    searchParams.get("next"),
    fallbackNext ?? defaultNextForType(type),
  );

  if (code) {
    const redirectResponse = NextResponse.redirect(`${origin}${next}`);
    const supabase = createRouteHandlerClient(request, redirectResponse);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return redirectResponse;
    }

    return errorRedirect(origin, error.message);
  }

  if (tokenHash && type) {
    const redirectResponse = NextResponse.redirect(`${origin}${next}`);
    const supabase = createRouteHandlerClient(request, redirectResponse);
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      return redirectResponse;
    }

    return errorRedirect(origin, error.message);
  }

  return errorRedirect(origin, "confirmation_link_failed");
}
