const AUTH_ERROR_MESSAGES: Record<string, string> = {
  reset_link_failed:
    "That reset link could not be verified. Request a new one and open it in the same browser you used to request it.",
  reset_link_expired:
    "Your reset link expired or was already used. Request a new password reset link.",
  confirmation_link_failed:
    "That confirmation link is invalid or expired. Try signing in — if your account was already confirmed, your password still works.",
  auth: "Sign-in from your email link failed. Request a new reset link instead of signing in here.",
};

function getAuthErrorMessage(error: string): string {
  return AUTH_ERROR_MESSAGES[error] ?? decodeURIComponent(error);
}

export function LoginAuthNotice({ error }: { error?: string }) {
  if (!error) {
    return null;
  }

  return (
    <p
      role="alert"
      className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
    >
      {getAuthErrorMessage(error)}
    </p>
  );
}
