import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { BRAND } from "@/lib/brand";
import { listNewsArticles } from "@/lib/features/news";

export const metadata = {
  title: `News — ${BRAND.name}`,
  description: "Football news with fan discussion threads.",
};

export default async function NewsPage() {
  const articles = await listNewsArticles();

  return (
    <PageShell wide>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--beige-dim)]">
        Wire
      </p>
      <h1 className="fs-display mt-2 text-4xl text-[var(--beige)]">News</h1>
      <p className="mt-2 max-w-lg text-sm text-[var(--beige-muted)]">
        Headlines with outbound links — we don’t republish full articles. Not
        affiliated with any publisher.
      </p>

      {articles.length === 0 ? (
        <p className="mt-8 border border-[var(--line-strong)] px-4 py-3 text-sm text-[var(--beige-muted)]">
          No articles yet. Run{" "}
          <code className="text-[var(--sky)]">npm run sync</code> after
          migration{" "}
          <code className="text-[var(--sky)]">010_follows_and_news.sql</code>.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-[var(--line)] border-t border-[var(--line-strong)]">
          {articles.map((a) => (
            <li key={a.id}>
              <Link
                href={`/news/${a.id}`}
                className="block py-5 transition hover:bg-white/[0.02]"
              >
                <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-[var(--beige-dim)]">
                  <span className="text-[var(--sky)]">{a.sourceName}</span>
                  {a.leagueHint ? <span>{a.leagueHint}</span> : null}
                  <span>{new Date(a.publishedAt).toLocaleString()}</span>
                  <span>{a.commentCount} comments</span>
                </div>
                <h2 className="mt-2 text-lg font-medium text-[var(--beige)]">
                  {a.title}
                </h2>
                {a.summary ? (
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--beige-muted)]">
                    {a.summary}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
