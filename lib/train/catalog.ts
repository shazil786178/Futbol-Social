import { fetchTrainingVideos, type TrainingVideo } from "@/lib/football-api/youtube";

export type SkillId =
  | "all"
  | "wingers"
  | "ball-mastery"
  | "skill-moves"
  | "finishing"
  | "passing"
  | "defending"
  | "goalkeeping"
  | "fitness"
  | "mindset";

export const SKILLS: { id: SkillId; label: string; blurb: string; match: RegExp | null }[] = [
  { id: "all", label: "Everything", blurb: "Newest sessions from the best coaches on YouTube.", match: null },
  { id: "wingers", label: "Wingers", blurb: "Beat your man, get to the byline, deliver.", match: /wing|1v1|1 v 1|dribbl|beat (a |the )?defender|cross|take on|full speed/i },
  { id: "ball-mastery", label: "Ball mastery", blurb: "First touch, close control, both feet.", match: /ball mastery|first touch|\btouch\b|control|juggl|cone|footwork/i },
  { id: "skill-moves", label: "Skill moves", blurb: "Elasticos, stepovers, the stuff that ends up in Clips.", match: /skill|\bmove|trick|elastico|step ?over|nutmeg|rainbow|rabona/i },
  { id: "finishing", label: "Finishing", blurb: "Hit the target. Then hit the corner.", match: /finish|shoot|\bshot|strik|scor|volley|chip|placement|power/i },
  { id: "passing", label: "Passing & vision", blurb: "Weight, disguise, scanning.", match: /pass|vision|playmak|midfield|scan|through ball|assist/i },
  { id: "defending", label: "Defending", blurb: "Body shape, timing, winning it back.", match: /defend|tackl|win the ball|press|intercept|mark|block/i },
  { id: "goalkeeping", label: "Goalkeeping", blurb: "Set position, handling, the 1v1.", match: /keeper|goalkeep|\bsave|dive|handling|glove/i },
  { id: "fitness", label: "Speed & fitness", blurb: "Faster, sharper, last the ninety.", match: /speed|agility|\bfast|workout|fitness|stamina|strength|sprint|conditioning|recovery|mobility|warm/i },
  { id: "mindset", label: "Mindset", blurb: "Habits, confidence, how pros think.", match: /mistake|mental|confiden|pro player|mindset|habit|average|think|why you/i },
];

export type TrainVideo = TrainingVideo & { skills: SkillId[] };

/** Known-good, embeddable coaching videos so the tab is never empty. */
const SEEDS: TrainingVideo[] = [
  { videoId: "P8KaltZ5Hmw", title: "15 Skill Moves for Midfielders", channelTitle: "AllAttack", publishedAt: "2026-10-01T00:00:00Z", thumbnailUrl: null, durationSec: 600 },
  { videoId: "59HY4XI-NMc", title: "10 Soccer Mistakes That Make You Average", channelTitle: "AllAttack", publishedAt: "2026-09-24T00:00:00Z", thumbnailUrl: null, durationSec: 600 },
  { videoId: "fVQSkUbAq7c", title: "Get FASTER With The 5 Exercises | Improve Your Speed & Agility", channelTitle: "7mlc", publishedAt: "2026-09-28T00:00:00Z", thumbnailUrl: null, durationSec: 540 },
  { videoId: "CyhuUNT29_s", title: "Solo Training Session — touches, turns, finishing", channelTitle: "7mlc", publishedAt: "2026-09-20T00:00:00Z", thumbnailUrl: null, durationSec: 720 },
  { videoId: "bHLLr2gvMYs", title: "The PRO striker trick that ALWAYS creates space", channelTitle: "Unisport", publishedAt: "2026-10-02T00:00:00Z", thumbnailUrl: null, durationSec: 480 },
  { videoId: "IXs50NZFjog", title: "Win The Ball WITHOUT Tackling", channelTitle: "Unisport", publishedAt: "2026-09-25T00:00:00Z", thumbnailUrl: null, durationSec: 480 },
  { videoId: "1HYZyAJHItc", title: "30 Minute At-Home Workout | Ball Mastery, Bodyweight Workout, and Foam Rolling", channelTitle: "Become Elite", publishedAt: "2026-09-30T00:00:00Z", thumbnailUrl: null, durationSec: 1800 },
  { videoId: "HdJxNVnMovA", title: "One Session Changed How I Think About Finishing", channelTitle: "Become Elite", publishedAt: "2026-09-22T00:00:00Z", thumbnailUrl: null, durationSec: 780 },
  { videoId: "pwl-aXDtJs0", title: "Keep Missing Shots? Fix These Shooting Mistakes", channelTitle: "Progressive Soccer", publishedAt: "2026-09-29T00:00:00Z", thumbnailUrl: null, durationSec: 600 },
  { videoId: "P72INYbOJ1E", title: "How to Defend Against Fast Players", channelTitle: "Joner Football", publishedAt: "2026-09-27T00:00:00Z", thumbnailUrl: null, durationSec: 540 },
  { videoId: "EKclfr4Q3l8", title: "How I Coach Dribbling at FULL Speed", channelTitle: "Joner Football", publishedAt: "2026-09-21T00:00:00Z", thumbnailUrl: null, durationSec: 540 },
  { videoId: "8S-WIysOMRI", title: "1v1 duel with a defender at your back — training exercise", channelTitle: "Soccer Drills", publishedAt: "2026-09-26T00:00:00Z", thumbnailUrl: null, durationSec: 300 },
  { videoId: "BF2GsemQUEY", title: "First Touch Warm-Up Drill", channelTitle: "Soccer Drills", publishedAt: "2026-09-19T00:00:00Z", thumbnailUrl: null, durationSec: 300 },
];

export function classify(title: string): SkillId[] {
  const out: SkillId[] = [];
  for (const s of SKILLS) {
    if (s.match && s.match.test(title)) out.push(s.id);
  }
  return out.length ? out : ["all"];
}

export async function loadTrainVideos(): Promise<TrainVideo[]> {
  const live = await fetchTrainingVideos().catch(() => [] as TrainingVideo[]);
  const seen = new Set<string>();
  const merged: TrainingVideo[] = [];
  for (const v of [...live, ...SEEDS]) {
    if (seen.has(v.videoId)) continue;
    seen.add(v.videoId);
    merged.push({
      ...v,
      thumbnailUrl: v.thumbnailUrl ?? `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
    });
  }
  return merged.map((v) => ({ ...v, skills: classify(v.title) }));
}

export function videosFor(videos: TrainVideo[], skill: SkillId) {
  if (skill === "all") return videos;
  return videos.filter((v) => v.skills.includes(skill));
}

// ---------------------------------------------------------------------------
// Weekly plan (template; AI version in the Pro path)
// ---------------------------------------------------------------------------

export const POSITIONS = ["Winger", "Striker", "Midfielder", "Full-back", "Centre-back", "Goalkeeper"] as const;
export type Position = (typeof POSITIONS)[number];

export const FOCUS = ["Weak foot", "First touch", "1v1s", "Finishing", "Speed", "Fitness", "Decision making", "Confidence"] as const;
export type Focus = (typeof FOCUS)[number];

export function templatePlan(position: Position, focus: Focus, days: number) {
  const core: Record<Position, string[]> = {
    Winger: ["1v1 cone gates: 6×4 reps, both sides", "Byline crosses off 2 touches: 20 each foot", "Repeat sprints 6×30m, walk back"],
    Striker: ["Finishing from cut-backs: 30 first-time", "Back-to-goal hold-up + turn: 15 each side", "Headers off a throw: 20"],
    Midfielder: ["Wall passes: 100 each foot, 2 touches max", "Scanning drill: shoulder check before every touch, 10 min", "Switch of play: 20 driven balls 30m+"],
    "Full-back": ["Overlap + cross: 15 each side", "Recovery runs 8×40m", "1v1 defending: jockey, delay, tackle — 10 min"],
    "Centre-back": ["Long passing: 30 driven, 30 clipped", "Heading: 30 clearances, 20 attacking", "Body shape vs forward runs: 10 min shadow"],
    Goalkeeper: ["Set position + handling: 50 catches", "Low dives: 10 each side, 3 sets", "Distribution: 20 throws, 20 side-volleys"],
  };
  const extra: Record<Focus, string> = {
    "Weak foot": "Every drill: weak foot only for the last third.",
    "First touch": "Add 10 min wall touches — inside, outside, laces, both feet.",
    "1v1s": "Finish each session with 10 live 1v1s against a friend or a cone + imaginary defender.",
    Finishing: "20 shots to end every session: 10 placed, 10 power. Count the corners.",
    Speed: "Add 5 min of acceleration starts (3-step bursts) before the ball work.",
    Fitness: "Add a 12-minute run at conversational pace on rest days.",
    "Decision making": "Watch one Clips highlight a day and pause before each pass — what would you do?",
    Confidence: "Write one thing you did well after every session. Read the list before matches.",
  };
  const daysList = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].slice(0, Math.max(2, Math.min(7, days)));
  return [
    `${position} · focus: ${focus} · ${daysList.length} days a week`,
    "",
    ...daysList.map((d, i) => `${d}: ${i % 2 === 0 ? core[position][i % 3] : core[position][(i + 1) % 3]} · 45 min`),
    "",
    extra[focus],
    "Rest day = light juggling + stretching. Rebuild this plan on Monday.",
  ].join("\n");
}
