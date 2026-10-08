import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { NewsThread } from "@/components/news/news-thread";
import { BRAND } from "@/lib/brand";
import { getNewsArticle, listNewsComments } from "@/lib/features/news";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await getNewsArticle(id);
  return { title: article ? `${article.title} — ${BRAND.name}` : BRAND.name };
}

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await getNewsArticle(id);
  if (!article) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const comments = await listNewsComments(id);

  return (
    <PageShell>
      <Link
        href="/news"
        className="text-xs uppercase tracking-wider text-[var(--beige-dim)] hover:text-[var(--sky)]"
      >
        ← All news
      </Link>
      <header className="mt-4 border-b border-[var(--line-strong)] pb-6">
        <p className="fs-kicker !text-[var(--sky)]">
          {article.sourceName}
          {article.leagueHint ? ` · ${article.leagueHint}` : ""}
        </p>
        <h1 className="fs-display mt-2 text-3xl text-[var(--beige)] sm:text-4xl">
          {article.title}
        </h1>
        <p className="mt-2 text-sm text-[var(--beige-dim)]">
          {new Date(article.publishedAt).toLocaleString()}
        </p>
      </header>

      {article.summary ? (
        <p className="mt-6 text-base leading-relaxed text-[var(--beige-muted)]">
          {article.summary.length > 280
            ? `${article.summary.slice(0, 280)}…`
            : article.summary}
        </p>
      ) : null}
      {article.sourceUrl ? (
        <a
          href={article.sourceUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-4 inline-block text-sm font-medium text-[var(--sky)] hover:text-[var(--beige)]"
        >
          Read full story on {article.sourceName} →
        </a>
      ) : null}
      <p className="mt-3 text-xs text-[var(--beige-dim)]">
        Headline/teaser only for fan discussion. {BRAND.name} is not affiliated
        with {article.sourceName}.
      </p>

      <NewsThread
        articleId={id}
        comments={comments}
        signedIn={Boolean(user)}
      />
    </PageShell>
  );
}
