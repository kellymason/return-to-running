import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export type PainDuring = 'none' | 'start_then_gone' | 'worsened' | 'constant';
export type Recommendation = 'progress' | 'maintain' | 'pull_back' | 'rest';

export interface Workout {
  id: number;
  date: string;
  walk_interval_seconds: number;
  jog_interval_seconds: number;
  planned_duration_seconds: number;
  actual_duration_seconds: number;
  completed: boolean;
  created_at: string;
}

export interface Checkin {
  id: number;
  workout_id: number;
  pain_during: PainDuring;
  feel_now: number;
  night_pain: boolean;
  morning_stiffness: boolean;
  recommendation: Recommendation;
  created_at: string;
}

export interface WorkoutWithCheckin extends Workout {
  checkin: Checkin | null;
}

export interface SaveWorkoutInput {
  date: string;
  walk_interval_seconds: number;
  jog_interval_seconds: number;
  planned_duration_seconds: number;
  actual_duration_seconds: number;
  completed: boolean;
}

export interface SaveCheckinInput {
  workout_id: number;
  pain_during: PainDuring;
  feel_now: number;
  night_pain: boolean;
  morning_stiffness: boolean;
  recommendation: Recommendation;
}

// Migrations run in sequence. Never modify existing migrations — add new ones.
const migrations: Array<(db: SQLite.SQLiteDatabase) => void> = [
  // Migration 1: initial schema
  (db) => {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        walk_interval_seconds INTEGER NOT NULL,
        jog_interval_seconds INTEGER NOT NULL,
        planned_duration_seconds INTEGER NOT NULL DEFAULT 1800,
        actual_duration_seconds INTEGER NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS checkins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_id INTEGER NOT NULL REFERENCES workouts(id),
        pain_during TEXT NOT NULL,
        feel_now INTEGER NOT NULL,
        night_pain INTEGER NOT NULL,
        morning_stiffness INTEGER NOT NULL,
        recommendation TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  },
];

export async function initDatabase(): Promise<void> {
  db = await SQLite.openDatabaseAsync('return-to-running.db');

  // Ensure meta table exists
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS meta (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      schema_version INTEGER NOT NULL DEFAULT 0
    );
    INSERT OR IGNORE INTO meta (id, schema_version) VALUES (1, 0);
  `);

  const row = await db.getFirstAsync<{ schema_version: number }>(
    'SELECT schema_version FROM meta WHERE id = 1'
  );
  const currentVersion = row?.schema_version ?? 0;

  for (let i = currentVersion; i < migrations.length; i++) {
    migrations[i](db);
    await db.runAsync('UPDATE meta SET schema_version = ? WHERE id = 1', [i + 1]);
  }
}

function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export async function saveWorkout(input: SaveWorkoutInput): Promise<number> {
  const result = await getDb().runAsync(
    `INSERT INTO workouts
       (date, walk_interval_seconds, jog_interval_seconds, planned_duration_seconds,
        actual_duration_seconds, completed)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.date,
      input.walk_interval_seconds,
      input.jog_interval_seconds,
      input.planned_duration_seconds,
      input.actual_duration_seconds,
      input.completed ? 1 : 0,
    ]
  );
  return result.lastInsertRowId;
}

export async function saveCheckin(input: SaveCheckinInput): Promise<number> {
  const result = await getDb().runAsync(
    `INSERT INTO checkins
       (workout_id, pain_during, feel_now, night_pain, morning_stiffness, recommendation)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.workout_id,
      input.pain_during,
      input.feel_now,
      input.night_pain ? 1 : 0,
      input.morning_stiffness ? 1 : 0,
      input.recommendation,
    ]
  );
  return result.lastInsertRowId;
}

export async function getWorkouts(): Promise<WorkoutWithCheckin[]> {
  const rows = await getDb().getAllAsync<
    Workout & {
      checkin_id: number | null;
      pain_during: PainDuring | null;
      feel_now: number | null;
      night_pain: number | null;
      morning_stiffness: number | null;
      recommendation: Recommendation | null;
      checkin_created_at: string | null;
    }
  >(
    `SELECT
       w.*,
       c.id AS checkin_id,
       c.pain_during,
       c.feel_now,
       c.night_pain,
       c.morning_stiffness,
       c.recommendation,
       c.created_at AS checkin_created_at
     FROM workouts w
     LEFT JOIN checkins c ON c.workout_id = w.id
     ORDER BY w.created_at DESC`
  );

  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    walk_interval_seconds: row.walk_interval_seconds,
    jog_interval_seconds: row.jog_interval_seconds,
    planned_duration_seconds: row.planned_duration_seconds,
    actual_duration_seconds: row.actual_duration_seconds,
    completed: Boolean(row.completed),
    created_at: row.created_at,
    checkin:
      row.checkin_id != null
        ? {
            id: row.checkin_id,
            workout_id: row.id,
            pain_during: row.pain_during!,
            feel_now: row.feel_now!,
            night_pain: Boolean(row.night_pain),
            morning_stiffness: Boolean(row.morning_stiffness),
            recommendation: row.recommendation!,
            created_at: row.checkin_created_at!,
          }
        : null,
  }));
}

export async function getWorkoutWithCheckin(id: number): Promise<WorkoutWithCheckin | null> {
  const all = await getWorkouts();
  return all.find((w) => w.id === id) ?? null;
}

export async function getLastCheckin(): Promise<Checkin | null> {
  const row = await getDb().getFirstAsync<{
    id: number;
    workout_id: number;
    pain_during: PainDuring;
    feel_now: number;
    night_pain: number;
    morning_stiffness: number;
    recommendation: Recommendation;
    created_at: string;
  }>('SELECT * FROM checkins ORDER BY created_at DESC LIMIT 1');

  if (!row) return null;

  return {
    id: row.id,
    workout_id: row.workout_id,
    pain_during: row.pain_during,
    feel_now: row.feel_now,
    night_pain: Boolean(row.night_pain),
    morning_stiffness: Boolean(row.morning_stiffness),
    recommendation: row.recommendation,
    created_at: row.created_at,
  };
}

export async function getLastWorkout(): Promise<Workout | null> {
  const row = await getDb().getFirstAsync<Workout>(
    'SELECT * FROM workouts ORDER BY created_at DESC LIMIT 1'
  );
  if (!row) return null;
  return { ...row, completed: Boolean(row.completed) };
}

export async function getTotalWorkouts(): Promise<number> {
  const row = await getDb().getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM workouts'
  );
  return row?.count ?? 0;
}

export async function getCurrentStreak(): Promise<number> {
  // Count consecutive days with at least one completed workout, going back from today
  const rows = await getDb().getAllAsync<{ date: string }>(
    `SELECT DISTINCT date(date) as date
     FROM workouts
     WHERE completed = 1
     ORDER BY date DESC`
  );

  if (rows.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < rows.length; i++) {
    const workoutDate = new Date(rows[i].date);
    workoutDate.setHours(0, 0, 0, 0);
    const expectedDate = new Date(today);
    expectedDate.setDate(today.getDate() - i);

    if (workoutDate.getTime() === expectedDate.getTime()) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
