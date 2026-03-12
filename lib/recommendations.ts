import type { PainDuring, Recommendation } from './db';

export interface CheckinInput {
  pain_during: PainDuring;
  feel_now: number; // 0-10
  night_pain: boolean;
  morning_stiffness: boolean;
}

export interface NextIntervals {
  walkSecs: number | null; // null = transition to continuous jogging (Phase V)
  jogSecs: number;
  isPhaseV: boolean;
}

const MIN_WALK_SECS = 60; // 1 minute minimum walk
const STEP_SECS = 60; // increment/decrement in 1-minute steps
const MIN_JOG_SECS = 60; // 1 minute minimum jog

/**
 * Compute the recommendation based on post-run check-in answers.
 * Night pain always triggers 'rest', regardless of other answers.
 */
export function computeRecommendation(input: CheckinInput): Recommendation {
  if (input.night_pain) {
    return 'rest';
  }

  if (
    input.pain_during === 'worsened' ||
    input.pain_during === 'constant' ||
    input.feel_now >= 6 ||
    input.morning_stiffness
  ) {
    return 'pull_back';
  }

  if (input.pain_during === 'start_then_gone' || input.feel_now >= 3) {
    return 'maintain';
  }

  // No pain + feel_now <= 2 + no night pain + no stiffness
  return 'progress';
}

/**
 * Suggest interval adjustments based on the recommendation.
 * Returns null walkSecs when the user is ready to transition to continuous jogging (Phase V).
 */
export function suggestNextIntervals(
  walkSecs: number,
  jogSecs: number,
  recommendation: Recommendation
): NextIntervals {
  switch (recommendation) {
    case 'progress': {
      const newWalkSecs = walkSecs - STEP_SECS;
      const newJogSecs = jogSecs + STEP_SECS;
      if (newWalkSecs < MIN_WALK_SECS) {
        // Ready to transition to continuous jogging
        return { walkSecs: null, jogSecs: 1800, isPhaseV: true };
      }
      return { walkSecs: newWalkSecs, jogSecs: newJogSecs, isPhaseV: false };
    }

    case 'maintain':
      return { walkSecs, jogSecs, isPhaseV: false };

    case 'pull_back': {
      const newJogSecs = Math.max(MIN_JOG_SECS, jogSecs - STEP_SECS);
      const newWalkSecs = walkSecs + STEP_SECS;
      return { walkSecs: newWalkSecs, jogSecs: newJogSecs, isPhaseV: false };
    }

    case 'rest':
      return { walkSecs, jogSecs, isPhaseV: false };
  }
}

export interface RecommendationDisplay {
  emoji: string;
  title: string;
  subtitle: string;
  color: string;
  nextActionText: string;
}

export function getRecommendationDisplay(recommendation: Recommendation): RecommendationDisplay {
  switch (recommendation) {
    case 'progress':
      return {
        emoji: '✅',
        title: 'Great work — time to progress!',
        subtitle:
          'You handled this session really well. Next time, increase your jog interval and shorten the walk.',
        color: '#4CAF50',
        nextActionText: 'Increase jog time next session',
      };

    case 'maintain':
      return {
        emoji: '⏸️',
        title: 'Stay the course',
        subtitle:
          'You had some discomfort that resolved — that\'s normal early in the return. Repeat the same intervals next session.',
        color: '#FF9800',
        nextActionText: 'Repeat same intervals next session',
      };

    case 'pull_back':
      return {
        emoji: '🔻',
        title: 'Let\'s ease up a bit',
        subtitle:
          'Your body is telling you it needs more recovery time. Reduce the jog interval and give yourself space to adapt.',
        color: '#FF5722',
        nextActionText: 'Reduce jog time, increase walk time',
      };

    case 'rest':
      return {
        emoji: '🛑',
        title: 'Rest day recommended',
        subtitle:
          'Night pain is a signal to give your body 1–2 full rest days before your next run. That\'s not a setback — it\'s smart training.',
        color: '#F44336',
        nextActionText: 'Take 1–2 rest days before next session',
      };
  }
}
