import { PageShell } from "@/components/layout/page-shell";
import { BRAND } from "@/lib/brand";

export const metadata = {
  title: `Terms — ${BRAND.name}`,
};

export default function TermsPage() {
  return (
    <PageShell>
      <h1 className="fs-display text-4xl font-semibold text-[var(--beige)]">
        Terms of use
      </h1>
      <p className="mt-2 text-sm text-[var(--beige-dim)]">
        Last updated: September 16, 2026
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-[var(--beige-muted)]">
        <section>
          <h2 className="fs-display text-lg text-[var(--beige)]">
            Independent fan platform
          </h2>
          <p className="mt-2">
            {BRAND.name} is an independent social product for football fans. We
            are not affiliated with, sponsored by, or endorsed by FIFA, UEFA,
            CONCACAF, any national association, club, league, tournament,
            broadcaster, or news publisher. Names of clubs, competitions, and
            players appear only as factual references.
          </p>
        </section>

        <section>
          <h2 className="fs-display text-lg text-[var(--beige)]">
            Your content
          </h2>
          <p className="mt-2">
            You keep ownership of content you post. By uploading, you confirm
            you have the rights to share it, it does not include unauthorized
            broadcast or copyrighted match footage, and it does not infringe
            anyone else’s rights. You grant us a license to host and display that
            content on the service.
          </p>
        </section>

        <section>
          <h2 className="fs-display text-lg text-[var(--beige)]">
            Prohibited uploads
          </h2>
          <p className="mt-2">
            Do not upload official broadcast highlights, pay-TV clips, club or
            league logos as your own branding, deepfakes, or content that
            impersonates athletes, clubs, or organizations.
          </p>
        </section>

        <section>
          <h2 className="fs-display text-lg text-[var(--beige)]">
            News headlines
          </h2>
          <p className="mt-2">
            News items are short headlines and teasers that link out to the
            original publisher. We do not republish full articles. Third-party
            publishers retain their rights; we are not affiliated with them.
          </p>
        </section>

        <section>
          <h2 className="fs-display text-lg text-[var(--beige)]">
            Takedowns
          </h2>
          <p className="mt-2">
            If you believe content on {BRAND.name} infringes your rights, contact
            us with the URL and a description of the claim. We may remove content
            and suspend accounts that repeatedly violate these terms.
          </p>
        </section>

        <section>
          <h2 className="fs-display text-lg text-[var(--beige)]">
            Advertising
          </h2>
          <p className="mt-2">
            {BRAND.name} may display third-party ads and sponsorship units. Ads
            are labeled; we do not sell personal account data to advertisers.
          </p>
        </section>

        <section>
          <h2 className="fs-display text-lg text-[var(--beige)]">
            No warranties
          </h2>
          <p className="mt-2">
            The service is provided as-is. Scores, fixtures, and predictions are
            for entertainment and may be delayed or incomplete.
          </p>
        </section>
      </div>
    </PageShell>
  );
}
