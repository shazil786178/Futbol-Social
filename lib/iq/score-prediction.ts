export const IQ_POINTS = {
  exactScore: 50,
  correctResult: 20,
  wrongResult: -10,
} as const;

export type PredictionInput = {
  homeScore: number;
  awayScore: number;
};

export type MatchResult = {
  homeScore: number;
  awayScore: number;
};

export function scorePrediction(
  prediction: PredictionInput,
  result: MatchResult,
): { delta: number; reason: string } {
  const { homeScore: ph, awayScore: pa } = prediction;
  const { homeScore: rh, awayScore: ra } = result;

  if (ph === rh && pa === ra) {
    return {
      delta: IQ_POINTS.exactScore,
      reason: `Exact score: ${rh}–${ra}`,
    };
  }

  const predOutcome = Math.sign(ph - pa);
  const actualOutcome = Math.sign(rh - ra);

  if (predOutcome === actualOutcome) {
    return {
      delta: IQ_POINTS.correctResult,
      reason: `Correct result (${rh}–${ra})`,
    };
  }

  return {
    delta: IQ_POINTS.wrongResult,
    reason: `Wrong result (actual ${rh}–${ra})`,
  };
}
