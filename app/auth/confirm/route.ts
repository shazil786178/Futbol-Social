import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";
import { handleEmailConfirmRequest } from "@/lib/auth/handle-email-confirm";

export async function GET(request: NextRequest) {
  const type = new URL(request.url).searchParams.get("type") as EmailOtpType | null;
  const fallback = type === "recovery" ? "/reset-password" : "/feed";
  return handleEmailConfirmRequest(request, fallback);
}
