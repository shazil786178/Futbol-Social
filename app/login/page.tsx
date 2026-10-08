import Link from "next/link";
import { LoginAuthNotice } from "@/components/auth/login-auth-notice";
import { LoginForm } from "@/components/auth/login-form";
import { BRAND } from "@/lib/brand";

export const metadata = {
  title: `Sign in — ${BRAND.name}`,
  description: `Sign in to ${BRAND.name} — predict, react, and earn ${BRAND.iqLabel}.`,
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="relative flex min-h-full flex-1 items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 70% 50% at 50% 0%, rgba(159,200,232,0.14), transparent 55%),
            radial-gradient(ellipse 40% 30% at 80% 90%, rgba(228,213,191,0.08), transparent 50%)
          `,
        }}
      />

      <div className="relative w-full max-w-md fs-fade-up">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[var(--beige-dim)] transition hover:text-[var(--beige)]"
          >
            ← Back to home
          </Link>
        </div>

        <div className="border border-[var(--line-strong)] bg-[var(--ink-raised)] p-8">
          <div className="mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--beige-dim)]">
              Sign in
            </p>
            <h1 className="fs-display mt-2 text-3xl text-[var(--beige)]">
              {BRAND.name}
            </h1>
            <p className="mt-2 text-sm text-[var(--beige-muted)]">
              Protect the streak. Lock picks. Stay in the chat.
            </p>
          </div>

          <LoginAuthNotice error={error} />
          <LoginForm />

          <p className="mt-6 text-center text-sm text-[var(--beige-dim)]">
            No account yet?{" "}
            <Link
              href="/signup"
              className="font-medium text-[var(--sky)] transition hover:text-[var(--beige)]"
            >
              Create one
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-[var(--beige-dim)]">
          {BRAND.launchFocus}
        </p>
      </div>
    </div>
  );
}
