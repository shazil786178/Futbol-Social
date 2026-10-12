"use server";

import { revalidatePath } from "next/cache";
import { loadCallBoard, type CallChoice } from "@/lib/call/today";
import { recordDailyActivity } from "@/lib/streaks/daily";
import { createClient } from "@/lib/supabase/server";

export type CallVoteState = { error?: string; success?: string };

export async function castCallVote(
  _prev: CallVoteState,
  formData: FormData,
): Promise<CallVoteState> {
  const choice = formData.get("choice")?.toString();
  if (choice !== "a" && choice !== "b") {
    return { error: "Pick a side." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Sign in to put your name on the board." };
  }

  const board = await loadCallBoard(supabase, user.id);
  if (board.closed) return { error: "Tonight's Call just closed." };
  if (!board.call.persisted) {
    return {
      error:
        "The Call needs one database update — run 016_daily_call.sql in Supabase.",
    };
  }

  const { error } = await supabase.from("daily_call_votes").upsert(
    {
      call_id: board.call.id,
      user_id: user.id,
      choice: choice as CallChoice,
    },
    { onConflict: "call_id,user_id" },
  );
  if (error) return { error: error.message };

  await recordDailyActivity(supabase, user.id, "call");
  revalidatePath("/call");
  revalidatePath("/");
  revalidatePath("/feed");
  return { success: "Locked in. Come back at midnight for the split." };
}
