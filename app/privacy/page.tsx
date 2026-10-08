import { PageShell } from "@/components/layout/page-shell";
import { BRAND } from "@/lib/brand";

export const metadata = {
  title: `Privacy — ${BRAND.name}`,
};

export default function PrivacyPage() {
  return (
    <PageShell>
      <h1 className="fs-display text-4xl font-semibold text-[var(--beige)]">
        Privacy
      </h1>
      <p className="mt-2 text-sm text-[var(--beige-dim)]">
        Last updated: September 16, 2026
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-[var(--beige-muted)]">
        <section>
          <h2 className="fs-display text-lg text-[var(--beige)]">
            What we collect
          </h2>
          <p className="mt-2">
            Account details you provide (email, username), profile preferences
            (such as a supported team), content you post, and basic technical
            logs needed to run the service.
          </p>
        </section>

        <section>
          <h2 className="fs-display text-lg text-[var(--beige)]">
            How we use it
          </h2>
          <p className="mt-2">
            To operate {BRAND.name}: authentication, match feeds, predictions,
            notifications, and moderation. We do not sell your personal data.
          </p>
        </section>

        <section>
          <h2 className="fs-display text-lg text-[var(--beige)]">
            Third parties
          </h2>
          <p className="mt-2">
            We use infrastructure providers (for example hosting, auth, and
            database) to run the app. Fixture and headline data may come from
            third-party sports data sources; those providers have their own
            terms. We may show ads via Google AdSense or direct sponsors; ad
            partners can set cookies or similar identifiers under their own
            policies.
          </p>
        </section>

        <section>
          <h2 className="fs-display text-lg text-[var(--beige)]">
            Your choices
          </h2>
          <p className="mt-2">
            You can update profile settings while signed in. To request account
            deletion or data removal, contact us from the email on your account.
          </p>
        </section>
      </div>
    </PageShell>
  );
}
