"use server";

import { redirect } from "next/navigation";
import { getSiteUrl } from "@/lib/auth/site-url";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  validateSignupPasswords,
  validateUsername,
} from "@/lib/validations/auth";

export type SignupState = {
  error?: string;
  success?: string;
};

export async function signup(
  _prevState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString() ?? "";
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? "";
  const username = formData.get("username")?.toString().trim() ?? "";

  if (!email) {
    return { error: "Email is required." };
  }

  const usernameError = validateUsername(username);
  if (usernameError) {
    return { error: usernameError };
  }

  const passwordError = validateSignupPasswords(password, confirmPassword);
  if (passwordError) {
    return { error: passwordError };
  }

  const supabase = await createClient();
  const siteUrl = await getSiteUrl();

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("username")
    .ilike("username", username)
    .maybeSingle();

  if (existingProfile) {
    return { error: "That username is already taken." };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${siteUrl}/auth/callback?next=/welcome`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.user) {
    return { error: "Could not create account. Please try again." };
  }

  // Already signed in (email confirm disabled in Supabase)
  if (data.session) {
    redirect("/welcome");
  }

  // Local/dev: confirm + sign in so you aren't stuck waiting on rate-limited email
  if (hasAdminClient()) {
    try {
      const admin = createAdminClient();
      await admin.auth.admin.updateUserById(data.user.id, {
        email_confirm: true,
      });
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (!signInError) {
        redirect("/welcome");
      }
    } catch (err) {
      console.error("Auto-confirm signup failed:", err);
    }
  }

  return {
    success:
      "Account created! Check your email to confirm, then sign in. If the link opens the home page, wait a second — we’ll finish signing you in.",
  };
}
