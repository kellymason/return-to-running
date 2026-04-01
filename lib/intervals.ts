import { SessionPlan, IntervalSegment } from './types';

const MIN_COOLDOWN_SECONDS = 3 * 60;
const WARN_COOLDOWN_SECONDS = 8 * 60;

export function buildSessionPlan(
  totalMinutes: number,
  walkMinutes: number,
  jogMinutes: number
): SessionPlan {
  const totalSeconds = totalMinutes * 60;
  const walkSeconds = walkMinutes * 60;
  const jogSeconds = jogMinutes * 60;
  const cycleSeconds = walkSeconds + jogSeconds;

  const warnings: string[] = [];

  if (cycleSeconds <= 0) {
    return { intervals: [], totalSeconds, cooldownSeconds: 0, warnings: ['Invalid interval durations'] };
  }

  // Calculate how many full cycles fit
  let fullCycles = Math.floor(totalSeconds / cycleSeconds);
  let remainingAfterCycles = totalSeconds - fullCycles * cycleSeconds;

  // Ensure minimum cooldown of 3 minutes
  if (remainingAfterCycles < MIN_COOLDOWN_SECONDS && fullCycles > 0) {
    fullCycles -= 1;
    remainingAfterCycles = totalSeconds - fullCycles * cycleSeconds;
  }

  // If no full cycles fit, the whole thing is a walk
  if (fullCycles === 0) {
    return {
      intervals: [{ type: 'cooldown', durationSeconds: totalSeconds }],
      totalSeconds,
      cooldownSeconds: totalSeconds,
      warnings: ['No complete walk/jog cycles fit in this duration. Consider adjusting your intervals.'],
    };
  }

  const cooldownSeconds = remainingAfterCycles;

  if (cooldownSeconds > WARN_COOLDOWN_SECONDS) {
    warnings.push(
      `Your intervals leave a ${Math.round(cooldownSeconds / 60)}-minute cooldown. Consider adjusting your intervals to reduce the cooldown time.`
    );
  }

  const intervals: IntervalSegment[] = [];
  for (let i = 0; i < fullCycles; i++) {
    intervals.push({ type: 'walk', durationSeconds: walkSeconds });
    intervals.push({ type: 'jog', durationSeconds: jogSeconds });
  }
  intervals.push({ type: 'cooldown', durationSeconds: cooldownSeconds });

  return { intervals, totalSeconds, cooldownSeconds, warnings };
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatMinutes(seconds: number): string {
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

/**
 * Given elapsed seconds in a session, determine which interval we're in.
 */
export function getCurrentInterval(
  intervals: IntervalSegment[],
  elapsedSeconds: number
): {
  segmentIndex: number;
  segment: IntervalSegment;
  timeRemainingInSegment: number;
  totalElapsed: number;
} | null {
  let accumulated = 0;
  for (let i = 0; i < intervals.length; i++) {
    const seg = intervals[i];
    if (elapsedSeconds < accumulated + seg.durationSeconds) {
      return {
        segmentIndex: i,
        segment: seg,
        timeRemainingInSegment: Math.ceil(accumulated + seg.durationSeconds - elapsedSeconds),
        totalElapsed: elapsedSeconds,
      };
    }
    accumulated += seg.durationSeconds;
  }
  return null; // Session complete
}
