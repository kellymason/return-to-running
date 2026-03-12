import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { IntervalTimer } from '../components/IntervalTimer';
import {
  buildIntervalSequence,
  getCurrentInterval,
  computeElapsedSecs,
  formatDurationLabel,
  formatSeconds,
  Interval,
} from '../lib/intervals';
import { saveWorkout } from '../lib/db';
import {
  scheduleWorkoutNotifications,
  cancelWorkoutNotifications,
  showProgressNotification,
  dismissProgressNotification,
} from '../lib/notifications';
import { playTransitionSound, playCompleteSound, preloadSounds, unloadSounds } from '../lib/audio';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

const ACTIVE_WORKOUT_KEY = 'activeWorkout';
const TOTAL_SECS = 1800;

type ScreenState = 'setup' | 'active';

interface ActiveWorkoutStorage {
  workoutId: number | null;
  startTimeMs: number;
  pausedDurationMs: number;
  pauseStartMs: number | null;
  walkSecs: number;
  jogSecs: number;
}

export default function TimerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ walkSecs?: string; jogSecs?: string }>();

  const [screenState, setScreenState] = useState<ScreenState>('setup');
  const [walkMinutes, setWalkMinutes] = useState(
    params.walkSecs ? Math.round(Number(params.walkSecs) / 60) : 4
  );
  const [jogMinutes, setJogMinutes] = useState(
    params.jogSecs ? Math.round(Number(params.jogSecs) / 60) : 2
  );

  // Active workout state
  const [intervals, setIntervals] = useState<Interval[]>([]);
  const [startTimeMs, setStartTimeMs] = useState(0);
  const [pausedDurationMs, setPausedDurationMs] = useState(0);
  const pauseStartMsRef = useRef<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [currentIntervalIndex, setCurrentIntervalIndex] = useState(0);
  const [notificationIds, setNotificationIds] = useState<string[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const workoutIdRef = useRef<number | null>(null);

  // Check for crashed/incomplete workout on mount
  useEffect(() => {
    async function checkForInterruptedWorkout() {
      try {
        const stored = await AsyncStorage.getItem(ACTIVE_WORKOUT_KEY);
        if (!stored) return;
        const data: ActiveWorkoutStorage = JSON.parse(stored);

        // Calculate how much of the workout was completed
        const pausedMs = data.pausedDurationMs + (data.pauseStartMs ? Date.now() - data.pauseStartMs : 0);
        const elapsedS = computeElapsedSecs(data.startTimeMs, pausedMs);
        const actualSecs = Math.min(elapsedS, TOTAL_SECS);

        Alert.alert(
          'Unfinished Workout Found',
          'It looks like your last workout was interrupted. We\'ve logged what you completed.',
          [{ text: 'OK' }]
        );

        await saveWorkout({
          date: new Date(data.startTimeMs).toISOString(),
          walk_interval_seconds: data.walkSecs,
          jog_interval_seconds: data.jogSecs,
          planned_duration_seconds: TOTAL_SECS,
          actual_duration_seconds: Math.floor(actualSecs),
          completed: false,
        });

        await AsyncStorage.removeItem(ACTIVE_WORKOUT_KEY);
      } catch (err) {
        console.warn('Error checking for interrupted workout:', err);
      }
    }

    checkForInterruptedWorkout();
  }, []);

  // AppState listener — update progress notification when app comes to foreground
  useEffect(() => {
    if (screenState !== 'active') return;

    const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      if (nextState === 'active' && !isPaused) {
        const nowElapsed = computeElapsedSecs(startTimeMs, pausedDurationMs);
        const result = getCurrentInterval(intervals, nowElapsed);
        if (result) {
          const nextTransitionMs =
            startTimeMs +
            (result.interval.startSecs + result.interval.durationSecs) * 1000 +
            pausedDurationMs;
          await showProgressNotification(result.interval.type, new Date(nextTransitionMs));
        }
      }
    });

    return () => subscription.remove();
  }, [screenState, isPaused, startTimeMs, pausedDurationMs, intervals]);

  // Tick every 500ms
  useEffect(() => {
    if (screenState !== 'active' || isPaused) {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }

    tickRef.current = setInterval(async () => {
      const nowElapsed = computeElapsedSecs(startTimeMs, pausedDurationMs);
      setElapsedSecs(nowElapsed);

      if (nowElapsed >= TOTAL_SECS) {
        // Workout complete
        clearInterval(tickRef.current!);
        await handleWorkoutComplete(nowElapsed);
        return;
      }

      const result = getCurrentInterval(intervals, nowElapsed);
      if (result && result.index !== currentIntervalIndex) {
        setCurrentIntervalIndex(result.index);
        // Play audio for foreground transitions
        await playTransitionSound();
      }
    }, 500);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [screenState, isPaused, startTimeMs, pausedDurationMs, intervals, currentIntervalIndex]);

  const handleWorkoutComplete = useCallback(
    async (finalElapsedSecs: number) => {
      await playCompleteSound();
      await cancelWorkoutNotifications(notificationIds);
      await dismissProgressNotification();

      const workoutId = await saveWorkout({
        date: new Date(startTimeMs).toISOString(),
        walk_interval_seconds: walkMinutes * 60,
        jog_interval_seconds: jogMinutes * 60,
        planned_duration_seconds: TOTAL_SECS,
        actual_duration_seconds: Math.floor(finalElapsedSecs),
        completed: true,
      });

      await AsyncStorage.removeItem(ACTIVE_WORKOUT_KEY);
      await unloadSounds();

      setScreenState('setup');
      router.push({ pathname: '/checkin', params: { workoutId: String(workoutId) } });
    },
    [notificationIds, startTimeMs, walkMinutes, jogMinutes, router]
  );

  const handleStartWorkout = useCallback(async () => {
    const walkSecs = walkMinutes * 60;
    const jogSecs = jogMinutes * 60;
    const { intervals: seq } = buildIntervalSequence(walkSecs, jogSecs);

    const now = Date.now();

    await preloadSounds();

    const ids = await scheduleWorkoutNotifications(seq, now);
    setNotificationIds(ids);

    const activeData: ActiveWorkoutStorage = {
      workoutId: null,
      startTimeMs: now,
      pausedDurationMs: 0,
      pauseStartMs: null,
      walkSecs,
      jogSecs,
    };
    await AsyncStorage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify(activeData));

    await showProgressNotification(seq[0].type, new Date(now + seq[0].durationSecs * 1000));

    setIntervals(seq);
    setStartTimeMs(now);
    setPausedDurationMs(0);
    pauseStartMsRef.current = null;
    setIsPaused(false);
    setElapsedSecs(0);
    setCurrentIntervalIndex(0);
    setScreenState('active');
  }, [walkMinutes, jogMinutes]);

  const handlePause = useCallback(async () => {
    pauseStartMsRef.current = Date.now();
    setIsPaused(true);
    // Cancel all pre-scheduled transition notifications (they'd fire while paused)
    await cancelWorkoutNotifications(notificationIds);
    setNotificationIds([]);
    await dismissProgressNotification();
  }, [notificationIds]);

  const handleResume = useCallback(async () => {
    if (pauseStartMsRef.current == null) return;
    const additionalPause = Date.now() - pauseStartMsRef.current;
    const newPausedDuration = pausedDurationMs + additionalPause;

    pauseStartMsRef.current = null;
    setPausedDurationMs(newPausedDuration);
    setIsPaused(false);

    // Re-schedule notifications from the new wall-clock times
    const nowElapsed = computeElapsedSecs(startTimeMs, newPausedDuration);
    const result = getCurrentInterval(intervals, nowElapsed);
    if (result) {
      // Schedule remaining intervals
      const remainingIntervals = intervals.slice(result.index);
      const adjustedStartMs = Date.now() - nowElapsed * 1000;
      const ids = await scheduleWorkoutNotifications(intervals, adjustedStartMs + newPausedDuration);
      setNotificationIds(ids);

      const nextTransitionMs = Date.now() + result.secondsRemainingInInterval * 1000;
      await showProgressNotification(result.interval.type, new Date(nextTransitionMs));
    }
  }, [pausedDurationMs, startTimeMs, intervals]);

  const handleEndEarly = useCallback(() => {
    Alert.alert('End Workout?', 'Your progress will be logged.', [
      { text: 'Keep going', style: 'cancel' },
      {
        text: 'End workout',
        style: 'destructive',
        onPress: async () => {
          if (tickRef.current) clearInterval(tickRef.current);
          await cancelWorkoutNotifications(notificationIds);
          await dismissProgressNotification();

          const nowElapsed = computeElapsedSecs(
            startTimeMs,
            pausedDurationMs + (pauseStartMsRef.current ? Date.now() - pauseStartMsRef.current : 0)
          );

          const workoutId = await saveWorkout({
            date: new Date(startTimeMs).toISOString(),
            walk_interval_seconds: walkMinutes * 60,
            jog_interval_seconds: jogMinutes * 60,
            planned_duration_seconds: TOTAL_SECS,
            actual_duration_seconds: Math.floor(Math.min(nowElapsed, TOTAL_SECS)),
            completed: false,
          });

          await AsyncStorage.removeItem(ACTIVE_WORKOUT_KEY);
          await unloadSounds();

          setScreenState('setup');
          router.push({ pathname: '/checkin', params: { workoutId: String(workoutId) } });
        },
      },
    ]);
  }, [notificationIds, startTimeMs, pausedDurationMs, walkMinutes, jogMinutes, router]);

  if (screenState === 'active') {
    const result = getCurrentInterval(intervals, elapsedSecs);
    const currentInterval = result?.interval ?? intervals[intervals.length - 1];
    const secsRemaining = result?.secondsRemainingInInterval ?? 0;

    return (
      <View style={styles.activeContainer}>
        <IntervalTimer
          currentPhase={currentInterval?.type ?? 'cooldown'}
          secondsRemaining={secsRemaining}
          totalSessionSecs={TOTAL_SECS}
          elapsedSecs={elapsedSecs}
          isPaused={isPaused}
        />

        <View style={styles.controls}>
          {isPaused ? (
            <TouchableOpacity
              style={[styles.button, styles.resumeButton]}
              onPress={handleResume}
              accessibilityLabel="Resume workout"
            >
              <Text style={styles.buttonText}>Resume</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.pauseButton]}
              onPress={handlePause}
              accessibilityLabel="Pause workout"
            >
              <Text style={styles.buttonText}>Pause</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.button, styles.endButton]}
            onPress={handleEndEarly}
            accessibilityLabel="End workout early"
          >
            <Text style={[styles.buttonText, { color: Colors.danger }]}>End Early</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Setup screen
  return <SetupScreen
    walkMinutes={walkMinutes}
    jogMinutes={jogMinutes}
    setWalkMinutes={setWalkMinutes}
    setJogMinutes={setJogMinutes}
    onStart={handleStartWorkout}
  />;
}

// ─── Setup Screen ─────────────────────────────────────────────────────────────

interface SetupScreenProps {
  walkMinutes: number;
  jogMinutes: number;
  setWalkMinutes: (v: number) => void;
  setJogMinutes: (v: number) => void;
  onStart: () => void;
}

function SetupScreen({
  walkMinutes,
  jogMinutes,
  setWalkMinutes,
  setJogMinutes,
  onStart,
}: SetupScreenProps) {
  const walkSecs = walkMinutes * 60;
  const jogSecs = jogMinutes * 60;
  const { intervals, shouldWarnLongCooldown } = buildIntervalSequence(walkSecs, jogSecs);

  return (
    <ScrollView
      style={styles.setupContainer}
      contentContainerStyle={styles.setupContent}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>Set Your Intervals</Text>
      <Text style={styles.subtitle}>
        Choose how long you'll walk and jog. The app will build a 30-minute session for you.
      </Text>

      <View style={styles.inputsRow}>
        <DurationPicker
          label="Walk"
          color={Colors.walk}
          minutes={walkMinutes}
          onDecrease={() => setWalkMinutes(Math.max(1, walkMinutes - 1))}
          onIncrease={() => setWalkMinutes(Math.min(25, walkMinutes + 1))}
        />
        <DurationPicker
          label="Jog"
          color={Colors.jog}
          minutes={jogMinutes}
          onDecrease={() => setJogMinutes(Math.max(1, jogMinutes - 1))}
          onIncrease={() => setJogMinutes(Math.min(25, jogMinutes + 1))}
        />
      </View>

      {shouldWarnLongCooldown && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ These intervals leave a long cooldown walk at the end. Consider adjusting so your jog intervals are a bit longer.
          </Text>
        </View>
      )}

      {walkMinutes === 1 && (
        <View style={styles.phaseVHintBox}>
          <Text style={styles.phaseVHintText}>
            🎉 You're at 1-minute walk intervals — one more progression and you'll move to continuous jogging (Phase V)!
          </Text>
        </View>
      )}

      <Text style={styles.previewHeading}>Your 30-minute plan:</Text>
      <View style={styles.preview}>
        {intervals.map((interval, i) => (
          <View key={i} style={styles.previewRow}>
            <View
              style={[
                styles.previewDot,
                {
                  backgroundColor:
                    interval.type === 'jog'
                      ? Colors.jog
                      : interval.type === 'cooldown'
                      ? Colors.cooldown
                      : Colors.walk,
                },
              ]}
            />
            <Text style={styles.previewText}>
              {interval.type === 'cooldown' ? 'Cooldown Walk' : interval.type === 'walk' ? 'Walk' : 'Jog'}{' '}
              — {formatDurationLabel(interval.durationSecs)}
            </Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.startButton}
        onPress={onStart}
        accessibilityLabel="Start workout"
      >
        <Text style={styles.startButtonText}>Start Workout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function DurationPicker({
  label,
  color,
  minutes,
  onDecrease,
  onIncrease,
}: {
  label: string;
  color: string;
  minutes: number;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <View style={styles.pickerContainer}>
      <Text style={[styles.pickerLabel, { color }]}>{label}</Text>
      <View style={styles.pickerRow}>
        <TouchableOpacity
          style={[styles.pickerButton, { borderColor: color }]}
          onPress={onDecrease}
          accessibilityLabel={`Decrease ${label} time`}
        >
          <Text style={[styles.pickerButtonText, { color }]}>−</Text>
        </TouchableOpacity>
        <Text style={styles.pickerValue}>{minutes}</Text>
        <TouchableOpacity
          style={[styles.pickerButton, { borderColor: color }]}
          onPress={onIncrease}
          accessibilityLabel={`Increase ${label} time`}
        >
          <Text style={[styles.pickerButtonText, { color }]}>+</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.pickerUnit}>min</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Active
  activeContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  controls: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  pauseButton: {
    backgroundColor: Colors.textPrimary,
  },
  resumeButton: {
    backgroundColor: Colors.primary,
  },
  endButton: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  buttonText: {
    fontSize: Typography.heading3,
    fontWeight: '700',
    color: Colors.textOnColor,
  },

  // Setup
  setupContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  setupContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  heading: {
    fontSize: Typography.heading1,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  inputsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  pickerContainer: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  pickerLabel: {
    fontSize: Typography.heading3,
    fontWeight: '700',
    letterSpacing: 1,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  pickerButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerButtonText: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  pickerValue: {
    fontSize: Typography.heading1,
    fontWeight: '700',
    color: Colors.textPrimary,
    minWidth: 48,
    textAlign: 'center',
  },
  pickerUnit: {
    fontSize: Typography.bodySmall,
    color: Colors.textMuted,
  },
  warningBox: {
    backgroundColor: '#FFF3CD',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  warningText: {
    fontSize: Typography.bodySmall,
    color: '#856404',
    lineHeight: 20,
  },
  phaseVHintBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.walk,
  },
  phaseVHintText: {
    fontSize: Typography.bodySmall,
    color: '#2E7D32',
    lineHeight: 20,
  },
  previewHeading: {
    fontSize: Typography.heading3,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  preview: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  previewDot: {
    width: 12,
    height: 12,
    borderRadius: BorderRadius.full,
  },
  previewText: {
    fontSize: Typography.body,
    color: Colors.textPrimary,
  },
  startButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  startButtonText: {
    fontSize: Typography.heading2,
    fontWeight: '700',
    color: Colors.textOnColor,
  },
});
