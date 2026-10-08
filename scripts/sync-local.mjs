#!/usr/bin/env node
/**
 * Trigger the match sync job locally.
 * Usage: npm run sync
 * Loads .env.local for CRON_SECRET.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const port = process.env.PORT ?? "3000";
const secret = process.env.CRON_SECRET ?? "dev";
const url = `http://localhost:${port}/api/jobs/sync-matches?secret=${encodeURIComponent(secret)}`;

console.log("Syncing via", url.replace(secret, "***"));
const res = await fetch(url, { method: "POST" });
const body = await res.text();
console.log(res.status, body);
if (!res.ok) process.exit(1);
