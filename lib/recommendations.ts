import { PainDuring, Recommendation } from './types';

export interface CheckinAnswers {
  painDuring: PainDuring;
  feelNow: number;
  nightPain: boolean;
  morningStiffness: boolean;
}

export function computeRecommendation(answers: CheckinAnswers): Recommendation {
  const { painDuring, feelNow, nightPain, morningStiffness } = answers;

  // Night pain always means rest
  if (nightPain) {
    return 'rest';
  }

  // Pain that worsened, high discomfort, or morning stiffness → pull back
  if (
    painDuring === 'worsened' ||
    painDuring === 'constant' ||
    feelNow >= 6 ||
    morningStiffness
  ) {
    return 'pull_back';
  }

  // Pain at start that went away, moderate feel → maintain
  if (painDuring === 'start_then_gone' || (feelNow >= 3 && feelNow <= 5)) {
    return 'maintain';
  }

  // No pain, feels great → progress
  if (painDuring === 'none' && feelNow <= 2) {
    return 'progress';
  }

  // Default to maintain
  return 'maintain';
}

export function getRecommendationDisplay(rec: Recommendation): {
  emoji: string;
  label: string;
  color: string;
  description: string;
} {
  switch (rec) {
    case 'progress':
      return {
        emoji: '✅',
        label: 'Progress',
        color: '#4CAF50',
        description: 'Great work! Next session, increase jog time or decrease walk time.',
      };
    case 'maintain':
      return {
        emoji: '⏸️',
        label: 'Maintain',
        color: '#FF9800',
        description: 'Repeat the same intervals next session. Consistency is progress too!',
      };
    case 'pull_back':
      return {
        emoji: '🔻',
        label: 'Pull Back',
        color: '#F44336',
        description: 'Reduce jog time or increase walk time next session. Consider a rest day.',
      };
    case 'rest':
      return {
        emoji: '🛑',
        label: 'Rest',
        color: '#9C27B0',
        description: 'Take at least 1–2 rest days before your next session. Listen to your body.',
      };
  }
}

/**
 * Given the last workout intervals and recommendation, suggest the next workout intervals.
 * Returns walk and jog in seconds.
 */
export function suggestNextIntervals(
  lastWalkSeconds: number,
  lastJogSeconds: number,
  recommendation: Recommendation
): { walkSeconds: number; jogSeconds: number; message: string } {
  const STEP = 30; // 30-second increments
  const MIN_WALK = 60; // 1 minute minimum walk

  switch (recommendation) {
    case 'progress': {
      // Try to reduce walk first, then increase jog
      if (lastWalkSeconds - STEP >= MIN_WALK) {
        return {
          walkSeconds: lastWalkSeconds - STEP,
          jogSeconds: lastJogSeconds,
          message: 'Reduced walk time by 30 seconds',
        };
      } else {
        // Walk is at minimum, suggest transitioning to continuous jog
        return {
          walkSeconds: MIN_WALK,
          jogSeconds: lastJogSeconds + STEP,
          message: 'Walk is near minimum — increasing jog time. Consider transitioning to continuous jogging!',
        };
      }
    }
    case 'maintain':
      return {
        walkSeconds: lastWalkSeconds,
        jogSeconds: lastJogSeconds,
        message: 'Same intervals as last time. Consistency builds strength!',
      };
    case 'pull_back':
      return {
        walkSeconds: lastWalkSeconds + STEP,
        jogSeconds: Math.max(STEP, lastJogSeconds - STEP),
        message: 'Eased up the intervals. Take it gentle!',
      };
    case 'rest':
      return {
        walkSeconds: lastWalkSeconds + STEP,
        jogSeconds: Math.max(STEP, lastJogSeconds - STEP),
        message: 'Rest first, then try these easier intervals when you\'re ready.',
      };
  }
}
