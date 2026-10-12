import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { ProCheckoutButton } from "@/components/pro/pro-checkout";
import { BRAND } from "@/lib/brand";
import { getIsPro, PRO_PERKS, PRO_PRICE_LABEL, stripeConfigured } from "@/lib/pro/plan";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: `Pro — ${BRAND.name}`,
  description: "No ads, unlimited AI Pundit, training plans and more.",
};

export const dynamic = "force-dynamic";

export default async function ProPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isPro = await getIsPro(supabase, user?.id ?? null);

  return (
    <PageShell wide>
      {params.success ? (
        <div className="fs-panel fs-fade-up mb-6 border-[var(--gold)] px-5 py-4">
          <p className="fs-kicker !text-[var(--gold)]">Welcome to Pro</p>
          <p className="mt-1 text-sm text-[var(--beige-muted)]">
            Payment received. Ads are gone and the Pundit is unlimited. It can take a
            few seconds to show on your profile.
          </p>
        </div>
      ) : null}
      {params.canceled ? (
        <p className="mb-6 text-sm text-[var(--beige-dim)]">No charge made. The free app isn&apos;t going anywhere.</p>
      ) : null}

      <header className="fs-fade-up">
        <p className="fs-kicker !text-[var(--gold)]">Futbol Social Pro</p>
        <h1 className="fs-display mt-2 text-4xl sm:text-6xl">
          The whole night, <span className="fs-gold">no interruptions.</span>
        </h1>
        <p className="mt-4 max-w-xl text-base text-[var(--beige-muted)]">
          Everything in the app stays free. Pro removes the ads, unlocks the Pundit
          and the training plans, and keeps the servers on. Less than a matchday pint.
        </p>
        <div className="mt-6">
          <ProCheckoutButton
            isPro={isPro}
            configured={stripeConfigured()}
            priceLabel={PRO_PRICE_LABEL}
            signedIn={Boolean(user)}
          />
        </div>
      </header>

      <section className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 fs-fade-up-delay">
        {PRO_PERKS.map((p, i) => (
          <div key={p.title} className="fs-tile fs-tile--gold" style={{ animationDelay: `${i * 60}ms` }}>
            <p className="fs-display text-lg">{p.title}</p>
            <p className="mt-1 text-sm text-[var(--beige-muted)]">{p.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-2 fs-fade-up-delay-2">
        <div className="fs-panel px-5 py-5">
          <p className="fs-kicker">For brands</p>
          <p className="fs-display mt-2 text-xl">Sponsor a night, a Call, or a free kick</p>
          <p className="mt-2 text-sm text-[var(--beige-muted)]">
            Presenting sponsor on The Call, branded Top Bins stadiums, and placements in
            match rooms during live games. Fans are here while the ball is in play.
          </p>
          <a
            href={`mailto:${process.env.NEXT_PUBLIC_SPONSOR_EMAIL ?? "sponsors@futbolsocial.app"}?subject=${encodeURIComponent("Futbol Social sponsorship")}`}
            className="fs-btn-ghost mt-4 text-sm"
          >
            Talk to us
          </a>
        </div>
        <div className="fs-panel px-5 py-5">
          <p className="fs-kicker">Free forever</p>
          <p className="fs-display mt-2 text-xl">Scores, clips, chat, The Call, Top Bins</p>
          <p className="mt-2 text-sm text-[var(--beige-muted)]">
            Pro is a thank-you, not a paywall. If you never upgrade you still get the
            full app with a few sponsor slots.
          </p>
          <Link href="/" className="fs-btn-ghost mt-4 text-sm">
            Back home
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
