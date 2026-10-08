import Link from "next/link";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { BRAND, COMPETITIONS } from "@/lib/brand";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: `Choose new password — ${BRAND.name}`,
  description: `Set a new password for your ${BRAND.name} account.`,
};

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=reset_link_expired");
  }

  return (
    <div className="relative flex min-h-full flex-1 items-center justify-center overflow-hidden bg-zinc-950 px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/40 via-zinc-950 to-zinc-950"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-amber-400/10 blur-3xl"
      />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
          >
            <span aria-hidden>←</span>
            Back to sign in
          </Link>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-8 shadow-2xl backdrop-blur-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600/20 ring-1 ring-emerald-500/30">
              <span className="text-2xl" aria-hidden>
                ⚽
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Choose a new password
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Enter and confirm your new password below.
            </p>
          </div>

          <ResetPasswordForm />
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600">
          {BRAND.launchFocus}
        </p>
      </div>
    </div>
  );
}
