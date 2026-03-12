/**
 * Tests for the timer's wall-clock pause/resume logic.
 * These are pure unit tests for the helper functions used in timer.tsx.
 */
import { computeElapsedSecs } from '../../lib/intervals';

describe('timer wall-clock pause/resume logic', () => {
  it('elapsed time is correctly calculated from start time', () => {
    const startMs = 1000;
    const nowMs = 61000; // 60 seconds later
    const elapsed = computeElapsedSecs(startMs, 0, nowMs);
    expect(elapsed).toBeCloseTo(60);
  });

  it('pausing reduces elapsed time by the pause duration', () => {
    const startMs = 0;
    const pausedDurationMs = 10000; // 10 seconds paused
    const nowMs = 70000; // 70 seconds after start
    const elapsed = computeElapsedSecs(startMs, pausedDurationMs, nowMs);
    expect(elapsed).toBeCloseTo(60); // 70 - 10 = 60 effective seconds
  });

  it('multiple pause periods accumulate correctly', () => {
    const startMs = 0;
    // Total paused: 5s + 3s = 8s
    const totalPausedMs = 8000;
    const nowMs = 68000;
    const elapsed = computeElapsedSecs(startMs, totalPausedMs, nowMs);
    expect(elapsed).toBeCloseTo(60);
  });

  it('pause does not corrupt elapsed — resuming after 30s pause then running 30s = 30s elapsed', () => {
    const startMs = 0;
    const nowMs = 60000; // 60s wall clock
    const pausedDurationMs = 30000; // 30s paused
    const elapsed = computeElapsedSecs(startMs, pausedDurationMs, nowMs);
    expect(elapsed).toBeCloseTo(30);
  });

  it('elapsed never goes negative', () => {
    // Future start time
    const startMs = Date.now() + 10000;
    const elapsed = computeElapsedSecs(startMs, 0);
    expect(elapsed).toBe(0);
  });

  it('pausing immediately after start yields 0 elapsed on resume', () => {
    const startMs = 1000;
    const pausedMs = 5000;
    const resumeMs = 6000; // started 1s, paused immediately for 5s
    const elapsed = computeElapsedSecs(startMs, pausedMs, resumeMs);
    expect(elapsed).toBeCloseTo(0);
  });

  it('back-to-back pause/resume cycles stay accurate after each cycle', () => {
    // Simulate: run 10s, pause 5s, run 10s, pause 5s, check at 30s wall clock
    // Effective elapsed = 30 - 5 - 5 = 20s
    const startMs = 0;
    const totalPausedMs = 10000;
    const nowMs = 30000;
    expect(computeElapsedSecs(startMs, totalPausedMs, nowMs)).toBeCloseTo(20);
  });
});
