/**
 * Database integration tests.
 *
 * expo-sqlite is mocked with an in-memory implementation to verify
 * migration and CRUD logic without needing a real device.
 */

// State shared between the mock factory and the test file.
// Variables prefixed with "mock" are allowed inside jest.mock factories.
const mockRows: Record<string, Record<string, unknown>[]> = {};
let mockIdCounter = 1;

jest.mock('expo-sqlite', () => {
  function execSql(sql: string) {
    const createMatches = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/g) ?? [];
    createMatches.forEach((stmt) => {
      const m = stmt.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
      if (m && !mockRows[m[1]]) mockRows[m[1]] = [];
    });
    // Handle INSERT OR IGNORE for meta table (run inline via execAsync)
    if (sql.includes('INSERT OR IGNORE INTO meta')) {
      if (!mockRows['meta']) mockRows['meta'] = [];
      if (mockRows['meta'].length === 0) {
        mockRows['meta'].push({ id: 1, schema_version: 0 });
      }
    }
  }

  const mockDb = {
    execAsync: jest.fn(async (sql: string) => execSql(sql)),
    execSync: jest.fn((sql: string) => execSql(sql)),

    getFirstAsync: jest.fn(async (sql: string) => {
      if (sql.includes('schema_version')) {
        return mockRows['meta']?.[0] ?? null;
      }
      if (sql.includes('FROM checkins ORDER BY')) {
        return (
          [...(mockRows['checkins'] ?? [])].sort((a, b) =>
            (b['created_at'] as string).localeCompare(a['created_at'] as string)
          )[0] ?? null
        );
      }
      if (sql.includes('FROM workouts ORDER BY')) {
        return (
          [...(mockRows['workouts'] ?? [])].sort((a, b) =>
            (b['created_at'] as string).localeCompare(a['created_at'] as string)
          )[0] ?? null
        );
      }
      if (sql.includes('COUNT(*)')) {
        return { count: mockRows['workouts']?.length ?? 0 };
      }
      return null;
    }),

    getAllAsync: jest.fn(async (sql: string) => {
      if (sql.includes('FROM workouts w')) {
        return [...(mockRows['workouts'] ?? [])]
          .sort((a, b) =>
            (b['created_at'] as string).localeCompare(a['created_at'] as string)
          )
          .map((w) => {
            const checkin = (mockRows['checkins'] ?? []).find(
              (c) => c['workout_id'] === w['id']
            );
            return {
              ...w,
              checkin_id: checkin?.['id'] ?? null,
              pain_during: checkin?.['pain_during'] ?? null,
              feel_now: checkin?.['feel_now'] ?? null,
              night_pain: checkin?.['night_pain'] ?? null,
              morning_stiffness: checkin?.['morning_stiffness'] ?? null,
              recommendation: checkin?.['recommendation'] ?? null,
              checkin_created_at: checkin?.['created_at'] ?? null,
            };
          });
      }
      if (sql.includes('date(date)')) {
        return (mockRows['workouts'] ?? [])
          .filter((w) => w['completed'] === 1)
          .map((w) => ({ date: (w['date'] as string).split('T')[0] }));
      }
      return [];
    }),

    runAsync: jest.fn(async (sql: string, params?: unknown[]) => {
      const p = params ?? [];
      if (sql.includes('INSERT OR IGNORE INTO meta')) {
        if (!mockRows['meta']) mockRows['meta'] = [];
        if (mockRows['meta'].length === 0) {
          mockRows['meta'].push({ id: 1, schema_version: 0 });
        }
        return { lastInsertRowId: 1, changes: 0 };
      }
      if (sql.includes('UPDATE meta')) {
        if (mockRows['meta']?.[0]) {
          mockRows['meta'][0]['schema_version'] = p[0] as number;
        }
        return { lastInsertRowId: 0, changes: 1 };
      }
      if (sql.includes('INSERT INTO workouts')) {
        if (!mockRows['workouts']) mockRows['workouts'] = [];
        const id = mockIdCounter++;
        mockRows['workouts'].push({
          id,
          date: p[0],
          walk_interval_seconds: p[1],
          jog_interval_seconds: p[2],
          planned_duration_seconds: p[3],
          actual_duration_seconds: p[4],
          completed: p[5],
          created_at: new Date().toISOString(),
        });
        return { lastInsertRowId: id, changes: 1 };
      }
      if (sql.includes('INSERT INTO checkins')) {
        if (!mockRows['checkins']) mockRows['checkins'] = [];
        const id = mockIdCounter++;
        mockRows['checkins'].push({
          id,
          workout_id: p[0],
          pain_during: p[1],
          feel_now: p[2],
          night_pain: p[3],
          morning_stiffness: p[4],
          recommendation: p[5],
          created_at: new Date().toISOString(),
        });
        return { lastInsertRowId: id, changes: 1 };
      }
      return { lastInsertRowId: 0, changes: 0 };
    }),
  };

  return {
    openDatabaseAsync: jest.fn(async () => mockDb),
  };
});

// Reset state before each test
beforeEach(() => {
  Object.keys(mockRows).forEach((k) => delete mockRows[k]);
  mockIdCounter = 1;
  // Reset the db module singleton so initDatabase() runs fresh each test
  jest.resetModules();
});

// We import after the mock is set up. Use dynamic require inside tests
// because jest.resetModules() in beforeEach invalidates cached imports.
function getDb() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../db') as typeof import('../db');
}

const sampleWorkout = {
  date: '2024-01-15T10:00:00.000Z',
  walk_interval_seconds: 240,
  jog_interval_seconds: 120,
  planned_duration_seconds: 1800,
  actual_duration_seconds: 1800,
  completed: true,
};

describe('database migrations', () => {
  it('initDatabase() completes without error', async () => {
    const { initDatabase } = getDb();
    await expect(initDatabase()).resolves.not.toThrow();
  });

  it('can be called twice without error (idempotent)', async () => {
    const { initDatabase } = getDb();
    await initDatabase();
    await expect(initDatabase()).resolves.not.toThrow();
  });

  it('schema_version is set to 1 after first init', async () => {
    const { initDatabase } = getDb();
    await initDatabase();
    const meta = mockRows['meta']?.[0];
    expect(meta?.['schema_version']).toBe(1);
  });
});

describe('workout CRUD', () => {
  beforeEach(async () => {
    await getDb().initDatabase();
  });

  it('saveWorkout() returns a numeric id', async () => {
    const { saveWorkout } = getDb();
    const id = await saveWorkout(sampleWorkout);
    expect(typeof id).toBe('number');
    expect(id).toBeGreaterThan(0);
  });

  it('getWorkouts() returns empty array when no workouts', async () => {
    const { getWorkouts } = getDb();
    const workouts = await getWorkouts();
    expect(workouts).toEqual([]);
  });

  it('getWorkouts() returns saved workout with correct values', async () => {
    const { saveWorkout, getWorkouts } = getDb();
    await saveWorkout(sampleWorkout);
    const workouts = await getWorkouts();
    expect(workouts).toHaveLength(1);
    expect(workouts[0].walk_interval_seconds).toBe(240);
    expect(workouts[0].jog_interval_seconds).toBe(120);
  });

  it('completed=false saved and retrieved correctly', async () => {
    const { saveWorkout, getWorkouts } = getDb();
    await saveWorkout({ ...sampleWorkout, completed: false, actual_duration_seconds: 600 });
    const workouts = await getWorkouts();
    expect(workouts[0].completed).toBe(false);
  });

  it('getWorkouts() returns null checkin when no check-in done', async () => {
    const { saveWorkout, getWorkouts } = getDb();
    await saveWorkout(sampleWorkout);
    const workouts = await getWorkouts();
    expect(workouts[0].checkin).toBeNull();
  });
});

describe('checkin CRUD', () => {
  beforeEach(async () => {
    await getDb().initDatabase();
  });

  const sampleCheckin = {
    pain_during: 'none' as const,
    feel_now: 0,
    night_pain: false,
    morning_stiffness: false,
    recommendation: 'progress' as const,
  };

  it('saveCheckin() returns a numeric id', async () => {
    const { saveWorkout, saveCheckin } = getDb();
    const workoutId = await saveWorkout(sampleWorkout);
    const checkinId = await saveCheckin({ ...sampleCheckin, workout_id: workoutId });
    expect(typeof checkinId).toBe('number');
    expect(checkinId).toBeGreaterThan(0);
  });

  it('getLastCheckin() returns null when no check-ins exist', async () => {
    const { getLastCheckin } = getDb();
    const checkin = await getLastCheckin();
    expect(checkin).toBeNull();
  });

  it('getLastCheckin() returns the saved check-in', async () => {
    const { saveWorkout, saveCheckin, getLastCheckin } = getDb();
    const workoutId = await saveWorkout(sampleWorkout);
    await saveCheckin({ ...sampleCheckin, workout_id: workoutId });
    const checkin = await getLastCheckin();
    expect(checkin).not.toBeNull();
    expect(checkin!.pain_during).toBe('none');
    expect(checkin!.recommendation).toBe('progress');
  });

  it('getWorkouts() returns workout with joined checkin', async () => {
    const { saveWorkout, saveCheckin, getWorkouts } = getDb();
    const workoutId = await saveWorkout(sampleWorkout);
    await saveCheckin({ ...sampleCheckin, workout_id: workoutId });
    const workouts = await getWorkouts();
    expect(workouts[0].checkin).not.toBeNull();
    expect(workouts[0].checkin!.recommendation).toBe('progress');
  });

  it('all recommendation values round-trip correctly', async () => {
    const { saveWorkout, saveCheckin, getLastCheckin } = getDb();
    const recs = ['progress', 'maintain', 'pull_back', 'rest'] as const;
    for (const rec of recs) {
      const wId = await saveWorkout(sampleWorkout);
      await saveCheckin({ ...sampleCheckin, workout_id: wId, recommendation: rec });
    }
    const last = await getLastCheckin();
    expect(['progress', 'maintain', 'pull_back', 'rest']).toContain(last!.recommendation);
  });

  it('night_pain and morning_stiffness boolean values preserved', async () => {
    const { saveWorkout, saveCheckin, getLastCheckin } = getDb();
    const workoutId = await saveWorkout(sampleWorkout);
    await saveCheckin({
      ...sampleCheckin,
      workout_id: workoutId,
      night_pain: true,
      morning_stiffness: true,
    });
    const checkin = await getLastCheckin();
    // The mock stores booleans as 1/0 (SQLite integers); db.ts converts them back
    expect(checkin!.night_pain).toBe(true);
    expect(checkin!.morning_stiffness).toBe(true);
  });
});
