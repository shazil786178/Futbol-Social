"use server";

import { aiEnabled, chatComplete, type ChatMessage } from "@/lib/ai/client";
import { buildPunditContext, contextToText } from "@/lib/pundit/context";
import { fallbackAnswer } from "@/lib/pundit/fallback";
import { FREE_PUNDIT_PER_DAY } from "@/lib/pundit/limits";
import { recordDailyActivity } from "@/lib/streaks/daily";
import { createClient } from "@/lib/supabase/server";

export type PunditTurn = { role: "user" | "assistant"; content: string };

export type PunditReply = {
  answer: string;
  mode: "ai" | "data";
  remaining: number | null; // null = unlimited
  error?: string;
};

const SYSTEM = `You are The Pundit inside Futbol Social — a sharp, funny, honest football analyst who talks like a mate at the bar who actually knows the game.
Rules:
- Ground every fact in the CONTEXT block. If the context does not contain a score or fixture, say you don't have it rather than guessing. Never invent scorelines, injuries or transfers.
- Keep answers tight: 2–6 short paragraphs or bullets, under 180 words unless asked for depth.
- Lead with the answer, then the reasoning. Have opinions. Use plain language, light banter, no emojis spam (max one).
- When relevant, point the user at what they can do in the app: predict the match, make The Call, build a Fantasy XI, watch Clips, train.
- If asked who wins, give a lean and a confidence (low/medium/high) based on form in the context.`;

async function takeQuota(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  isPro: boolean,
): Promise<{ ok: boolean; remaining: number | null }> {
  if (isPro) return { ok: true, remaining: null };
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("profiles")
    .select("pundit_uses, pundit_uses_date")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return { ok: true, remaining: FREE_PUNDIT_PER_DAY - 1 }; // column missing → don't block
  const used = data.pundit_uses_date === today ? (data.pundit_uses ?? 0) : 0;
  if (used >= FREE_PUNDIT_PER_DAY) return { ok: false, remaining: 0 };
  await supabase
    .from("profiles")
    .update({ pundit_uses: used + 1, pundit_uses_date: today })
    .eq("id", userId);
  return { ok: true, remaining: FREE_PUNDIT_PER_DAY - used - 1 };
}

export async function askPundit(
  history: PunditTurn[],
  question: string,
): Promise<PunditReply> {
  const q = question.trim().slice(0, 600);
  if (!q) return { answer: "", mode: "data", remaining: null, error: "Ask something." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ctx = await buildPunditContext(supabase, user?.id ?? null);
  const isPro = Boolean(ctx.profile?.isPro);

  let remaining: number | null = null;
  if (user) {
    const quota = await takeQuota(supabase, user.id, isPro);
    remaining = quota.remaining;
    if (!quota.ok) {
      return {
        answer: "",
        mode: "data",
        remaining: 0,
        error: `You've used today's ${FREE_PUNDIT_PER_DAY} free questions. Go Pro for unlimited Pundit, or come back tomorrow.`,
      };
    }
  } else {
    // Anonymous: data mode only, no quota tracking
  }

  const grounded = contextToText(ctx);
  let answer: string | null = null;
  let mode: PunditReply["mode"] = "data";

  if (aiEnabled() && user) {
    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM },
      { role: "system", content: `CONTEXT:\n${grounded}` },
      ...history.slice(-8).map((t) => ({ role: t.role, content: t.content.slice(0, 1200) }) as ChatMessage),
      { role: "user", content: q },
    ];
    answer = await chatComplete(messages, { maxTokens: 450, temperature: 0.75 });
    if (answer) mode = "ai";
  }
  if (!answer) answer = fallbackAnswer(q, ctx);

  if (user) void recordDailyActivity(supabase, user.id, "react");
  return { answer, mode, remaining };
}
