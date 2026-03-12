import {
  buildIntervalSequence,
  getCurrentInterval,
  getTransitionTimes,
  computeElapsedSecs,
  formatSeconds,
} from '../intervals';

const TOTAL_SECS = 1800;
const MIN_COOLDOWN_SECS = 180;

describe('buildIntervalSequence', () => {
  describe('standard case: 4 min walk / 2 min jog', () => {
    const { intervals, shouldWarnLongCooldown } = buildIntervalSequence(240, 120);

    it('always starts with a walk interval', () => {
      expect(intervals[0].type).toBe('walk');
    });

    it('alternates walk and jog before the cooldown', () => {
      const nonCooldown = intervals.filter((i) => i.type !== 'cooldown');
      for (let i = 0; i < nonCooldown.length; i++) {
        expect(nonCooldown[i].type).toBe(i % 2 === 0 ? 'walk' : 'jog');
      }
    });

    it('total duration sums to exactly 1800 seconds', () => {
      const total = intervals.reduce((sum, i) => sum + i.durationSecs, 0);
      expect(total).toBe(TOTAL_SECS);
    });

    it('each interval has correct cumulative startSecs', () => {
      let cursor = 0;
      for (const interval of intervals) {
        expect(interval.startSecs).toBe(cursor);
        cursor += interval.durationSecs;
      }
    });

    it('last interval is labeled cooldown', () => {
      expect(intervals[intervals.length - 1].type).toBe('cooldown');
    });

    it('does not warn about long cooldown', () => {
      expect(shouldWarnLongCooldown).toBe(false);
    });
  });

  describe('cooldown edge case: 4 min walk / 3 min jog', () => {
    // 4 cycles = 28 min → 2 min left < MIN_COOLDOWN (3 min) → drop to 3 cycles (21 min) → 9 min cooldown
    const { intervals, shouldWarnLongCooldown } = buildIntervalSequence(240, 180);

    it('uses 3 full cycles, not 4', () => {
      const jogCount = intervals.filter((i) => i.type === 'jog').length;
      expect(jogCount).toBe(3);
    });

    it('cooldown is 9 minutes (540 seconds)', () => {
      const cooldown = intervals[intervals.length - 1];
      expect(cooldown.type).toBe('cooldown');
      expect(cooldown.durationSecs).toBe(540);
    });

    it('warns about long cooldown (> 8 min)', () => {
      expect(shouldWarnLongCooldown).toBe(true);
    });

    it('total still sums to 1800 seconds', () => {
      const total = intervals.reduce((sum, i) => sum + i.durationSecs, 0);
      expect(total).toBe(TOTAL_SECS);
    });
  });

  describe('cooldown boundary conditions', () => {
    it('cooldown exactly 3 min (180s) is accepted without dropping a cycle', () => {
      // Need walk + jog = X where (1800 - N*X) = 180
      // 1620 / cycleSecs = integer
      // cycleSecs = 540 → walk=300, jog=240 → 3 cycles = 1620 → 180s left
      const { intervals, shouldWarnLongCooldown } = buildIntervalSequence(300, 240);
      const cooldown = intervals[intervals.length - 1];
      expect(cooldown.durationSecs).toBe(180);
      expect(shouldWarnLongCooldown).toBe(false);
    });

    it('cooldown exactly 8 min (480s) does not warn', () => {
      // walk=200, jog=240: cycle=440, maxCycles=floor(1620/440)=3
      // 3 * 440 = 1320 → remainder = 480s → exactly WARN threshold, not > it
      const { intervals, shouldWarnLongCooldown } = buildIntervalSequence(200, 240);
      const cooldown = intervals[intervals.length - 1];
      expect(cooldown.durationSecs).toBe(480);
      expect(shouldWarnLongCooldown).toBe(false);
    });

    it('cooldown just over 8 min warns', () => {
      const { shouldWarnLongCooldown } = buildIntervalSequence(240, 180); // 9 min cooldown
      expect(shouldWarnLongCooldown).toBe(true);
    });
  });

  describe('type labeling', () => {
    it('walk intervals are labeled "walk"', () => {
      const { intervals } = buildIntervalSequence(240, 120);
      const walkIntervals = intervals.filter((i) => i.type === 'walk');
      expect(walkIntervals.length).toBeGreaterThan(0);
      walkIntervals.forEach((i) => expect(i.type).toBe('walk'));
    });

    it('jog intervals are labeled "jog"', () => {
      const { intervals } = buildIntervalSequence(240, 120);
      const jogIntervals = intervals.filter((i) => i.type === 'jog');
      expect(jogIntervals.length).toBeGreaterThan(0);
      jogIntervals.forEach((i) => expect(i.type).toBe('jog'));
    });

    it('only the last interval is labeled "cooldown"', () => {
      const { intervals } = buildIntervalSequence(240, 120);
      const cooldownIntervals = intervals.filter((i) => i.type === 'cooldown');
      expect(cooldownIntervals.length).toBe(1);
      expect(intervals[intervals.length - 1].type).toBe('cooldown');
    });
  });

  describe('edge cases', () => {
    it('1 min walk / 1 min jog produces a valid sequence summing to 1800s', () => {
      const { intervals } = buildIntervalSequence(60, 60);
      const total = intervals.reduce((sum, i) => sum + i.durationSecs, 0);
      expect(total).toBe(TOTAL_SECS);
      expect(intervals[0].type).toBe('walk');
      expect(intervals[intervals.length - 1].type).toBe('cooldown');
    });

    it('large walk/small jog (25 min walk / 1 min jog) produces valid sequence', () => {
      const { intervals } = buildIntervalSequence(1500, 60);
      const total = intervals.reduce((sum, i) => sum + i.durationSecs, 0);
      expect(total).toBe(TOTAL_SECS);
    });

    it('when remainder is exactly 0, the cooldown is extended to MIN_COOLDOWN', () => {
      // walk=600, jog=600: cycle=1200, 1 cycle=1200s, remainder=600 — that's > 180
      // walk=300, jog=300: cycle=600, 2 cycles=1200, remainder=600 — > 180
      // Find a case where it divides evenly:
      // walk=300, jog=600: cycle=900, 2 cycles=1800 — remainder 0 → need to drop a cycle
      const { intervals } = buildIntervalSequence(300, 600);
      const total = intervals.reduce((sum, i) => sum + i.durationSecs, 0);
      expect(total).toBe(TOTAL_SECS);
      const cooldown = intervals[intervals.length - 1];
      expect(cooldown.durationSecs).toBeGreaterThanOrEqual(MIN_COOLDOWN_SECS);
    });
  });
});

describe('getCurrentInterval', () => {
  const { intervals } = buildIntervalSequence(240, 120); // 4min walk, 2min jog

  it('elapsed=0 → first interval, correct secondsRemaining', () => {
    const result = getCurrentInterval(intervals, 0);
    expect(result).not.toBeNull();
    expect(result!.interval.type).toBe('walk');
    expect(result!.secondsRemainingInInterval).toBe(240);
    expect(result!.index).toBe(0);
  });

  it('elapsed = first interval duration - 1 → still in first interval', () => {
    const result = getCurrentInterval(intervals, 239);
    expect(result!.interval.type).toBe('walk');
    expect(result!.secondsRemainingInInterval).toBe(1);
  });

  it('elapsed = first interval duration → transitions to second interval (jog)', () => {
    const result = getCurrentInterval(intervals, 240);
    expect(result!.interval.type).toBe('jog');
    expect(result!.secondsRemainingInInterval).toBe(120);
  });

  it('elapsed in the middle of the third interval', () => {
    // After walk(240) + jog(120) + 60 into next walk = 420
    const result = getCurrentInterval(intervals, 420);
    expect(result!.interval.type).toBe('walk');
    expect(result!.secondsRemainingInInterval).toBe(180); // 240 - 60
  });

  it('elapsed = TOTAL_SECS - 1 → last interval (cooldown)', () => {
    const result = getCurrentInterval(intervals, TOTAL_SECS - 1);
    expect(result!.interval.type).toBe('cooldown');
  });

  it('elapsed >= TOTAL_SECS → returns null (workout complete)', () => {
    expect(getCurrentInterval(intervals, TOTAL_SECS)).toBeNull();
    expect(getCurrentInterval(intervals, TOTAL_SECS + 100)).toBeNull();
  });
});

describe('getTransitionTimes', () => {
  const { intervals } = buildIntervalSequence(240, 120);
  const startTimeMs = 1_000_000_000; // arbitrary timestamp

  const times = getTransitionTimes(intervals, startTimeMs);

  it('returns one timestamp per interval', () => {
    expect(times).toHaveLength(intervals.length);
  });

  it('first timestamp = startTimeMs + first interval duration in ms', () => {
    expect(times[0]).toBe(startTimeMs + intervals[0].durationSecs * 1000);
  });

  it('last timestamp = startTimeMs + 1800 seconds in ms (completion)', () => {
    expect(times[times.length - 1]).toBe(startTimeMs + TOTAL_SECS * 1000);
  });

  it('timestamps are monotonically increasing', () => {
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThan(times[i - 1]);
    }
  });
});

describe('computeElapsedSecs', () => {
  it('returns 0 when now = startTime', () => {
    const t = Date.now();
    expect(computeElapsedSecs(t, 0, t)).toBe(0);
  });

  it('correctly subtracts paused duration from elapsed', () => {
    const start = 1000;
    const now = 3000; // 2 seconds later
    const paused = 500; // 0.5 seconds paused
    expect(computeElapsedSecs(start, paused, now)).toBeCloseTo(1.5);
  });

  it('never returns negative values', () => {
    expect(computeElapsedSecs(Date.now() + 10000, 0)).toBe(0);
  });
});

describe('formatSeconds', () => {
  it('formats 0 as 00:00', () => {
    expect(formatSeconds(0)).toBe('00:00');
  });

  it('formats 60 as 01:00', () => {
    expect(formatSeconds(60)).toBe('01:00');
  });

  it('formats 90 as 01:30', () => {
    expect(formatSeconds(90)).toBe('01:30');
  });

  it('formats 1800 as 30:00', () => {
    expect(formatSeconds(1800)).toBe('30:00');
  });

  it('handles negative values by clamping to 0', () => {
    expect(formatSeconds(-5)).toBe('00:00');
  });
});
