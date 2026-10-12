/**
 * Tiny OpenAI-compatible chat client. Works with Google Gemini's free tier out
 * of the box (set GEMINI_API_KEY) or any OpenAI-compatible endpoint
 * (AI_API_KEY + AI_BASE_URL + AI_MODEL). No SDK, no cost until you add a key.
 */

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type Provider = { key: string; baseUrl: string; model: string; name: string };

export function resolveProvider(): Provider | null {
  const explicitKey = process.env.AI_API_KEY?.trim();
  const gemini = process.env.GEMINI_API_KEY?.trim();
  const openai = process.env.OPENAI_API_KEY?.trim();
  const groq = process.env.GROQ_API_KEY?.trim();

  if (explicitKey) {
    return {
      key: explicitKey,
      baseUrl: (process.env.AI_BASE_URL?.trim() || "https://generativelanguage.googleapis.com/v1beta/openai").replace(/\/$/, ""),
      model: process.env.AI_MODEL?.trim() || "gemini-2.0-flash",
      name: "custom",
    };
  }
  if (gemini) {
    return {
      key: gemini,
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      model: process.env.AI_MODEL?.trim() || "gemini-2.0-flash",
      name: "gemini",
    };
  }
  if (groq) {
    return {
      key: groq,
      baseUrl: "https://api.groq.com/openai/v1",
      model: process.env.AI_MODEL?.trim() || "llama-3.3-70b-versatile",
      name: "groq",
    };
  }
  if (openai) {
    return {
      key: openai,
      baseUrl: "https://api.openai.com/v1",
      model: process.env.AI_MODEL?.trim() || "gpt-4o-mini",
      name: "openai",
    };
  }
  return null;
}

export function aiEnabled() {
  return resolveProvider() !== null;
}

export async function chatComplete(
  messages: ChatMessage[],
  opts: { maxTokens?: number; temperature?: number; timeoutMs?: number } = {},
): Promise<string | null> {
  const p = resolveProvider();
  if (!p) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 20_000);
  try {
    const res = await fetch(`${p.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${p.key}`,
      },
      body: JSON.stringify({
        model: p.model,
        messages,
        max_tokens: opts.maxTokens ?? 500,
        temperature: opts.temperature ?? 0.7,
      }),
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`AI ${p.name} ${res.status}:`, body.slice(0, 300));
      return null;
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return json.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.warn("AI request failed:", err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
