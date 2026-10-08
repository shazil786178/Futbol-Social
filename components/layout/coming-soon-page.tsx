import { PageShell } from "@/components/layout/page-shell";

export function ComingSoonPage({
  title,
  blurb,
}: {
  title: string;
  blurb: string;
}) {
  return (
    <PageShell>
      <div className="fs-fade-up mx-auto max-w-lg pt-8 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--sky)]">
          Coming soon
        </p>
        <h1 className="fs-display mt-4 text-4xl font-semibold text-[var(--beige)]">
          {title}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[var(--beige-muted)]">
          {blurb}
        </p>
      </div>
    </PageShell>
  );
}
