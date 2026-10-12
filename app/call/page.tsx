import { CallArena } from "@/components/call/call-arena";
import { PageShell } from "@/components/layout/page-shell";
import { BRAND } from "@/lib/brand";
import { loadCallBoard } from "@/lib/call/today";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: `The Call — ${BRAND.name}`,
  description: "One football question. The whole planet. Closes tonight.",
};

export const dynamic = "force-dynamic";

export default async function CallPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const board = await loadCallBoard(supabase, user?.id ?? null);

  return (
    <PageShell wide>
      <CallArena board={board} signedIn={Boolean(user)} />
    </PageShell>
  );
}
