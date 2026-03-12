import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';

import { getLastCheckin, getLastWorkout, getTotalWorkouts, getCurrentStreak } from '../lib/db';
import { suggestNextIntervals, getRecommendationDisplay } from '../lib/recommendations';
import type { Checkin, Workout } from '../lib/db';
import type { NextIntervals } from '../lib/recommendations';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

export default function HomeScreen() {
  const router = useRouter();

  const [lastCheckin, setLastCheckin] = useState<Checkin | null>(null);
  const [lastWorkout, setLastWorkout] = useState<Workout | null>(null);
  const [suggestion, setSuggestion] = useState<NextIntervals | null>(null);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        setLoading(true);
        const [checkin, workout, total, s] = await Promise.all([
          getLastCheckin(),
          getLastWorkout(),
          getTotalWorkouts(),
          getCurrentStreak(),
        ]);

        setLastCheckin(checkin);
        setLastWorkout(workout);
        setTotalWorkouts(total);
        setStreak(s);

        if (checkin && workout) {
          setSuggestion(
            suggestNextIntervals(
              workout.walk_interval_seconds,
              workout.jog_interval_seconds,
              checkin.recommendation
            )
          );
        }

        setLoading(false);
      }

      load().catch(console.error);
    }, [])
  );

  const handleStartWorkout = () => {
    if (suggestion && !suggestion.isPhaseV && suggestion.walkSecs != null) {
      router.push({
        pathname: '/timer',
        params: {
          walkSecs: String(suggestion.walkSecs),
          jogSecs: String(suggestion.jogSecs),
        },
      });
    } else {
      router.push('/timer');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const recDisplay = lastCheckin ? getRecommendationDisplay(lastCheckin.recommendation) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Welcome / Greeting */}
      <View style={styles.heroSection}>
        <Text style={styles.heroTitle}>Return to Running</Text>
        <Text style={styles.heroSubtitle}>Phase III: Walk/Jog Progression</Text>
      </View>

      {/* Stats row */}
      {totalWorkouts > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalWorkouts}</Text>
            <Text style={styles.statLabel}>Total Runs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{streak}</Text>
            <Text style={styles.statLabel}>{streak === 1 ? 'Day Streak' : 'Day Streak'}</Text>
          </View>
        </View>
      )}

      {/* Suggestion card */}
      {lastCheckin && suggestion ? (
        <View style={styles.suggestionCard}>
          <View style={styles.suggestionHeader}>
            <Text style={styles.suggestionLabel}>NEXT WORKOUT</Text>
            {recDisplay && (
              <View style={[styles.recPill, { backgroundColor: recDisplay.color + '20' }]}>
                <Text style={[styles.recPillText, { color: recDisplay.color }]}>
                  {recDisplay.emoji} {lastCheckin.recommendation.replace('_', ' ')}
                </Text>
              </View>
            )}
          </View>

          {suggestion.isPhaseV ? (
            <View>
              <Text style={styles.phaseVTitle}>🎉 Ready for continuous jogging!</Text>
              <Text style={styles.phaseVSubtitle}>
                You've progressed through Phase III. You're ready to move to continuous jogging.
                Great work on this comeback!
              </Text>
            </View>
          ) : lastCheckin.recommendation === 'rest' ? (
            <View>
              <Text style={styles.restTitle}>🛑 Rest day recommended</Text>
              <Text style={styles.restSubtitle}>
                Take 1–2 rest days before your next run. Your body needs time to recover.
              </Text>
            </View>
          ) : (
            <View style={styles.intervalDisplay}>
              <View style={[styles.intervalBadge, { backgroundColor: Colors.walk + '20' }]}>
                <Text style={[styles.intervalValue, { color: Colors.walk }]}>
                  {Math.round((suggestion.walkSecs ?? 0) / 60)} min
                </Text>
                <Text style={[styles.intervalType, { color: Colors.walk }]}>Walk</Text>
              </View>
              <Text style={styles.intervalSeparator}>↔</Text>
              <View style={[styles.intervalBadge, { backgroundColor: Colors.jog + '20' }]}>
                <Text style={[styles.intervalValue, { color: Colors.jog }]}>
                  {Math.round(suggestion.jogSecs / 60)} min
                </Text>
                <Text style={[styles.intervalType, { color: Colors.jog }]}>Jog</Text>
              </View>
            </View>
          )}
        </View>
      ) : totalWorkouts === 0 ? (
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Welcome back! 💪</Text>
          <Text style={styles.welcomeText}>
            This app will guide you through the Brigham & Women's Hospital Return to Running
            protocol. Start with a comfortable walk/jog ratio and we'll help you progress safely.
          </Text>
          <Text style={styles.welcomeHint}>
            A good starting point is 4 minutes walking / 2 minutes jogging.
          </Text>
        </View>
      ) : null}

      {/* Quick start button */}
      {!suggestion?.isPhaseV && lastCheckin?.recommendation !== 'rest' && (
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartWorkout}
          accessibilityLabel="Start workout"
        >
          <Text style={styles.startButtonText}>
            {suggestion && !suggestion.isPhaseV && suggestion.walkSecs != null
              ? `Start ${Math.round((suggestion.walkSecs ?? 0) / 60)}W / ${Math.round(suggestion.jogSecs / 60)}J Workout`
              : 'Start a Workout'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Last check-in detail */}
      {recDisplay && lastCheckin && (
        <View style={styles.lastCheckinCard}>
          <Text style={styles.lastCheckinLabel}>LAST CHECK-IN</Text>
          <Text style={[styles.lastCheckinTitle, { color: recDisplay.color }]}>
            {recDisplay.title}
          </Text>
          <Text style={styles.lastCheckinSubtitle}>{recDisplay.subtitle}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontSize: Typography.body,
    color: Colors.textMuted,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  heroSection: {
    gap: Spacing.xs,
  },
  heroTitle: {
    fontSize: Typography.heading1,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  heroSubtitle: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statNumber: {
    fontSize: Typography.heading1,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
  },
  suggestionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionLabel: {
    fontSize: Typography.caption,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  recPill: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  recPillText: {
    fontSize: Typography.caption,
    fontWeight: '700',
  },
  intervalDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  intervalBadge: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    flex: 1,
  },
  intervalValue: {
    fontSize: Typography.heading1,
    fontWeight: '700',
  },
  intervalType: {
    fontSize: Typography.bodySmall,
    fontWeight: '600',
    letterSpacing: 1,
  },
  intervalSeparator: {
    fontSize: Typography.heading2,
    color: Colors.textMuted,
  },
  phaseVTitle: {
    fontSize: Typography.heading3,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  phaseVSubtitle: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginTop: Spacing.xs,
  },
  restTitle: {
    fontSize: Typography.heading3,
    fontWeight: '700',
    color: Colors.rest,
  },
  restSubtitle: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginTop: Spacing.xs,
  },
  welcomeCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  welcomeTitle: {
    fontSize: Typography.heading2,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  welcomeText: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  welcomeHint: {
    fontSize: Typography.bodySmall,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  startButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: Typography.heading3,
    fontWeight: '700',
    color: Colors.textOnColor,
  },
  lastCheckinCard: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  lastCheckinLabel: {
    fontSize: Typography.caption,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  lastCheckinTitle: {
    fontSize: Typography.heading3,
    fontWeight: '700',
  },
  lastCheckinSubtitle: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
