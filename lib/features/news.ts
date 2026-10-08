import { createClient } from "@/lib/supabase/server";

export type NewsArticle = {
  id: string;
  title: string;
  summary: string | null;
  sourceName: string;
  sourceUrl: string | null;
  imageUrl: string | null;
  leagueHint: string | null;
  publishedAt: string;
  commentCount: number;
};

export type NewsComment = {
  id: string;
  articleId: string;
  userId: string;
  username: string;
  parentId: string | null;
  content: string;
  createdAt: string;
};

export async function listNewsArticles(limit = 40): Promise<NewsArticle[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("news_articles")
    .select("id, title, summary, source_name, source_url, image_url, league_hint, published_at")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  const ids = data.map((a) => a.id);
  const counts = new Map<string, number>();
  if (ids.length) {
    const { data: comments } = await supabase
      .from("news_comments")
      .select("article_id")
      .in("article_id", ids);
    for (const c of comments ?? []) {
      counts.set(c.article_id, (counts.get(c.article_id) ?? 0) + 1);
    }
  }

  return data.map((a) => ({
    id: a.id,
    title: a.title,
    summary: a.summary,
    sourceName: a.source_name,
    sourceUrl: a.source_url,
    imageUrl: a.image_url,
    leagueHint: a.league_hint,
    publishedAt: a.published_at,
    commentCount: counts.get(a.id) ?? 0,
  }));
}

export async function getNewsArticle(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("news_articles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    title: data.title,
    summary: data.summary as string | null,
    body: data.body as string | null,
    sourceName: data.source_name as string,
    sourceUrl: data.source_url as string | null,
    imageUrl: data.image_url as string | null,
    leagueHint: data.league_hint as string | null,
    publishedAt: data.published_at as string,
  };
}

export async function listNewsComments(articleId: string): Promise<NewsComment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("news_comments")
    .select("id, article_id, user_id, parent_id, content, created_at")
    .eq("article_id", articleId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  const userIds = [...new Set(data.map((c) => c.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", userIds);
  const names = new Map((profiles ?? []).map((p) => [p.id, p.username]));

  return data.map((c) => ({
    id: c.id,
    articleId: c.article_id,
    userId: c.user_id,
    username: names.get(c.user_id) ?? "fan",
    parentId: c.parent_id,
    content: c.content,
    createdAt: c.created_at,
  }));
}
