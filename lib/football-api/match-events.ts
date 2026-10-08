const BASE_URL = "https://api.football-data.org/v4";

export type MatchIncident = {
  externalId: string;
  incidentType: "penalty" | "red_card";
  minute: number;
  description: string;
  question: string;
};

type ApiGoal = {
  minute: number;
  type: string;
  team?: { name?: string };
  scorer?: { name?: string };
};

type ApiBooking = {
  minute: number;
  card: string;
  team?: { name?: string };
  player?: { id?: number; name?: string };
};

type ApiMatchDetail = {
  goals?: ApiGoal[];
  bookings?: ApiBooking[];
};

export async function fetchMatchIncidents(
  externalId: string,
): Promise<MatchIncident[]> {
  const token = process.env.FOOTBALL_DATA_API_KEY;
  if (!token) return [];

  const res = await fetch(`${BASE_URL}/matches/${externalId}`, {
    headers: { "X-Auth-Token": token },
    next: { revalidate: 0 },
  });

  if (!res.ok) return [];

  const match = (await res.json()) as ApiMatchDetail;
  const incidents: MatchIncident[] = [];

  for (const goal of match.goals ?? []) {
    if (goal.type === "PENALTY") {
      incidents.push({
        externalId: `${externalId}-pen-${goal.minute}`,
        incidentType: "penalty",
        minute: goal.minute,
        description: `Penalty at ${goal.minute}' — ${goal.scorer?.name ?? "unknown"}`,
        question: `Was the penalty at ${goal.minute}' the right call?`,
      });
    }
  }

  for (const booking of match.bookings ?? []) {
    if (booking.card === "RED" || booking.card === "YELLOW_RED") {
      const playerKey =
        booking.player?.id ?? booking.player?.name ?? "player";
      incidents.push({
        externalId: `${externalId}-red-${booking.minute}-${playerKey}`,
        incidentType: "red_card",
        minute: booking.minute,
        description: `Red card at ${booking.minute}' — ${booking.player?.name ?? "unknown"}`,
        question: `Was the red card at ${booking.minute}' deserved?`,
      });
    }
  }

  return incidents;
}
