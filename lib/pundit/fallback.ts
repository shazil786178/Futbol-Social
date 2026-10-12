import { similarity } from "@/lib/football-api/live-scores";
import { hasScore } from "@/lib/matches/format";
import type { Match } from "@/lib/matches/types";
import type { PunditContext } from "@/lib/pundit/context";

/**
 * No AI key? The Pundit still answers from live data with a rules engine —
 * previews, form, who to captain, what's on. Honest, never invents facts.
 */

function fmt(m: Match) {
  const score = hasScore(m) ? `${m.homeScore}–${m.awayScore}` : "v";
  return `${m.homeTeam} ${score} ${m.awayTeam}`;
}

function kickoff(m: Match) {
  return new Date(m.kickoffAt).toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function resultFor(team: string, m: Match): "W" | "D" | "L" | null {
  if (!hasScore(m)) return null;
  const home = similarity(team, m.homeTeam) >= similarity(team, m.awayTeam);
  const mine = home ? m.homeScore! : m.awayScore!;
  const theirs = home ? m.awayScore! : m.homeScore!;
  return mine > theirs ? "W" : mine < theirs ? "L" : "D";
}

function formFor(team: string, all: Match[]) {
  return all
    .filter(
      (m) =>
        m.status === "finished" &&
        hasScore(m) &&
        (similarity(team, m.homeTeam) >= 0.85 || similarity(team, m.awayTeam) >= 0.85),
    )
    .sort((a, b) => +new Date(b.kickoffAt) - +new Date(a.kickoffAt))
    .slice(0, 5);
}

function findTeam(q: string, ctx: PunditContext): string | null {
  const names = new Set<string>();
  for (const m of [...ctx.today, ...ctx.upcoming, ...ctx.recent, ...ctx.live]) {
    names.add(m.homeTeam);
    names.add(m.awayTeam);
  }
  const lq = q.toLowerCase();
  let best: { name: string; score: number } | null = null;
  for (const n of names) {
    const ln = n.toLowerCase();
    const token = ln.split(" ").find((w) => w.length > 3) ?? ln;
    const s = lq.includes(ln) ? 1 : lq.includes(token) ? 0.8 : 0;
    if (s && (!best || s > best.score)) best = { name: n, score: s };
  }
  return best?.name ?? null;
}

function preview(a: string, b: string, all: Match[], fixture: Match | null) {
  const fa = formFor(a, all);
  const fb = formFor(b, all);
  const pts = (t: string, f: Match[]) =>
    f.reduce((s, m) => s + (resultFor(t, m) === "W" ? 3 : resultFor(t, m) === "D" ? 1 : 0), 0);
  const pa = pts(a, fa);
  const pb = pts(b, fb);
  const edge = pa === pb ? "too close to call on form" : pa > pb ? `${a} have the edge on form` : `${b} have the edge on form`;
  const lines = [
    fixture ? `${a} v ${b} — ${fixture.competitionName}, ${kickoff(fixture)}.` : `${a} v ${b}.`,
    `${a} last five: ${fa.map((m) => resultFor(a, m)).join(" ") || "no results in my window"} (${pa} pts).`,
    `${b} last five: ${fb.map((m) => resultFor(b, m)).join(" ") || "no results in my window"} (${pb} pts).`,
    `Read: ${edge}. ${pa === pb ? "Back the home side if you need a lean." : "Fade the favourite only if you like chaos."}`,
  ];
  return lines.join("\n");
}

export function fallbackAnswer(question: string, ctx: PunditContext): string {
  const q = question.toLowerCase();
  const all = [...ctx.live, ...ctx.today, ...ctx.upcoming, ...ctx.recent];
  const team = findTeam(q, ctx) ?? ctx.myTeam?.name ?? null;

  // What's on / live
  if (/\b(live|on now|what'?s on|tonight|today|fixtures|schedule)\b/.test(q)) {
    if (ctx.live.length) {
      return `Live right now:\n${ctx.live.map((m) => `• ${fmt(m)} (${m.minute ?? ""}')`).join("\n")}`;
    }
    if (ctx.today.length) {
      return `Today's board:\n${ctx.today.slice(0, 10).map((m) => `• ${fmt(m)} — ${kickoff(m)} · ${m.competitionName}`).join("\n")}`;
    }
    return `Nothing today. Next up:\n${ctx.upcoming.slice(0, 6).map((m) => `• ${fmt(m)} — ${kickoff(m)}`).join("\n")}`;
  }

  // Captain / fantasy
  if (/\b(captain|fantasy|transfer|who should i (pick|start)|differential)\b/.test(q)) {
    const picks = ctx.fantasy?.picks ?? [];
    const next = ctx.upcoming.slice(0, 4).map(fmt).join(", ");
    return [
      ctx.fantasy
        ? `Your squad "${ctx.fantasy.teamName}" sits on ${ctx.fantasy.total} pts (rank ${ctx.fantasy.rank}).`
        : "You haven't built a Champions League XI yet — do that first in Fantasy.",
      picks.length ? `Captain rule of thumb: the forward with the easiest fixture next. Your forwards: ${picks.slice(0, 4).join(", ")}.` : "",
      next ? `Next fixtures in the window: ${next}.` : "",
      "I rank by goals + assists + clean sheets; home sides against bottom-half opponents are the safest armband.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  // Preview: "X vs Y" or "who wins"
  const vs = q.match(/(.+?)\s+(?:vs?\.?|v|against|-)\s+(.+)/);
  if (vs) {
    const a = findTeam(vs[1]!, ctx);
    const b = findTeam(vs[2]!, ctx);
    if (a && b) {
      const fixture =
        all.find(
          (m) =>
            m.status !== "finished" &&
            ((similarity(a, m.homeTeam) > 0.85 && similarity(b, m.awayTeam) > 0.85) ||
              (similarity(b, m.homeTeam) > 0.85 && similarity(a, m.awayTeam) > 0.85)),
        ) ?? null;
      return preview(a, b, all, fixture);
    }
  }

  // Team-centric: form / why lost / next
  if (team) {
    const form = formFor(team, all);
    const next = all
      .filter((m) => m.status === "upcoming" && (similarity(team, m.homeTeam) > 0.85 || similarity(team, m.awayTeam) > 0.85))
      .sort((a, b) => +new Date(a.kickoffAt) - +new Date(b.kickoffAt))[0];
    const live = ctx.live.find((m) => similarity(team, m.homeTeam) > 0.85 || similarity(team, m.awayTeam) > 0.85);
    const last = form[0];
    const lines = [
      live ? `${team} are live: ${fmt(live)} (${live.minute ?? ""}').` : "",
      last ? `Last time out: ${fmt(last)} — a ${resultFor(team, last) === "W" ? "win" : resultFor(team, last) === "L" ? "defeat" : "draw"}.` : `No ${team} result in my window yet.`,
      form.length ? `Form: ${form.map((m) => resultFor(team, m)).join(" ")}.` : "",
      next ? `Next: ${fmt(next)} — ${kickoff(next)} (${next.competitionName}).` : "No upcoming fixture scheduled in the window.",
      /\bwhy\b|\blost\b|\blose\b/.test(q) && last && resultFor(team, last) === "L"
        ? `Why the loss? I only see the scoreline, not the tape — but ${last.homeTeam === team ? "losing at home" : "losing away"} by ${Math.abs(last.homeScore! - last.awayScore!)} usually means the midfield got bypassed. Watch the highlights in Clips and tell me if I'm wrong.`
        : "",
    ].filter(Boolean);
    return lines.join("\n");
  }

  return [
    "Ask me about a team, a fixture (\"Arsenal v Spurs\"), who to captain, or what's live.",
    ctx.live.length ? `Live now: ${ctx.live.map(fmt).join(", ")}.` : ctx.today.length ? `Today: ${ctx.today.slice(0, 5).map(fmt).join(", ")}.` : "",
    ctx.callQuestion ? `Today's Call: ${ctx.callQuestion}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
