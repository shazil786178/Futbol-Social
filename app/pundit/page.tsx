import { PageShell } from "@/components/layout/page-shell";
import { PunditChat } from "@/components/pundit/pundit-chat";
import { aiEnabled } from "@/lib/ai/client";
import { BRAND } from "@/lib/brand";
import { buildPunditContext } from "@/lib/pundit/context";
import { FREE_PUNDIT_PER_DAY } from "@/lib/pundit/limits";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: `AI Pundit — ${BRAND.name}`,
  description: "Ask anything about tonight's football. Grounded in live scores.",
};

export const dynamic = "force-dynamic";

export default async function PunditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ctx = await buildPunditContext(supabase, user?.id ?? null);

  const team = ctx.myTeam?.name;
  const next = ctx.myTeam?.next;
  const liveOne = ctx.live[0];
  const suggestions = [
    liveOne ? `What's happening in ${liveOne.homeTeam} v ${liveOne.awayTeam}?` : "What's on tonight?",
    next ? `Who wins ${next.homeTeam} v ${next.awayTeam}?` : ctx.upcoming[0] ? `Who wins ${ctx.upcoming[0].homeTeam} v ${ctx.upcoming[0].awayTeam}?` : "Biggest game this week?",
    team ? `How are ${team} looking?` : "Which team is in the best form?",
    "Who should I captain in UCL Fantasy?",
    ctx.callQuestion ? `Help me make The Call: ${ctx.callQuestion}` : "Give me a hot take for tonight",
  ];

  return (
    <PageShell wide>
      <header className="fs-fade-up">
        <p className="fs-kicker !text-[var(--gold)]">AI Pundit</p>
        <h1 className="fs-display mt-2 text-4xl sm:text-5xl">
          {team ? `Talk ${team} with someone who's watched everything.` : "Talk football with someone who's watched everything."}
        </h1>
        <p className="mt-3 max-w-xl text-sm text-[var(--beige-muted)]">
          Previews, form, who to captain, why your team lost — grounded in the live
          scores and fixtures already in the app, so it never makes up a result.
        </p>
      </header>

      <div className="mt-6 fs-fade-up-delay">
        <PunditChat
          suggestions={suggestions}
          signedIn={Boolean(user)}
          isPro={Boolean(ctx.profile?.isPro)}
          aiLive={aiEnabled()}
          freePerDay={FREE_PUNDIT_PER_DAY}
        />
      </div>
    </PageShell>
  );
}
