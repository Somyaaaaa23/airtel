/** The owner's seven-step journey and how long the rest of it usually takes. */
export const JOURNEY = ["advisor", "quote", "consent", "kyc", "sign", "pay", "track"] as const;
export type JourneyStep = (typeof JOURNEY)[number];

/** Typical minutes per step for an owner with documents to hand (tracking needs no input from them). */
export const STEP_MINUTES: Record<JourneyStep, number> = { advisor: 2, quote: 1, consent: 1, kyc: 4, sign: 1, pay: 1, track: 0 };

export interface JourneyProgress { step: JourneyStep; number: number; total: number; minutesLeft: number }

/** Position in the journey and minutes left, counting the current step and everything after it. */
export function journeyProgress(step: JourneyStep): JourneyProgress {
  const i = JOURNEY.indexOf(step);
  const minutesLeft = JOURNEY.slice(i).reduce((sum, s) => sum + STEP_MINUTES[s], 0);
  return { step, number: i + 1, total: JOURNEY.length, minutesLeft };
}
