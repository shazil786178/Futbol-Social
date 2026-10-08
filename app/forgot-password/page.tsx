import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { BRAND } from "@/lib/brand";

export const metadata = {
  title: `Reset password — ${BRAND.name}`,
  description: `Request a password reset link for your ${BRAND.name} account.`,
};

export default function ForgotPasswordPage() {
  return (
    <div className="relative flex min-h-full flex-1 items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 70% 50% at 50% 0%, rgba(126,184,217,0.12), transparent 55%),
            radial-gradient(ellipse 40% 30% at 80% 90%, rgba(228,213,191,0.06), transparent 50%)
          `,
        }}
      />

      <div className="relative w-full max-w-md fs-fade-up">
        <div className="mb-8 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-[var(--beige-dim)] transition hover:text-[var(--beige)]"
          >
            ← Back to sign in
          </Link>
        </div>

        <div className="border border-[var(--line-strong)] bg-[var(--ink-raised)] p-8">
          <div className="mb-8">
            <p className="fs-kicker">Account</p>
            <h1 className="fs-display mt-2 text-3xl text-[var(--beige)]">
              Reset password
            </h1>
            <p className="mt-2 text-sm text-[var(--beige-muted)]">
              Enter your email and we&apos;ll send a reset link.
            </p>
          </div>

          <ForgotPasswordForm />
        </div>

        <p className="mt-6 text-center text-xs text-[var(--beige-dim)]">
          {BRAND.launchFocus}
        </p>
      </div>
    </div>
  );
}
