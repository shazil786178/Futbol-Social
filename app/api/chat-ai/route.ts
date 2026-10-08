import { NextResponse } from "next/server";

type Body = {
  matchId?: string;
  homeTeam?: string;
  awayTeam?: string;
  status?: string;
  score?: string;
  question?: string;
};

function fallbackReply(body: Body): string {
  const home = body.homeTeam ?? "Home";
  const away = body.awayTeam ?? "Away";
  const q = (body.question ?? "").trim();
  const lower = q.toLowerCase();

  if (/how many bones/.test(lower) || (/bones/.test(lower) && /human|body/.test(lower))) {
    return `206 bones in an adult human body. Random question during ${home} vs ${away}, but correct.`;
  }
  if (q.includes("?")) {
    return `On “${q.slice(0, 120)}” — short answer depends on context, but for this match (${home} ${body.score ?? "?"} ${away}) I’d watch the next 10 minutes before locking a take.`;
  }
  if (lower.includes("offside")) {
    return `Offside hinges on the attacker’s position at the pass. For ${home} vs ${away}, wait for the freeze-frame — chat will still argue.`;
  }
  if (lower.includes("pen") || lower.includes("penalty")) {
    return `Penalty shout at ${body.score ?? "this score"}: was contact clear? Arm position? Ref angle? Trust your eyes twice.`;
  }

  return `You asked about “${q.slice(0, 100) || "the game"}” in ${home} vs ${away} (${body.status ?? "scheduled"}). Give me a sharper angle (tactics, VAR, scoreline) and I’ll go deeper.`;
}

export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  const question = body.question?.trim();

  if (!question) {
    return NextResponse.json({ error: "Ask a question." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json({ reply: fallbackReply(body) });
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are the Tactics desk in Futbol Social match chat.
Answer the user's question directly and correctly first — including off-topic trivia/science/general knowledge.
Then, if natural, add one short football-flavored aside about the current match.
2–4 sentences max. No generic filler.`,
          },
          {
            role: "user",
            content: `Match: ${body.homeTeam} vs ${body.awayTeam}, status ${body.status}, score ${body.score}.
Question: ${question}`,
          },
        ],
        max_tokens: 220,
        temperature: 0.6,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ reply: fallbackReply(body) });
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply =
      data.choices?.[0]?.message?.content?.trim() ?? fallbackReply(body);

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ reply: fallbackReply(body) });
  }
}
