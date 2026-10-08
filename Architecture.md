# Futbol Social — Plan of Attack

## Phase status

| Phase | Status |
|-------|--------|
| **1 — Spine** | Done |
| **2 — Data + IQ** | Done (this release) |
| **3 — Signature** | Next — Rival, Tribunal, Oracle |
| **4 — Scale** | Later |

## Phase 2 includes

- Live match sync from [football-data.org](https://www.football-data.org/) (PL, La Liga, Bundesliga, UCL)
- Kickoff heuristics when API key is missing (upcoming → live → finished)
- Predictions locked after kickoff
- Futbol IQ auto-scoring when matches finish
- IQ event history on `/profile`
- Notifications on `/notifications`
- Cron job: `/api/jobs/sync-matches` every 5 minutes

## Setup (Phase 2)

### 1. Run SQL

In Supabase SQL Editor, run in order:

1. `001_profiles.sql`
2. `002_match_hub.sql`
3. `003_bundesliga_social.sql`
4. **`004_phase2_iq.sql`**

### 2. Environment variables (`.env.local`)

```
SUPABASE_SERVICE_ROLE_KEY=...   # Supabase → Settings → API → service_role
FOOTBALL_DATA_API_KEY=...       # free at football-data.org (optional)
CRON_SECRET=...                 # any random string for cron auth
```

### 3. Test sync locally

```bash
npm run dev
# Then visit (dev mode, no secret needed):
http://localhost:3000/api/jobs/sync-matches
```

With `CRON_SECRET` set:

```
http://localhost:3000/api/jobs/sync-matches?secret=YOUR_SECRET
```

### 4. Deploy (Vercel)

- Add the same env vars in Vercel project settings
- `vercel.json` runs sync every 5 minutes in production

## Futbol IQ scoring

| Result | Points |
|--------|--------|
| Exact score | +50 |
| Correct W/D/L, wrong score | +20 |
| Wrong result | -10 |

## Routes

See Phase 1 list — plus `/notifications` and `/api/jobs/sync-matches`.
