import type { SupabaseClient } from "@supabase/supabase-js";
import { CLUB_ROOM_SECTIONS } from "@/lib/club-rooms";

/**
 * Fake fan accounts (not labeled as bots in the UI).
 * Emails stay stable so we can rename usernames on existing installs.
 */
export const FAN_BOTS = [
  {
    email: "pitchside@bots.futbolsocial.local",
    username: "marco_92",
    password: "bot-pitchside-fs-2026!",
  },
  {
    email: "ultras_echo@bots.futbolsocial.local",
    username: "bluehalf",
    password: "bot-ultras-fs-2026!",
  },
  {
    email: "tactics_tom@bots.futbolsocial.local",
    username: "redterrace",
    password: "bot-tactics-fs-2026!",
  },
  {
    email: "var_watcher@bots.futbolsocial.local",
    username: "latewinner",
    password: "bot-var-fs-2026!",
  },
  {
    email: "iq_scout@bots.futbolsocial.local",
    username: "cornerflag",
    password: "bot-iqscout-fs-2026!",
  },
  {
    email: "midfieldmatt@bots.futbolsocial.local",
    username: "midfieldmatt",
    password: "bot-midfield-fs-2026!",
  },
  {
    email: "ninetyplus@bots.futbolsocial.local",
    username: "ninetyplus",
    password: "bot-ninety-fs-2026!",
  },
  {
    email: "touchline_k@bots.futbolsocial.local",
    username: "touchline_k",
    password: "bot-touchline-fs-2026!",
  },
] as const;

export function isFanBotUsername(username: string) {
  return FAN_BOTS.some((b) => b.username === username);
}

export function isFanBotUserId(userId: string, botIds: readonly string[]) {
  return botIds.includes(userId);
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function shuffle<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

type ConvoLine = { from: number; text: string };

function matchConversations(
  home: string,
  away: string,
  status: string,
  score: string,
): ConvoLine[][] {
  if (status === "live") {
    return [
      [
        { from: 0, text: `yo is it just me or is ${home} cooking rn` },
        { from: 1, text: `nah you're seeing it — tempo is crazy` },
        { from: 2, text: `${away} need a reset badly at ${score}` },
        { from: 0, text: `who's scoring next tho` },
        { from: 1, text: `calling ${home} again before 70'` },
      ],
      [
        { from: 0, text: `that midfield battle is filthy` },
        { from: 1, text: `agree. ${away} can't keep the ball 10 seconds` },
        { from: 0, text: `ref letting a lot go too` },
        { from: 2, text: `chat is alive for once lol` },
      ],
    ];
  }
  if (status === "finished") {
    return [
      [
        { from: 0, text: `FT ${score}. fair?` },
        { from: 1, text: `${home} deserved it imo` },
        { from: 2, text: `nah ${away} were the better side first half` },
        { from: 0, text: `second half told the truth though` },
        { from: 1, text: `biggest talking point still that call around 60'` },
      ],
      [
        { from: 0, text: `match of the weekend?` },
        { from: 1, text: `top 3 easy` },
        { from: 0, text: `${home} fans eating good tonight` },
        { from: 2, text: `${away} need answers before the next one` },
      ],
    ];
  }
  return [
    [
      { from: 0, text: `anyone got a lean for ${home}–${away}?` },
      { from: 1, text: `leaning ${home} but not confident` },
      { from: 2, text: `I'm on a draw shout. boring but safe` },
      { from: 0, text: `draw feels cowardly… might still do it` },
      { from: 1, text: `lock something before the wall fills up` },
    ],
    [
      { from: 0, text: `${away} away form is sus` },
      { from: 1, text: `true but ${home} leak goals too` },
      { from: 0, text: `2-1 either way then?` },
      { from: 2, text: `I'll take that. spicy weekend` },
    ],
  ];
}

function roomConversations(club: string): ConvoLine[][] {
  return [
    [
      { from: 0, text: `${club} matchday — who's watching from where` },
      { from: 1, text: `home stream for me. nerves already` },
      { from: 0, text: `XI predictions? drop yours` },
      { from: 2, text: `want the young kid starting. bold but right` },
    ],
    [
      { from: 0, text: `honestly the vibes around ${club} feel different this month` },
      { from: 1, text: `agree. results catching up to the football` },
      { from: 0, text: `don't jinx it` },
    ],
  ];
}

function userReplyLines(
  username: string,
  body: string,
  home: string,
  away: string,
  score: string,
): string[] {
  // Kept as sync fallback only; prefer generateFanReplies()
  const snippet = body.length > 60 ? `${body.slice(0, 57)}…` : body;
  return [
    `@${username} “${snippet}” — say more`,
    `@${username} nah I see it different for ${away} at ${score}`,
    `@${username} that point about ${home} actually tracks`,
  ];
}

async function ensureBotUsers(
  supabase: SupabaseClient,
): Promise<{ ids: string[]; byUsername: Map<string, string> }> {
  const ids: string[] = [];
  const byUsername = new Map<string, string>();

  for (const bot of FAN_BOTS) {
    // Prefer stable identity via email on profiles
    const { data: byEmail } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("email", bot.email)
      .maybeSingle();

    if (byEmail?.id) {
      if (byEmail.username !== bot.username) {
        await supabase
          .from("profiles")
          .update({ username: bot.username })
          .eq("id", byEmail.id);
      }
      ids.push(byEmail.id);
      byUsername.set(bot.username, byEmail.id);
      continue;
    }

    const { data: byName } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", bot.username)
      .maybeSingle();

    if (byName?.id) {
      ids.push(byName.id);
      byUsername.set(bot.username, byName.id);
      continue;
    }

    const { data: created, error } = await supabase.auth.admin.createUser({
      email: bot.email,
      password: bot.password,
      email_confirm: true,
      user_metadata: { username: bot.username },
    });

    if (error || !created.user) {
      const listed = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const found = listed.data.users.find((u) => u.email === bot.email);
      if (found) {
        await supabase.from("profiles").upsert({
          id: found.id,
          username: bot.username,
          email: bot.email,
          football_iq: 100,
        });
        ids.push(found.id);
        byUsername.set(bot.username, found.id);
      } else {
        console.error("Fan account create failed:", bot.username, error?.message);
      }
      continue;
    }

    await supabase.from("profiles").upsert({
      id: created.user.id,
      username: bot.username,
      email: bot.email,
      football_iq: 100,
    });
    ids.push(created.user.id);
    byUsername.set(bot.username, created.user.id);
  }

  return { ids, byUsername };
}

async function recentFanChatCount(
  supabase: SupabaseClient,
  matchId: string,
  botIds: string[],
  withinMinutes: number,
) {
  const since = new Date(Date.now() - withinMinutes * 60_000).toISOString();
  const { count } = await supabase
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("match_id", matchId)
    .in("user_id", botIds)
    .gte("created_at", since);
  return count ?? 0;
}

async function insertConversation(
  supabase: SupabaseClient,
  matchId: string,
  botIds: string[],
  lines: ConvoLine[],
) {
  const speakers = shuffle(botIds).slice(0, 3);
  if (speakers.length < 2) return 0;

  const rows = lines.map((line, i) => {
    const speaker = speakers[line.from % speakers.length]!;
    // Stagger timestamps so it reads like a real back-and-forth
    const created = new Date(Date.now() - (lines.length - i) * 55_000);
    return {
      match_id: matchId,
      user_id: speaker,
      body: line.text.slice(0, 280),
      created_at: created.toISOString(),
    };
  });

  const { error } = await supabase.from("chat_messages").insert(rows);
  if (error) {
    console.error("Conversation insert:", error.message, matchId);
    return 0;
  }
  return rows.length;
}

export type BotChatterResult = {
  botsReady: number;
  chatPosted: number;
  roomPosted: number;
  feedPosted: number;
  predictionsPosted: number;
};

/** Seed natural multi-person chats so rooms never feel empty. */
export async function runFanBotChatter(
  supabase: SupabaseClient,
): Promise<BotChatterResult> {
  const result: BotChatterResult = {
    botsReady: 0,
    chatPosted: 0,
    roomPosted: 0,
    feedPosted: 0,
    predictionsPosted: 0,
  };

  const { ids: botIds } = await ensureBotUsers(supabase);
  result.botsReady = botIds.length;
  if (botIds.length === 0) return result;

  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 24 * 3600_000).toISOString();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 3600_000).toISOString();

  const [{ data: liveRows }, { data: upcomingRows }, { data: finishedRows }] =
    await Promise.all([
      supabase
        .from("matches")
        .select(
          "id, home_team, away_team, status, home_score, away_score, kickoff_at",
        )
        .eq("status", "live")
        .limit(12),
      supabase
        .from("matches")
        .select(
          "id, home_team, away_team, status, home_score, away_score, kickoff_at",
        )
        .eq("status", "upcoming")
        .lte("kickoff_at", weekAhead)
        .gte("kickoff_at", now.toISOString())
        .order("kickoff_at", { ascending: true })
        .limit(10),
      supabase
        .from("matches")
        .select(
          "id, home_team, away_team, status, home_score, away_score, kickoff_at",
        )
        .eq("status", "finished")
        .gte("kickoff_at", threeDaysAgo)
        .order("kickoff_at", { ascending: false })
        .limit(10),
    ]);

  const focus = [
    ...(liveRows ?? []),
    ...(upcomingRows ?? []),
    ...(finishedRows ?? []),
  ];

  for (const match of focus) {
    if (
      match.status !== "upcoming" &&
      (match.home_score == null || match.away_score == null)
    ) {
      continue;
    }
    const score =
      match.status === "upcoming"
        ? "kick-off"
        : `${match.home_score}–${match.away_score}`;

    const chatRecent = await recentFanChatCount(
      supabase,
      match.id,
      botIds,
      match.status === "live" ? 18 : 90,
    );

    // Need a real thread (several messages), not a single ping
    if (chatRecent < 3) {
      const thread = pick(
        matchConversations(
          match.home_team,
          match.away_team,
          match.status,
          score,
        ),
      );
      result.chatPosted += await insertConversation(
        supabase,
        match.id,
        botIds,
        thread,
      );
    }

    const { count: feedCount } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("match_id", match.id)
      .in("user_id", botIds)
      .gte(
        "created_at",
        new Date(Date.now() - 90 * 60_000).toISOString(),
      );

    if ((feedCount ?? 0) === 0) {
      const speakers = shuffle(botIds).slice(0, 2);
      const opinions = [
        {
          type: "reaction" as const,
          content: `${match.home_team} look sharp early — want that press.`,
        },
        {
          type: "opinion" as const,
          content: `${match.away_team} midfield will decide this. Watching closely.`,
        },
      ];
      for (let i = 0; i < speakers.length; i++) {
        const { error } = await supabase.from("posts").insert({
          match_id: match.id,
          user_id: speakers[i],
          type: opinions[i]!.type,
          content: opinions[i]!.content.slice(0, 280),
        });
        if (!error) result.feedPosted += 1;
      }
    }

    if (match.status === "upcoming") {
      for (const botId of shuffle(botIds).slice(0, 2)) {
        const { data: existingPred } = await supabase
          .from("predictions")
          .select("id")
          .eq("match_id", match.id)
          .eq("user_id", botId)
          .maybeSingle();
        if (existingPred) continue;
        const { error } = await supabase.from("predictions").upsert(
          {
            match_id: match.id,
            user_id: botId,
            home_score: Math.floor(Math.random() * 3),
            away_score: Math.floor(Math.random() * 3),
          },
          { onConflict: "match_id,user_id" },
        );
        if (!error) result.predictionsPosted += 1;
      }
    }
  }

  const clubs: { slug: string; name: string }[] = CLUB_ROOM_SECTIONS.flatMap(
    (s) => [...s.clubs],
  );
  const sample = shuffle(clubs).slice(0, 5);
  for (const club of sample) {
    const since = new Date(Date.now() - 120 * 60_000).toISOString();
    const { count } = await supabase
      .from("country_room_posts")
      .select("id", { count: "exact", head: true })
      .eq("room_slug", club.slug)
      .in("user_id", botIds)
      .gte("created_at", since);
    if ((count ?? 0) >= 2) continue;

    const thread = pick(roomConversations(club.name));
    const speakers = shuffle(botIds).slice(0, 3);
    for (let i = 0; i < thread.length; i++) {
      const line = thread[i]!;
      const { error } = await supabase.from("country_room_posts").insert({
        room_slug: club.slug,
        user_id: speakers[line.from % speakers.length],
        content: line.text.slice(0, 500),
        created_at: new Date(Date.now() - (thread.length - i) * 70_000).toISOString(),
      });
      if (!error) result.roomPosted += 1;
    }
  }

  return result;
}

/**
 * When a real user posts in match chat, 1–2 fans reply so it feels like a live convo.
 * Skips if the author is already one of our fan accounts.
 */
export async function replyToUserChatMessage(input: {
  matchId: string;
  userId: string;
  username: string;
  body: string;
}): Promise<number> {
  const { createAdminClient, hasAdminClient } = await import(
    "@/lib/supabase/admin"
  );
  if (!hasAdminClient()) return 0;

  const supabase = createAdminClient();
  const { ids: botIds } = await ensureBotUsers(supabase);
  if (botIds.length === 0) return 0;
  if (botIds.includes(input.userId)) return 0;

  const { data: match } = await supabase
    .from("matches")
    .select("home_team, away_team, home_score, away_score, status")
    .eq("id", input.matchId)
    .maybeSingle();

  if (!match) return 0;

  const score =
    match.home_score == null || match.away_score == null
      ? "kick-off"
      : `${match.home_score}–${match.away_score}`;

  const { generateFanReplies } = await import("@/lib/bots/reply-engine");
  let replies: string[];
  try {
    replies = await generateFanReplies({
      username: input.username,
      body: input.body,
      homeTeam: match.home_team,
      awayTeam: match.away_team,
      score,
      status: match.status ?? "upcoming",
    });
  } catch (err) {
    console.error("generateFanReplies failed:", err);
    replies = userReplyLines(
      input.username,
      input.body,
      match.home_team,
      match.away_team,
      score,
    ).slice(0, 1);
  }

  if (replies.length === 0) return 0;

  const speakers = shuffle(botIds).slice(0, replies.length);
  let posted = 0;

  for (let i = 0; i < replies.length; i++) {
    const { error } = await supabase.from("chat_messages").insert({
      match_id: input.matchId,
      user_id: speakers[i],
      body: replies[i]!.slice(0, 280),
    });
    if (!error) posted += 1;
  }

  return posted;
}
