import {
  computeRecommendation,
  suggestNextIntervals,
} from '../recommendations';

const noIssues = {
  pain_during: 'none' as const,
  feel_now: 0,
  night_pain: false,
  morning_stiffness: false,
};

describe('computeRecommendation', () => {
  describe('rest — night pain overrides everything', () => {
    it('night_pain=true always returns "rest"', () => {
      expect(computeRecommendation({ ...noIssues, night_pain: true })).toBe('rest');
    });

    it('night_pain=true + perfect other scores → still "rest"', () => {
      expect(
        computeRecommendation({
          pain_during: 'none',
          feel_now: 0,
          night_pain: true,
          morning_stiffness: false,
        })
      ).toBe('rest');
    });

    it('night_pain=true + worsened pain → "rest" (not "pull_back")', () => {
      expect(
        computeRecommendation({
          pain_during: 'worsened',
          feel_now: 8,
          night_pain: true,
          morning_stiffness: true,
        })
      ).toBe('rest');
    });
  });

  describe('pull_back', () => {
    it('pain_during="worsened" → "pull_back"', () => {
      expect(computeRecommendation({ ...noIssues, pain_during: 'worsened' })).toBe('pull_back');
    });

    it('pain_during="constant" → "pull_back"', () => {
      expect(computeRecommendation({ ...noIssues, pain_during: 'constant' })).toBe('pull_back');
    });

    it('feel_now=6 → "pull_back"', () => {
      expect(computeRecommendation({ ...noIssues, feel_now: 6 })).toBe('pull_back');
    });

    it('feel_now=7 → "pull_back"', () => {
      expect(computeRecommendation({ ...noIssues, feel_now: 7 })).toBe('pull_back');
    });

    it('feel_now=10 → "pull_back"', () => {
      expect(computeRecommendation({ ...noIssues, feel_now: 10 })).toBe('pull_back');
    });

    it('morning_stiffness=true + no night pain → "pull_back"', () => {
      expect(computeRecommendation({ ...noIssues, morning_stiffness: true })).toBe('pull_back');
    });
  });

  describe('maintain', () => {
    it('pain_during="start_then_gone" + feel_now=3 → "maintain"', () => {
      expect(
        computeRecommendation({ ...noIssues, pain_during: 'start_then_gone', feel_now: 3 })
      ).toBe('maintain');
    });

    it('pain_during="start_then_gone" + feel_now=5 → "maintain"', () => {
      expect(
        computeRecommendation({ ...noIssues, pain_during: 'start_then_gone', feel_now: 5 })
      ).toBe('maintain');
    });

    it('pain_during="none" + feel_now=3 → "maintain"', () => {
      expect(computeRecommendation({ ...noIssues, feel_now: 3 })).toBe('maintain');
    });

    it('pain_during="none" + feel_now=5 → "maintain"', () => {
      expect(computeRecommendation({ ...noIssues, feel_now: 5 })).toBe('maintain');
    });

    it('pain_during="start_then_gone" + feel_now=0 → "maintain" (pain factor wins)', () => {
      expect(
        computeRecommendation({ ...noIssues, pain_during: 'start_then_gone', feel_now: 0 })
      ).toBe('maintain');
    });
  });

  describe('progress', () => {
    it('no pain + feel_now=0 → "progress"', () => {
      expect(computeRecommendation(noIssues)).toBe('progress');
    });

    it('no pain + feel_now=2 → "progress"', () => {
      expect(computeRecommendation({ ...noIssues, feel_now: 2 })).toBe('progress');
    });

    it('no pain + feel_now=1 → "progress"', () => {
      expect(computeRecommendation({ ...noIssues, feel_now: 1 })).toBe('progress');
    });
  });

  describe('boundary conditions', () => {
    it('feel_now=2 → "progress" (boundary)', () => {
      expect(computeRecommendation({ ...noIssues, feel_now: 2 })).toBe('progress');
    });

    it('feel_now=3 → "maintain" (boundary)', () => {
      expect(computeRecommendation({ ...noIssues, feel_now: 3 })).toBe('maintain');
    });

    it('feel_now=5 → "maintain" (boundary)', () => {
      expect(computeRecommendation({ ...noIssues, feel_now: 5 })).toBe('maintain');
    });

    it('feel_now=6 → "pull_back" (boundary)', () => {
      expect(computeRecommendation({ ...noIssues, feel_now: 6 })).toBe('pull_back');
    });
  });
});

describe('suggestNextIntervals', () => {
  describe('progress', () => {
    it('increases jog by 60s, decreases walk by 60s', () => {
      const result = suggestNextIntervals(240, 120, 'progress');
      expect(result.walkSecs).toBe(180);
      expect(result.jogSecs).toBe(180);
      expect(result.isPhaseV).toBe(false);
    });

    it('larger values: 5 min walk / 3 min jog → 4 min walk / 4 min jog', () => {
      const result = suggestNextIntervals(300, 180, 'progress');
      expect(result.walkSecs).toBe(240);
      expect(result.jogSecs).toBe(240);
    });

    it('walk=120s (2 min) → walk becomes 60s (1 min, still valid)', () => {
      const result = suggestNextIntervals(120, 120, 'progress');
      expect(result.walkSecs).toBe(60);
      expect(result.isPhaseV).toBe(false);
    });

    it('walk=60s (1 min) → triggers Phase V transition (null walkSecs)', () => {
      const result = suggestNextIntervals(60, 300, 'progress');
      expect(result.walkSecs).toBeNull();
      expect(result.isPhaseV).toBe(true);
    });

    it('walk=90s → walk=30s < 60s → triggers Phase V', () => {
      const result = suggestNextIntervals(90, 120, 'progress');
      expect(result.walkSecs).toBeNull();
      expect(result.isPhaseV).toBe(true);
    });
  });

  describe('maintain', () => {
    it('returns exact same walk and jog values', () => {
      const result = suggestNextIntervals(240, 120, 'maintain');
      expect(result.walkSecs).toBe(240);
      expect(result.jogSecs).toBe(120);
      expect(result.isPhaseV).toBe(false);
    });
  });

  describe('pull_back', () => {
    it('decreases jog by 60s, increases walk by 60s', () => {
      const result = suggestNextIntervals(240, 180, 'pull_back');
      expect(result.walkSecs).toBe(300);
      expect(result.jogSecs).toBe(120);
    });

    it('jog=60s → jog stays at minimum (60s)', () => {
      const result = suggestNextIntervals(240, 60, 'pull_back');
      expect(result.jogSecs).toBe(60); // Can't go below MIN_JOG_SECS
      expect(result.walkSecs).toBe(300);
    });
  });

  describe('rest', () => {
    it('returns exact same walk and jog values (rest = no change)', () => {
      const result = suggestNextIntervals(240, 120, 'rest');
      expect(result.walkSecs).toBe(240);
      expect(result.jogSecs).toBe(120);
      expect(result.isPhaseV).toBe(false);
    });
  });
});
