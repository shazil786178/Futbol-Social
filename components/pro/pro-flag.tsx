import { ProFlagClient } from "@/components/pro/pro-flag-client";
import { getIsPro } from "@/lib/pro/plan";
import { createClient } from "@/lib/supabase/server";

/** Marks <html data-pro="1"> for Pro members so ad slots hide via CSS. */
export async function ProFlag() {
  let isPro = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isPro = await getIsPro(supabase, user?.id ?? null);
  } catch {
    isPro = false;
  }
  return <ProFlagClient isPro={isPro} />;
}
