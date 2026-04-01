export interface Workout {
  id: number;
  date: string;
  walk_interval_seconds: number;
  jog_interval_seconds: number;
  planned_duration_seconds: number;
  actual_duration_seconds: number;
  completed: number;
  created_at: string;
}

export interface Checkin {
  id: number;
  workout_id: number;
  pain_during: PainDuring;
  feel_now: number;
  night_pain: number;
  morning_stiffness: number;
  recommendation: Recommendation;
  created_at: string;
}

export type PainDuring = 'none' | 'start_then_gone' | 'worsened' | 'constant';
export type Recommendation = 'progress' | 'maintain' | 'pull_back' | 'rest';

export interface WorkoutWithCheckin extends Workout {
  checkin?: Checkin;
}

export interface IntervalSegment {
  type: 'walk' | 'jog' | 'cooldown';
  durationSeconds: number;
}

export interface SessionPlan {
  intervals: IntervalSegment[];
  totalSeconds: number;
  cooldownSeconds: number;
  warnings: string[];
}

export interface PendingWorkout {
  walk_interval_seconds: number;
  jog_interval_seconds: number;
  planned_duration_seconds: number;
  start_time: string;
  elapsed_seconds: number;
}
