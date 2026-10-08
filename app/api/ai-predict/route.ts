import { NextResponse } from "next/server";

type Body = {
  homeTeam?: string;
  awayTeam?: string;
  competition?: string;
  kickoffAt?: string;
};

type AiPrediction = {
  homeScore: number;
  awayScore: number;
  confidence: "low" | "medium" | "high";
  rationale: string;
};

function heuristicPredict(body: Body): AiPrediction {
  const home = body.homeTeam ?? "Home";
  const away = body.awayTeam ?? "Away";
  // Mild home bias for a plausible demo when OpenAI is unset
  return {
    homeScore: 2,
    awayScore: 1,
    confidence: "low",
    rationale: `${home} at home vs ${away}: model fallback (set OPENAI_API_KEY for a real take). Slight edge to the home side in a 2–1.`,
  };
}

function parsePrediction(text: string, fallback: AiPrediction): AiPrediction {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallback;
    const parsed = JSON.parse(jsonMatch[0]) as Partial<AiPrediction>;
    const homeScore = Number(parsed.homeScore);
    const awayScore = Number(parsed.awayScore);
    if (
      !Number.isFinite(homeScore) ||
      !Number.isFinite(awayScore) ||
      homeScore < 0 ||
      awayScore < 0 ||
      homeScore > 10 ||
      awayScore > 10
    ) {
      return fallback;
    }
    const confidence =
      parsed.confidence === "high" ||
      parsed.confidence === "medium" ||
      parsed.confidence === "low"
        ? parsed.confidence
        : "medium";
    return {
      homeScore: Math.round(homeScore),
      awayScore: Math.round(awayScore),
      confidence,
      rationale:
        typeof parsed.rationale === "string" && parsed.rationale.trim()
          ? parsed.rationale.trim()
          : fallback.rationale,
    };
  } catch {
    return fallback;
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  if (!body.homeTeam || !body.awayTeam) {
    return NextResponse.json({ error: "Missing teams." }, { status: 400 });
  }

  const fallback = heuristicPredict(body);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ prediction: fallback, source: "fallback" });
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
            content:
              'You are a football tipster. Reply ONLY with JSON: {"homeScore":number,"awayScore":number,"confidence":"low"|"medium"|"high","rationale":"1-2 sentences"}. Scores 0-6.',
          },
          {
            role: "user",
            content: `Predict the score for ${body.homeTeam} vs ${body.awayTeam}. Competition: ${body.competition ?? "unknown"}. Kickoff: ${body.kickoffAt ?? "TBD"}.`,
          },
        ],
        max_tokens: 200,
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ prediction: fallback, source: "fallback" });
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({
      prediction: parsePrediction(content, fallback),
      source: "openai",
    });
  } catch {
    return NextResponse.json({ prediction: fallback, source: "fallback" });
  }
}
