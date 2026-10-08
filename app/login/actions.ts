"use server";

import { redirect } from "next/navigation";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  error?: string;
};

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("email not confirmed") && hasAdminClient()) {
      try {
        const admin = createAdminClient();
        const { data: listed } = await admin.auth.admin.listUsers({
          perPage: 1000,
        });
        const found = listed.users.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase(),
        );
        if (found) {
          await admin.auth.admin.updateUserById(found.id, {
            email_confirm: true,
          });
          const retry = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (!retry.error) {
            redirect("/");
          }
        }
      } catch (err) {
        console.error("Confirm-on-login failed:", err);
      }
      return {
        error:
          "Email not confirmed yet. Try once more — we auto-confirm on local when possible.",
      };
    }
    return { error: error.message };
  }

  redirect("/");
}
