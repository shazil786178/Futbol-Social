export const BRAND = {
  name: "Futbol Social",
  shortTagline: "The match is the feed.",
  description:
    "Live chat, clips, and takes that only exist while the game is on.",
  launchFocus:
    "Premier League · La Liga · Bundesliga · Champions League · MLS · Friendlies",
  iqLabel: "Futbol IQ",
} as const;

export const COMPETITIONS = {
  active: [
    { id: "epl", name: "Premier League", short: "PL" },
    { id: "laliga", name: "La Liga", short: "LL" },
    { id: "bundesliga", name: "Bundesliga", short: "BL" },
    { id: "ucl", name: "Champions League", short: "UCL" },
    { id: "mls", name: "MLS", short: "MLS" },
    { id: "friendlies", name: "Friendlies", short: "FRI" },
  ],
} as const;

export type CompetitionId = (typeof COMPETITIONS.active)[number]["id"];

export const NAV_LINKS = [
  { href: "/feed", label: "Today" },
  { href: "/matches", label: "Live" },
  { href: "/clips", label: "Clips" },
  { href: "/shots", label: "Shots" },
  { href: "/chat", label: "Chat" },
  { href: "/predictor", label: "Predict" },
  { href: "/rival", label: "Rival" },
  { href: "/leaderboard", label: "IQ" },
  { href: "/wall", label: "Wall" },
  { href: "/rooms", label: "Clubs" },
  { href: "/news", label: "News" },
  { href: "/follow", label: "Follow" },
] as const;

/** Main paths people use every session */
export const PRIMARY_NAV = [
  { href: "/", label: "Home" },
  { href: "/matches", label: "Matches" },
  { href: "/fantasy", label: "Fantasy" },
  { href: "/clips", label: "Clips" },
  { href: "/shots", label: "Shots" },
  { href: "/chat", label: "Chat" },
] as const;

/** Everything else — keep out of the main path */
export const MORE_NAV = [
  { href: "/feed", label: "Today's missions" },
  { href: "/predictor", label: "Predictor" },
  { href: "/rival", label: "Rival Mode" },
  { href: "/leaderboard", label: "Futbol IQ" },
  { href: "/wall", label: "Prediction Wall" },
  { href: "/rooms", label: "Club rooms" },
  { href: "/news", label: "News" },
  { href: "/follow", label: "Following" },
  { href: "/oracle", label: "Oracle" },
  { href: "/verdicts", label: "Verdicts" },
] as const;

export const IQ_RULES = [
  { label: "Starting balance", points: "+100" },
  { label: "Correct exact score", points: "+50" },
  { label: "Correct result (wrong score)", points: "+20" },
  { label: "Wrong result", points: "-10" },
  { label: "Reaction or opinion (per match cap)", points: "+1" },
  { label: "Structured post-match verdict", points: "+3" },
  { label: "Win Rival Mode", points: "+15" },
] as const;

export const CONTENT_TYPES = [
  "Match-first feeds",
  "Live match chat + Chat AI",
  "Predictions & Predictor",
  "Fan clips (user-uploaded)",
  "Fan skits",
  "Futbol IQ & leaderboard",
  "Rival Mode",
  "The Tribunal",
  "Prediction Wall",
  "Oracle Badge",
  "Club rooms",
  "Post-match verdicts",
] as const;

export const ROADMAP_PHASES = [
  {
    phase: "Live now",
    items: [
      "Accounts, profiles & Futbol IQ",
      "Live fixtures: PL, La Liga, Bundesliga, UCL, MLS, Friendlies",
      "Predictor & Prediction Wall (public + embed)",
      "Match feed — reactions, opinions, verdicts",
      "Live chat + Chat AI",
      "Fan clips (rights-cleared user uploads only)",
      "Rival Mode & unofficial fan club rooms",
      "The Tribunal (auto-open on pens/reds) & verdict dashboards",
      "Oracle accuracy scoring & badge automation",
      "Notifications (realtime + mark read)",
    ],
  },
  {
    phase: "Coming soon",
    items: [
      "Push notifications (mobile/web)",
      "Licensed clip partnerships (only with rights clearance)",
      "More leagues & competitions",
    ],
  },
] as const;
