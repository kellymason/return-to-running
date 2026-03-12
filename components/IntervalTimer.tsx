import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import type { IntervalType } from '../lib/intervals';
import { formatSeconds } from '../lib/intervals';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

interface Props {
  currentPhase: IntervalType;
  secondsRemaining: number;
  totalSessionSecs: number;
  elapsedSecs: number;
  isPaused: boolean;
}

const PHASE_CONFIG: Record<
  IntervalType,
  { label: string; color: string; bgColor: string }
> = {
  walk: {
    label: 'WALK',
    color: Colors.walk,
    bgColor: '#E8F5E9',
  },
  jog: {
    label: 'JOG',
    color: Colors.jog,
    bgColor: '#E3F2FD',
  },
  cooldown: {
    label: 'COOLDOWN',
    color: Colors.cooldown,
    bgColor: '#F1F8E9',
  },
};

export function IntervalTimer({
  currentPhase,
  secondsRemaining,
  totalSessionSecs,
  elapsedSecs,
  isPaused,
}: Props) {
  const config = PHASE_CONFIG[currentPhase];
  const progressPercent = Math.min(1, elapsedSecs / totalSessionSecs);

  return (
    <View style={[styles.container, { backgroundColor: config.bgColor }]}>
      {/* Phase label */}
      <View style={[styles.phaseBadge, { backgroundColor: config.color }]}>
        <Text style={styles.phaseLabel}>{isPaused ? 'PAUSED' : config.label}</Text>
      </View>

      {/* Countdown */}
      <Text
        style={[styles.countdown, { color: config.color }]}
        accessibilityLabel={`${formatSeconds(secondsRemaining)} remaining in ${config.label.toLowerCase()} interval`}
      >
        {formatSeconds(secondsRemaining)}
      </Text>

      {/* Paused overlay text */}
      {isPaused && (
        <Text style={styles.pausedHint}>Tap Resume to continue</Text>
      )}

      {/* Session progress bar */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressLabel}>
          {formatSeconds(elapsedSecs)} elapsed
        </Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${progressPercent * 100}%`, backgroundColor: config.color },
            ]}
            testID="progress-fill"
          />
        </View>
        <Text style={styles.progressLabel}>
          {formatSeconds(totalSessionSecs - elapsedSecs)} remaining
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.xl,
    gap: Spacing.lg,
  },
  phaseBadge: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  phaseLabel: {
    fontSize: Typography.intervalLabel,
    fontWeight: '800',
    color: Colors.textOnColor,
    letterSpacing: 4,
  },
  countdown: {
    fontSize: Typography.timerDisplay,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    lineHeight: Typography.timerDisplay * 1.1,
  },
  pausedHint: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  progressContainer: {
    width: '100%',
    gap: Spacing.xs,
  },
  progressLabel: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#D0D0D0',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
    minWidth: 8,
  },
});
