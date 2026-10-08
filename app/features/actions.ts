"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { formatDuration, uploadVideoFile } from "@/lib/storage/upload";
import { resolveMatchStatus } from "@/lib/matches/format";

export type ActionState = { error?: string; success?: string };

export async function updateSupportedTeam(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const team = formData.get("supportedTeam")?.toString().trim();
  if (!team) return { error: "Pick a team." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const { error } = await supabase
    .from("profiles")
    .update({ supported_team: team })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/profile");
  revalidatePath("/rival");
  return { success: "Team saved." };
}

export async function joinRivalMode(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const matchId = formData.get("matchId")?.toString();
  if (!matchId) return { error: "Missing match." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to enter Rival Mode." };

  const [{ data: profile }, { data: match }] = await Promise.all([
    supabase.from("profiles").select("supported_team").eq("id", user.id).maybeSingle(),
    supabase.from("matches").select("*").eq("id", matchId).maybeSingle(),
  ]);

  if (!match) return { error: "Match not found." };
  const status = resolveMatchStatus(match.kickoff_at, match.status);
  if (status === "finished") return { error: "Rival Mode closed — match finished." };

  const myTeam = profile?.supported_team;
  if (!myTeam) {
    return { error: "Set your supported team on your profile first." };
  }

  const supportsHome = myTeam === match.home_team;
  const supportsAway = myTeam === match.away_team;
  if (!supportsHome && !supportsAway) {
    return {
      error: `Pick ${match.home_team} or ${match.away_team} as your supported team for this match.`,
    };
  }

  const { data: existing } = await supabase
    .from("rival_pairs")
    .select("id")
    .eq("match_id", matchId)
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .maybeSingle();

  if (existing) {
    revalidatePath(`/rival?match=${matchId}`);
    return { success: "Already paired — loading rival view." };
  }

  const opponentTeam = supportsHome ? match.away_team : match.home_team;
  const { data: opponentProfile } = await supabase
    .from("profiles")
    .select("id, supported_team")
    .eq("supported_team", opponentTeam)
    .neq("id", user.id)
    .limit(1)
    .maybeSingle();

  if (!opponentProfile) {
    return {
      error: `Waiting for a ${opponentTeam} fan to join. Check back soon!`,
    };
  }

  const [userA, userB, teamA, teamB] = supportsHome
    ? [user.id, opponentProfile.id, match.home_team, match.away_team]
    : [opponentProfile.id, user.id, match.home_team, match.away_team];

  const { error } = await supabase.from("rival_pairs").insert({
    match_id: matchId,
    user_a_id: userA,
    user_b_id: userB,
    team_a: teamA,
    team_b: teamB,
  });

  if (error) return { error: error.message };
  revalidatePath(`/rival?match=${matchId}`);
  return { success: "Rival paired! Side-by-side view unlocked." };
}

export async function openTribunal(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const matchId = formData.get("matchId")?.toString();
  const question = formData.get("question")?.toString().trim();
  const incidentType = formData.get("incidentType")?.toString() ?? "other";

  if (!matchId || !question) return { error: "Question required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to open a vote." };

  const { data: open } = await supabase
    .from("tribunals")
    .select("id")
    .eq("match_id", matchId)
    .eq("status", "open")
    .maybeSingle();

  if (open) return { error: "A vote is already open for this match." };

  const { error } = await supabase.from("tribunals").insert({
    match_id: matchId,
    question,
    incident_type: incidentType,
  });

  if (error) {
    if (error.code === "42P01") {
      return { error: "Run supabase/migrations/006_signature_features.sql" };
    }
    return { error: error.message };
  }

  revalidatePath(`/matches/${matchId}`);
  return { success: "Tribunal opened." };
}

export async function voteTribunal(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tribunalId = formData.get("tribunalId")?.toString();
  const vote = formData.get("vote")?.toString();

  if (!tribunalId || (vote !== "yes" && vote !== "no")) {
    return { error: "Invalid vote." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to vote." };

  const { error } = await supabase.from("tribunal_votes").insert({
    tribunal_id: tribunalId,
    user_id: user.id,
    vote,
  });

  if (error) {
    if (error.code === "23505") return { error: "You already voted." };
    return { error: error.message };
  }

  const { data: tribunal } = await supabase
    .from("tribunals")
    .select("match_id")
    .eq("id", tribunalId)
    .single();

  if (tribunal) {
    revalidatePath(`/matches/${tribunal.match_id}`);
  }

  return { success: "Vote recorded." };
}

export async function submitStructuredVerdict(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const matchId = formData.get("matchId")?.toString();
  const ratings = ["matchRating", "refereeRating", "homeRating", "awayRating"].map(
    (k) => Number.parseInt(formData.get(k)?.toString() ?? "", 10),
  );

  if (!matchId || ratings.some((n) => Number.isNaN(n) || n < 1 || n > 10)) {
    return { error: "All ratings must be 1–10." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to submit a verdict." };

  const { data: match } = await supabase
    .from("matches")
    .select("status, kickoff_at")
    .eq("id", matchId)
    .maybeSingle();

  if (!match) return { error: "Match not found." };
  const status = resolveMatchStatus(match.kickoff_at, match.status);
  if (status !== "finished") {
    return { error: "Structured verdicts open after full time only." };
  }

  const { error } = await supabase.from("structured_verdicts").insert({
    match_id: matchId,
    user_id: user.id,
    match_rating: ratings[0],
    referee_rating: ratings[1],
    home_team_rating: ratings[2],
    away_team_rating: ratings[3],
  });

  if (error) {
    if (error.code === "23505") return { error: "You already rated this match." };
    if (error.code === "42P01") {
      return { error: "Run supabase/migrations/006_signature_features.sql" };
    }
    return { error: error.message };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("football_iq")
    .eq("id", user.id)
    .maybeSingle();

  await supabase
    .from("profiles")
    .update({ football_iq: (profile?.football_iq ?? 100) + 3 })
    .eq("id", user.id);

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/verdicts");
  return { success: "Verdict saved. +3 Futbol IQ." };
}

export async function submitOraclePrediction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const uclWinner = formData.get("uclWinner")?.toString().trim();
  const topScorer = formData.get("topScorer")?.toString().trim();
  const darkHorse = formData.get("darkHorse")?.toString().trim();

  if (!uclWinner || !topScorer) {
    return { error: "UCL winner and top scorer are required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const { data: existing } = await supabase
    .from("oracle_predictions")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return { error: "Oracle picks are locked — already submitted." };

  const { error } = await supabase.from("oracle_predictions").insert({
    user_id: user.id,
    ucl_winner: uclWinner,
    top_scorer: topScorer,
    dark_horse: darkHorse || null,
  });

  if (error) {
    if (error.code === "42P01") {
      return { error: "Run supabase/migrations/006_signature_features.sql" };
    }
    return { error: error.message };
  }

  revalidatePath("/oracle");
  return { success: "Oracle picks locked in. Badge awarded at season end." };
}

export async function postInClubRoom(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const slug = formData.get("slug")?.toString();
  const content = formData.get("content")?.toString().trim();

  if (!slug || !content) return { error: "Write something first." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to post." };

  const { error } = await supabase.from("country_room_posts").insert({
    room_slug: slug,
    user_id: user.id,
    content,
  });

  if (error) {
    if (error.code === "42P01") {
      return { error: "Run supabase/migrations/006_signature_features.sql" };
    }
    return { error: error.message };
  }

  revalidatePath(`/rooms/${slug}`);
  return { success: "Posted." };
}

export async function submitSkit(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const title = formData.get("title")?.toString().trim();
  const tag = formData.get("tag")?.toString().trim() || "fan";
  const matchId = formData.get("matchId")?.toString() || null;
  const durationRaw = formData.get("duration")?.toString();
  const video = formData.get("video");

  if (!title) return { error: "Title required." };
  if (formData.get("rightsAttested") !== "yes") {
    return {
      error: "Confirm you have rights to this fan content before uploading.",
    };
  }
  if (!(video instanceof File) || video.size === 0) {
    return { error: "Choose a video file to upload." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to upload a skit." };

  try {
    const { path, url } = await uploadVideoFile(supabase, "skits", user.id, video);
    const durationSeconds = Number.parseInt(durationRaw ?? "", 10);
    const duration =
      Number.isFinite(durationSeconds) && durationSeconds > 0
        ? formatDuration(durationSeconds)
        : "0:45";

    const { error } = await supabase.from("skits").insert({
      user_id: user.id,
      title,
      tag,
      match_id: matchId || null,
      duration,
      video_url: url,
      storage_path: path,
    });

    if (error) return { error: error.message };
    revalidatePath("/skits");
    return { success: "Skit uploaded." };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Upload failed.",
    };
  }
}

export async function submitHighlight(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const matchId = formData.get("matchId")?.toString();
  const title = formData.get("title")?.toString().trim();
  const durationRaw = formData.get("duration")?.toString();
  const video = formData.get("video");

  if (!matchId || !title) return { error: "Match and title required." };
  if (formData.get("rightsAttested") !== "yes") {
    return {
      error: "Confirm you have rights to this fan content before uploading.",
    };
  }
  if (!(video instanceof File) || video.size === 0) {
    return { error: "Choose a video clip to upload." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to upload a highlight." };

  try {
    const { path, url } = await uploadVideoFile(
      supabase,
      "highlights",
      user.id,
      video,
    );
    const durationSeconds = Number.parseInt(durationRaw ?? "", 10);
    const duration =
      Number.isFinite(durationSeconds) && durationSeconds > 0
        ? formatDuration(durationSeconds)
        : "0:30";

    const { error } = await supabase.from("highlights").insert({
      match_id: matchId,
      user_id: user.id,
      title,
      duration,
      thumbnail_label: "CLIP",
      video_url: url,
      storage_path: path,
      sort_order: Math.floor(Date.now() / 1000),
    });

    if (error) return { error: error.message };
    revalidatePath(`/matches/${matchId}`);
    revalidatePath("/clips");
    revalidatePath("/highlights");
    return { success: "Fan clip uploaded." };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Upload failed.",
    };
  }
}
