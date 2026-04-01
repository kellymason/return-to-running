import { getDatabase } from './database';
import { Workout, Checkin, WorkoutWithCheckin, PendingWorkout } from './types';

export async function saveWorkout(workout: Omit<Workout, 'id' | 'created_at'>): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO workouts (date, walk_interval_seconds, jog_interval_seconds, planned_duration_seconds, actual_duration_seconds, completed)
     VALUES (?, ?, ?, ?, ?, ?)`,
    workout.date,
    workout.walk_interval_seconds,
    workout.jog_interval_seconds,
    workout.planned_duration_seconds,
    workout.actual_duration_seconds,
    workout.completed ? 1 : 0
  );
  return result.lastInsertRowId;
}

export async function saveCheckin(checkin: Omit<Checkin, 'id' | 'created_at'>): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO checkins (workout_id, pain_during, feel_now, night_pain, morning_stiffness, recommendation)
     VALUES (?, ?, ?, ?, ?, ?)`,
    checkin.workout_id,
    checkin.pain_during,
    checkin.feel_now,
    checkin.night_pain ? 1 : 0,
    checkin.morning_stiffness ? 1 : 0,
    checkin.recommendation
  );
  return result.lastInsertRowId;
}

export async function getWorkoutsWithCheckins(): Promise<WorkoutWithCheckin[]> {
  const db = await getDatabase();
  const workouts = await db.getAllAsync<Workout>(
    'SELECT * FROM workouts ORDER BY date DESC, created_at DESC'
  );
  const checkins = await db.getAllAsync<Checkin>('SELECT * FROM checkins');

  const checkinMap = new Map<number, Checkin>();
  for (const c of checkins) {
    checkinMap.set(c.workout_id, c);
  }

  return workouts.map((w) => ({
    ...w,
    checkin: checkinMap.get(w.id),
  }));
}

export async function getLatestWorkoutWithCheckin(): Promise<WorkoutWithCheckin | null> {
  const db = await getDatabase();
  const workout = await db.getFirstAsync<Workout>(
    'SELECT * FROM workouts ORDER BY date DESC, created_at DESC LIMIT 1'
  );
  if (!workout) return null;

  const checkin = await db.getFirstAsync<Checkin>(
    'SELECT * FROM checkins WHERE workout_id = ? LIMIT 1',
    workout.id
  );

  return { ...workout, checkin: checkin ?? undefined };
}

export async function getWorkoutById(id: number): Promise<WorkoutWithCheckin | null> {
  const db = await getDatabase();
  const workout = await db.getFirstAsync<Workout>(
    'SELECT * FROM workouts WHERE id = ?',
    id
  );
  if (!workout) return null;

  const checkin = await db.getFirstAsync<Checkin>(
    'SELECT * FROM checkins WHERE workout_id = ? LIMIT 1',
    workout.id
  );

  return { ...workout, checkin: checkin ?? undefined };
}

export async function getWorkoutCount(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM workouts'
  );
  return result?.count ?? 0;
}

export async function savePendingWorkout(pending: PendingWorkout): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO pending_workout (id, walk_interval_seconds, jog_interval_seconds, planned_duration_seconds, start_time, elapsed_seconds)
     VALUES (1, ?, ?, ?, ?, ?)`,
    pending.walk_interval_seconds,
    pending.jog_interval_seconds,
    pending.planned_duration_seconds,
    pending.start_time,
    pending.elapsed_seconds
  );
}

export async function getPendingWorkout(): Promise<PendingWorkout | null> {
  const db = await getDatabase();
  return db.getFirstAsync<PendingWorkout>(
    'SELECT * FROM pending_workout WHERE id = 1'
  );
}

export async function clearPendingWorkout(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM pending_workout WHERE id = 1');
}
