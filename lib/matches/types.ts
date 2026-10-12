export type MatchStatus = "upcoming" | "live" | "finished";

export type CompetitionId =
  | "laliga"
  | "epl"
  | "bundesliga"
  | "ucl"
  | "mls"
  | "friendlies";

export type Match = {
  id: string;
  competitionId: CompetitionId;
  competitionName: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  venue: string;
  /** Clock minute when live; null for upcoming / unknown. */
  minute: number | null;
  externalId: string | null;
};

export type Highlight = {
  id: string;
  matchId: string | null;
  title: string;
  duration: string;
  thumbnailLabel: string;
  videoUrl: string | null;
  embedUrl: string | null;
  embedHtml: string | null;
  thumbnailUrl: string | null;
  source: string | null;
  competitionLabel: string | null;
  happenedAt?: string | null;
  /** Uploader (fan clips) — null for official sources */
  userId?: string | null;
  caption?: string | null;
  teamTags?: string[];
  category?: string | null;
};

export type Skit = {
  id: string;
  matchId: string | null;
  title: string;
  author: string;
  duration: string;
  tag: string;
  videoUrl: string | null;
};

export type Prediction = {
  id: string;
  matchId: string;
  userId: string;
  username: string;
  homeScore: number;
  awayScore: number;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  matchId: string;
  userId: string;
  username: string;
  body: string;
  createdAt: string;
};

export type PostType = "reaction" | "opinion" | "verdict";

export type MatchPost = {
  id: string;
  matchId: string;
  userId: string;
  username: string;
  type: PostType;
  content: string;
  createdAt: string;
};

export type ProfileRow = {
  id: string;
  username: string;
  football_iq: number;
  oracle_badge: boolean;
  avatar_url: string | null;
};

export type IqEvent = {
  id: string;
  matchId: string;
  delta: number;
  reason: string;
  createdAt: string;
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};
