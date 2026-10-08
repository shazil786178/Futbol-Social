export function getAuthErrorMessage(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("rate limit") ||
    normalized.includes("over_email_send_rate_limit")
  ) {
    return "Too many emails were sent recently. Supabase limits built-in email to about 2 per hour. Wait up to an hour, check your inbox for an earlier reset link, or try again later.";
  }

  return message;
}
