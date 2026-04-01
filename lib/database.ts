import * as SQLite from 'expo-sqlite';

const DB_NAME = 'return-to-running.db';
const CURRENT_SCHEMA_VERSION = 1;

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync(DB_NAME);
  await runMigrations(db);
  return db;
}

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  // Create schema version table if it doesn't exist
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER NOT NULL
    );
  `);

  const row = await database.getFirstAsync<{ version: number }>(
    'SELECT version FROM schema_version LIMIT 1'
  );
  const currentVersion = row?.version ?? 0;

  if (currentVersion < 1) {
    await migration_001(database);
  }

  // Update or insert version
  if (currentVersion === 0) {
    await database.runAsync(
      'INSERT INTO schema_version (version) VALUES (?)',
      CURRENT_SCHEMA_VERSION
    );
  } else if (currentVersion < CURRENT_SCHEMA_VERSION) {
    await database.runAsync(
      'UPDATE schema_version SET version = ?',
      CURRENT_SCHEMA_VERSION
    );
  }
}

async function migration_001(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
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

    CREATE TABLE IF NOT EXISTS pending_workout (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      walk_interval_seconds INTEGER NOT NULL,
      jog_interval_seconds INTEGER NOT NULL,
      planned_duration_seconds INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      elapsed_seconds INTEGER NOT NULL DEFAULT 0
    );
  `);
}
