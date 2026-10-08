import { type NextRequest } from "next/server";
import { handleEmailConfirmRequest } from "@/lib/auth/handle-email-confirm";

export async function GET(request: NextRequest) {
  return handleEmailConfirmRequest(request, "/feed");
}
