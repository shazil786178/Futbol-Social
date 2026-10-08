/**
 * Generates match-chat fan replies that actually address the user's message.
 * Uses OpenAI when OPENAI_API_KEY is set; otherwise a content-aware fallback.
 */

export type FanReplyContext = {
  username: string;
  body: string;
  homeTeam: string;
  awayTeam: string;
  score: string;
  status: string;
};

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/** Lightweight answers for common off-topic / trivia questions. */
function tryFactualAnswer(body: string): string | null {
  const q = body.toLowerCase().replace(/[’']/g, "'");

  if (
    /how many bones/.test(q) ||
    (/bones/.test(q) && /human|body|person|adult/.test(q))
  ) {
    return "206 in an adult human body (babies are born with more that fuse later)";
  }
  if (/how many teeth/.test(q) && /adult|human/.test(q)) {
    return "32 adult teeth if you've still got your wisdom teeth";
  }
  if (/capital of france|france'?s capital/.test(q)) {
    return "Paris";
  }
  if (/capital of (england|uk)|london the capital/.test(q)) {
    return "London";
  }
  if (/biggest planet|largest planet/.test(q)) {
    return "Jupiter";
  }
  if (/speed of light/.test(q)) {
    return "about 299,792 km/s";
  }
  if (/how many continents/.test(q)) {
    return "7 continents";
  }
  if (/who (won|wins) the world cup 2022|2022 world cup/.test(q)) {
    return "Argentina — Messi finally got it";
  }
  if (/2\s*\+\s*2|what(?:'s| is) 2\+2/.test(q)) {
    return "4… you good?";
  }
  if (/meaning of life/.test(q)) {
    return "42 — or a last-minute winner, depending who you ask";
  }

  return null;
}

function isQuestion(body: string) {
  const t = body.trim();
  return (
    t.includes("?") ||
    /^(who|what|when|where|why|how|is|are|do|does|did|can|could|would|should)\b/i.test(
      t,
    )
  );
}

function extractTopicSnippet(body: string): string {
  const cleaned = body.replace(/@\w+/g, "").trim();
  if (cleaned.length <= 70) return cleaned;
  return `${cleaned.slice(0, 67)}…`;
}

function fallbackReplies(ctx: FanReplyContext): string[] {
  const { username, body, homeTeam, awayTeam, score, status } = ctx;
  const text = body.trim();
  const lower = text.toLowerCase();
  const snippet = extractTopicSnippet(text);
  const factual = tryFactualAnswer(text);

  if (factual) {
    return [
      `@${username} ${factual}`,
      pick([
        `lol why we talking about this mid ${homeTeam}–${awayTeam}`,
        `@${username} random but correct`,
        `ok encyclopedia @${username} 😂 back to the match tho`,
      ]),
    ];
  }

  // Direct disagreement / agreement cues
  if (/\b(agree|facts|true|exactly|this)\b/i.test(lower)) {
    return [
      `@${username} yes — “${snippet}” is the take`,
      pick([
        `${homeTeam} fans typing essays rn`,
        `chat finally saying something real`,
      ]),
    ];
  }

  if (/\b(hate|trash|finished|washed|useless)\b/i.test(lower)) {
    return [
      `@${username} spicy — you aiming that at ${awayTeam} or everyone`,
      pick([
        `calm down it's only ${score}`,
        `@${username} say that again after 90'`,
      ]),
    ];
  }

  if (/\b(predict|score|lean|bet)\b/i.test(lower)) {
    return [
      `@${username} I’m still on a lean for ${status === "upcoming" ? homeTeam : "the next goal"}`,
      `lock it on Predictor if you believe “${snippet}”`,
    ];
  }

  if (/\b(offside|var|ref|pen|penalty|red)\b/i.test(lower)) {
    return [
      `@${username} that call is going to live rent free — “${snippet}”`,
      pick([
        `ref lost the plot a bit ngl`,
        `VAR exists and somehow we still argue`,
      ]),
    ];
  }

  if (isQuestion(text)) {
    // Unknown question — still address it, don't ignore
    return [
      `@${username} re: “${snippet}” — not 100% sure but I’d say look it up and come back cooking`,
      pick([
        `wild question for a ${homeTeam} chat but I respect it`,
        `@${username} ask again after the next chance I’m focused on ${awayTeam}'s shape`,
      ]),
    ];
  }

  // Statement — react to the actual content
  return [
    `@${username} “${snippet}” — that’s a real point`,
    pick([
      `watching ${homeTeam} vs ${awayTeam} at ${score} and yeah I see what you mean`,
      `@${username} expand on that, chat’s listening`,
      `hmm idk about that take but “${snippet.slice(0, 40)}” hit`,
    ]),
  ];
}

async function openAiFanReplies(
  ctx: FanReplyContext,
  apiKey: string,
): Promise<string[] | null> {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.9,
        max_tokens: 220,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You write replies as casual football fans in a live match chatroom.
Rules:
- Return JSON: {"replies":["message1","message2"]} with 1 or 2 strings.
- Each message max 200 characters, chat slang OK, light typos OK.
- ALWAYS answer what the user actually said. If they ask a factual question (even off-topic like science/trivia), give the correct short answer first, then optionally a one-liner tying back to the match.
- Do not give generic praise like "fair take" unless it fits.
- Mention @${ctx.username} in at least one reply.
- You are NOT labeled as AI/bots. Sound like real fans.
- Match context: ${ctx.homeTeam} vs ${ctx.awayTeam}, status ${ctx.status}, score ${ctx.score}.`,
          },
          {
            role: "user",
            content: `@${ctx.username} said: ${ctx.body}`,
          },
        ],
      }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { replies?: unknown };
    if (!Array.isArray(parsed.replies)) return null;

    const replies = parsed.replies
      .filter((r): r is string => typeof r === "string" && r.trim().length > 0)
      .map((r) => r.trim().slice(0, 280));

    return replies.length > 0 ? replies.slice(0, 2) : null;
  } catch {
    return null;
  }
}

export async function generateFanReplies(
  ctx: FanReplyContext,
): Promise<string[]> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (apiKey) {
    const ai = await openAiFanReplies(ctx, apiKey);
    if (ai?.length) return ai;
  }
  return fallbackReplies(ctx).slice(0, Math.random() > 0.4 ? 2 : 1);
}
