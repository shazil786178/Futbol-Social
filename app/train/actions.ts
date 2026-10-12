"use server";

import { aiEnabled, chatComplete } from "@/lib/ai/client";
import { getIsPro } from "@/lib/pro/plan";
import { FOCUS, POSITIONS, templatePlan, type Focus, type Position } from "@/lib/train/catalog";
import { createClient } from "@/lib/supabase/server";

export type PlanState = { plan?: string; mode?: "ai" | "template"; error?: string };

export async function buildTrainPlan(_prev: PlanState, formData: FormData): Promise<PlanState> {
  const position = formData.get("position")?.toString() as Position;
  const focus = formData.get("focus")?.toString() as Focus;
  const days = Number(formData.get("days") ?? 3);
  const notes = formData.get("notes")?.toString().trim().slice(0, 300) ?? "";

  if (!POSITIONS.includes(position) || !FOCUS.includes(focus)) {
    return { error: "Pick a position and a focus." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isPro = await getIsPro(supabase, user?.id ?? null);

  if (isPro && aiEnabled()) {
    const ai = await chatComplete(
      [
        {
          role: "system",
          content:
            "You are a UEFA-licensed youth coach. Write a concrete weekly training plan for an amateur player. Plain text, day-by-day, each day one line with drills, reps and minutes. Max 170 words. Finish with one habit for match day. No preamble.",
        },
        {
          role: "user",
          content: `Position: ${position}. Main focus: ${focus}. Days per week: ${days}.${notes ? ` Notes: ${notes}` : ""}`,
        },
      ],
      { maxTokens: 400, temperature: 0.6 },
    );
    if (ai) return { plan: ai, mode: "ai" };
  }

  return { plan: templatePlan(position, focus, days), mode: "template" };
}
