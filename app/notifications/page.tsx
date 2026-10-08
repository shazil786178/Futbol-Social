import Link from "next/link";
import { redirect } from "next/navigation";
import { NotificationList } from "@/components/notifications/notification-list";
import { PageShell } from "@/components/layout/page-shell";
import { BRAND } from "@/lib/brand";
import { listNotifications } from "@/lib/matches/data";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: `Notifications — ${BRAND.name}` };

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const notifications = await listNotifications(user.id);

  return (
    <PageShell>
      <header className="fs-fade-up border-b border-[var(--line-strong)] pb-5">
        <p className="fs-kicker">Inbox</p>
        <h1 className="fs-display mt-2 text-4xl text-[var(--beige)]">
          Notifications
        </h1>
        <p className="mt-2 text-sm text-[var(--beige-muted)]">
          Prediction scores, tribunals, rival wins, Oracle badges.
        </p>
      </header>

      <NotificationList userId={user.id} initialNotifications={notifications} />

      <Link
        href="/profile"
        className="mt-8 inline-block text-xs font-semibold uppercase tracking-wider text-[var(--sky)] hover:text-[var(--beige)]"
      >
        View Futbol IQ history →
      </Link>
    </PageShell>
  );
}
