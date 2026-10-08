import { NextResponse } from "next/server";
import { runSyncJob, type SyncJobMode } from "@/lib/jobs/sync-matches";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV === "development";

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

function modeFrom(request: Request): SyncJobMode {
  const url = new URL(request.url);
  return url.searchParams.get("mode") === "live" ? "live" : "full";
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runSyncJob(modeFrom(request));
    return NextResponse.json({ ...result, mode: modeFrom(request) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
