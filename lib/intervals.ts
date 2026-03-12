export type IntervalType = 'walk' | 'jog' | 'cooldown';

export interface Interval {
  type: IntervalType;
  durationSecs: number;
  startSecs: number;
}

export interface IntervalSequenceResult {
  intervals: Interval[];
  shouldWarnLongCooldown: boolean;
}

export interface CurrentIntervalResult {
  interval: Interval;
  secondsRemainingInInterval: number;
  index: number;
}

const TOTAL_DURATION_SECS = 1800; // 30 minutes
const MIN_COOLDOWN_SECS = 180; // 3 minutes
const WARN_COOLDOWN_SECS = 480; // 8 minutes

/**
 * Build the interval sequence for a 30-minute session.
 *
 * Algorithm:
 * 1. Calculate how many full walk+jog cycles fit in TOTAL - MIN_COOLDOWN_SECS
 * 2. If the remaining time after N cycles is < MIN_COOLDOWN_SECS, drop the last cycle
 * 3. The remaining time after the final cycle is the cooldown
 * 4. Warn if cooldown > WARN_COOLDOWN_SECS
 */
export function buildIntervalSequence(
  walkSecs: number,
  jogSecs: number
): IntervalSequenceResult {
  const cycleSecs = walkSecs + jogSecs;

  // Maximum cycles we can fit while leaving at least MIN_COOLDOWN_SECS
  const maxCycles = Math.floor((TOTAL_DURATION_SECS - MIN_COOLDOWN_SECS) / cycleSecs);
  let numCycles = maxCycles;

  let usedSecs = numCycles * cycleSecs;
  let remainingSecs = TOTAL_DURATION_SECS - usedSecs;

  // If remainder < MIN_COOLDOWN_SECS, drop one cycle to get a longer cooldown
  if (remainingSecs < MIN_COOLDOWN_SECS && numCycles > 0) {
    numCycles -= 1;
    usedSecs = numCycles * cycleSecs;
    remainingSecs = TOTAL_DURATION_SECS - usedSecs;
  }

  const cooldownSecs = remainingSecs;
  const shouldWarnLongCooldown = cooldownSecs > WARN_COOLDOWN_SECS;

  const intervals: Interval[] = [];
  let cursor = 0;

  for (let i = 0; i < numCycles; i++) {
    intervals.push({ type: 'walk', durationSecs: walkSecs, startSecs: cursor });
    cursor += walkSecs;
    intervals.push({ type: 'jog', durationSecs: jogSecs, startSecs: cursor });
    cursor += jogSecs;
  }

  // Cooldown (counts as walk but labeled distinctly)
  intervals.push({ type: 'cooldown', durationSecs: cooldownSecs, startSecs: cursor });

  return { intervals, shouldWarnLongCooldown };
}

/**
 * Given a sequence and elapsed seconds, return the current interval and
 * seconds remaining within it. Returns null if the workout is complete.
 */
export function getCurrentInterval(
  intervals: Interval[],
  elapsedSecs: number
): CurrentIntervalResult | null {
  if (elapsedSecs >= TOTAL_DURATION_SECS) return null;

  for (let i = 0; i < intervals.length; i++) {
    const interval = intervals[i];
    const endSecs = interval.startSecs + interval.durationSecs;
    if (elapsedSecs < endSecs) {
      return {
        interval,
        secondsRemainingInInterval: endSecs - elapsedSecs,
        index: i,
      };
    }
  }

  return null;
}

/**
 * Get wall-clock timestamps (ms) for each interval transition, including
 * the final completion time. Used to schedule notifications.
 */
export function getTransitionTimes(intervals: Interval[], startTimeMs: number): number[] {
  return intervals.map((interval) => startTimeMs + (interval.startSecs + interval.durationSecs) * 1000);
}

/**
 * Format seconds as MM:SS string.
 */
export function formatSeconds(totalSecs: number): string {
  const secs = Math.max(0, Math.floor(totalSecs));
  const minutes = Math.floor(secs / 60);
  const seconds = secs % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Format duration in seconds to a human-readable label like "4 min" or "1 min 30 sec".
 */
export function formatDurationLabel(secs: number): string {
  const minutes = Math.floor(secs / 60);
  const remaining = secs % 60;
  if (remaining === 0) return `${minutes} min`;
  return `${minutes} min ${remaining} sec`;
}

/**
 * Compute the elapsed seconds based on wall-clock time, accounting for
 * accumulated pause duration.
 */
export function computeElapsedSecs(
  startTimeMs: number,
  pausedDurationMs: number,
  nowMs: number = Date.now()
): number {
  return Math.max(0, (nowMs - startTimeMs - pausedDurationMs) / 1000);
}
