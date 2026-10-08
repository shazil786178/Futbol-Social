"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type NewsActionState = { error?: string; success?: string };

export async function postNewsComment(
  _prev: NewsActionState,
  formData: FormData,
): Promise<NewsActionState> {
  const articleId = formData.get("articleId")?.toString();
  const content = formData.get("content")?.toString().trim();
  const parentId = formData.get("parentId")?.toString() || null;

  if (!articleId || !content) return { error: "Write a comment first." };
  if (content.length > 2000) return { error: "Keep it under 2000 characters." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to join the thread." };

  const { error } = await supabase.from("news_comments").insert({
    article_id: articleId,
    user_id: user.id,
    parent_id: parentId,
    content,
  });

  if (error) {
    if (error.code === "42P01") {
      return { error: "Run supabase/migrations/010_follows_and_news.sql" };
    }
    return { error: error.message };
  }

  revalidatePath(`/news/${articleId}`);
  revalidatePath("/news");
  return { success: "Posted." };
}
