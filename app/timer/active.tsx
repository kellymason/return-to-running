import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, AppState, AppStateStatus, Animated, Easing } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { buildSessionPlan, formatDuration, getCurrentInterval } from '@/lib/intervals';
import { savePendingWorkout, clearPendingWorkout } from '@/lib/storage';

export default function ActiveTimerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ totalMin: string; walkMin: string; jogMin: string }>();

  const totalMin = parseFloat(params.totalMin);
  const walkMin = parseFloat(params.walkMin);
  const jogMin = parseFloat(params.jogMin);

  const plan = useMemo(() => buildSessionPlan(totalMin, walkMin, jogMin), [totalMin, walkMin, jogMin]);

  const [startTime] = useState(() => Date.now());
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [totalPausedMs, setTotalPausedMs] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [finished, setFinished] = useState(false);
  const animationRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isPaused = pausedAt !== null;

  // Pulsing animation for paused state
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (isPaused) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isPaused]);

  // Calculate elapsed from wall clock
  const computeElapsed = useCallback(() => {
    if (pausedAt !== null) {
      return Math.floor((pausedAt - startTime - totalPausedMs) / 1000);
    }
    return Math.floor((Date.now() - startTime - totalPausedMs) / 1000);
  }, [startTime, pausedAt, totalPausedMs]);

  // Timer tick
  useEffect(() => {
    if (finished || isPaused) return;

    intervalRef.current = setInterval(() => {
      const elapsed = computeElapsed();
      setElapsedSeconds(elapsed);

      if (elapsed >= plan.totalSeconds) {
        setFinished(true);
        clearPendingWorkout();
      }
    }, 200);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [finished, isPaused, computeElapsed, plan.totalSeconds]);

  // Save pending workout for crash recovery
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        const elapsed = computeElapsed();
        savePendingWorkout({
          walk_interval_seconds: walkMin * 60,
          jog_interval_seconds: jogMin * 60,
          planned_duration_seconds: plan.totalSeconds,
          start_time: new Date(startTime).toISOString(),
          elapsed_seconds: elapsed,
        });
      }
    });
    return () => sub.remove();
  }, [computeElapsed, startTime, walkMin, jogMin, plan.totalSeconds]);

  // Navigate to check-in when finished
  useEffect(() => {
    if (finished) {
      clearPendingWorkout();
      router.replace({
        pathname: '/timer/checkin',
        params: {
          walkSeconds: String(walkMin * 60),
          jogSeconds: String(jogMin * 60),
          plannedSeconds: String(plan.totalSeconds),
          actualSeconds: String(Math.min(elapsedSeconds, plan.totalSeconds)),
          completed: '1',
          date: new Date(startTime).toISOString(),
        },
      });
    }
  }, [finished]);

  function handlePauseResume() {
    if (isPaused) {
      const pauseLength = Date.now() - pausedAt!;
      setTotalPausedMs((prev) => prev + pauseLength);
      setPausedAt(null);
    } else {
      setPausedAt(Date.now());
    }
  }

  function handleEndEarly() {
    Alert.alert(
      'End Workout Early?',
      'Your progress will still be saved.',
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'End Workout',
          style: 'destructive',
          onPress: () => {
            clearPendingWorkout();
            router.replace({
              pathname: '/timer/checkin',
              params: {
                walkSeconds: String(walkMin * 60),
                jogSeconds: String(jogMin * 60),
                plannedSeconds: String(plan.totalSeconds),
                actualSeconds: String(elapsedSeconds),
                completed: '0',
                date: new Date(startTime).toISOString(),
              },
            });
          },
        },
      ]
    );
  }

  const currentInterval = getCurrentInterval(plan.intervals, elapsedSeconds);
  const totalRemaining = Math.max(0, plan.totalSeconds - elapsedSeconds);
  const progress = Math.min(1, elapsedSeconds / plan.totalSeconds);

  // Determine display state
  const segmentType = currentInterval?.segment.type ?? 'walk';
  const segmentLabel =
    segmentType === 'cooldown' ? 'COOLDOWN' : segmentType === 'jog' ? 'JOG' : 'WALK';
  const segmentTimeRemaining = currentInterval?.timeRemainingInSegment ?? 0;

  const bgColor =
    segmentType === 'jog'
      ? Colors.jog
      : segmentType === 'cooldown'
        ? Colors.cooldown
        : Colors.walk;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Segment label */}
      <Text style={styles.segmentLabel}>{segmentLabel}</Text>

      {/* Big countdown */}
      <Text style={styles.countdown}>{formatDuration(segmentTimeRemaining)}</Text>
      <Text style={styles.countdownSubtext}>remaining in interval</Text>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.totalTime}>
        {formatDuration(elapsedSeconds)} / {formatDuration(plan.totalSeconds)}
      </Text>

      {/* Segment counter */}
      {currentInterval && (
        <Text style={styles.segmentCounter}>
          Interval {currentInterval.segmentIndex + 1} of {plan.intervals.length}
        </Text>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        <Pressable
          style={({ pressed }) => [styles.controlButton, pressed && styles.controlButtonPressed]}
          onPress={handlePauseResume}
        >
          <Text style={styles.controlButtonText}>{isPaused ? '▶ Resume' : '⏸ Pause'}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.controlButton,
            styles.endButton,
            pressed && styles.controlButtonPressed,
          ]}
          onPress={handleEndEarly}
        >
          <Text style={[styles.controlButtonText, styles.endButtonText]}>End Early</Text>
        </Pressable>
      </View>

      {isPaused && (
        <Pressable style={styles.pausedOverlay} onPress={handlePauseResume}>
          <Animated.Text style={[styles.pausedText, { opacity: pulseAnim }]}>PAUSED</Animated.Text>
          <Text style={styles.pausedHint}>Tap anywhere to resume</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  segmentLabel: {
    fontSize: 40,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 6,
    marginBottom: 8,
  },
  countdown: {
    fontSize: 96,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  countdownSubtext: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 32,
  },
  progressContainer: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 4,
  },
  totalTime: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
    fontVariant: ['tabular-nums'],
    marginBottom: 4,
  },
  segmentCounter: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 40,
  },
  controls: {
    flexDirection: 'row',
    gap: 16,
  },
  controlButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  controlButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  controlButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  endButton: {
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  endButtonText: {
    color: 'rgba(255,255,255,0.9)',
  },
  pausedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pausedText: {
    fontSize: 64,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 12,
    textShadowColor: 'rgba(255,255,255,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  pausedHint: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 20,
  },
});
