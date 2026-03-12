import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { WorkoutWithCheckin } from '../lib/db';
import type { Recommendation } from '../lib/db';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

interface Props {
  workout: WorkoutWithCheckin;
  onPress?: () => void;
}

const RECOMMENDATION_CONFIG: Record<
  Recommendation,
  { label: string; color: string; bgColor: string }
> = {
  progress: { label: '✅ Progress', color: Colors.progress, bgColor: '#E8F5E9' },
  maintain: { label: '⏸️ Maintain', color: Colors.maintain, bgColor: '#FFF3E0' },
  pull_back: { label: '🔻 Pull back', color: Colors.pull_back, bgColor: '#FBE9E7' },
  rest: { label: '🛑 Rest', color: Colors.rest, bgColor: '#FFEBEE' },
};

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min`;
}

function formatIntervals(walkSecs: number, jogSecs: number): string {
  return `${Math.round(walkSecs / 60)}W / ${Math.round(jogSecs / 60)}J`;
}

export function WorkoutCard({ workout, onPress }: Props) {
  const recConfig = workout.checkin
    ? RECOMMENDATION_CONFIG[workout.checkin.recommendation]
    : null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
    >
      <View style={styles.topRow}>
        <Text style={styles.date}>{formatDate(workout.date)}</Text>
        {!workout.completed && (
          <View style={styles.incompleteBadge}>
            <Text style={styles.incompleteBadgeText}>Incomplete</Text>
          </View>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatIntervals(workout.walk_interval_seconds, workout.jog_interval_seconds)}</Text>
          <Text style={styles.statLabel}>Intervals</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatDuration(workout.actual_duration_seconds)}</Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
        {recConfig && (
          <>
            <View style={styles.statDivider} />
            <View style={[styles.recBadge, { backgroundColor: recConfig.bgColor }]}>
              <Text style={[styles.recBadgeText, { color: recConfig.color }]}>
                {recConfig.label}
              </Text>
            </View>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: Typography.body,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  incompleteBadge: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  incompleteBadgeText: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: Typography.heading3,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  recBadge: {
    flex: 1,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
  },
  recBadgeText: {
    fontSize: Typography.bodySmall,
    fontWeight: '600',
  },
});
