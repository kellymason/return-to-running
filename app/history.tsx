import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

import { WorkoutCard } from '../components/WorkoutCard';
import { getWorkouts, getLastCheckin } from '../lib/db';
import { suggestNextIntervals } from '../lib/recommendations';
import type { WorkoutWithCheckin } from '../lib/db';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

export default function HistoryScreen() {
  const [workouts, setWorkouts] = useState<WorkoutWithCheckin[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutWithCheckin | null>(null);

  useFocusEffect(
    useCallback(() => {
      getWorkouts().then(setWorkouts).catch(console.error);
    }, [])
  );

  const lastCheckin = workouts.find((w) => w.checkin)?.checkin ?? null;
  const lastWorkout = workouts[0] ?? null;

  const suggestion =
    lastCheckin && lastWorkout
      ? suggestNextIntervals(
          lastWorkout.walk_interval_seconds,
          lastWorkout.jog_interval_seconds,
          lastCheckin.recommendation
        )
      : null;

  return (
    <View style={styles.container}>
      {workouts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>No workouts yet</Text>
          <Text style={styles.emptySubtitle}>
            Your completed workouts will appear here after your first run.
          </Text>
        </View>
      ) : (
        <FlatList
          data={workouts}
          keyExtractor={(w) => String(w.id)}
          renderItem={({ item }) => (
            <WorkoutCard
              workout={item}
              onPress={() => setSelectedWorkout(item)}
            />
          )}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            suggestion ? (
              <View style={styles.suggestionBanner}>
                <Text style={styles.suggestionLabel}>SUGGESTED NEXT</Text>
                {suggestion.isPhaseV ? (
                  <Text style={styles.suggestionText}>
                    🎉 You're ready for continuous jogging!
                  </Text>
                ) : (
                  <Text style={styles.suggestionText}>
                    {Math.round((suggestion.walkSecs ?? 0) / 60)}W /{' '}
                    {Math.round(suggestion.jogSecs / 60)}J intervals
                  </Text>
                )}
              </View>
            ) : null
          }
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        />
      )}

      <Modal
        visible={selectedWorkout != null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedWorkout(null)}
      >
        {selectedWorkout && (
          <WorkoutDetailModal
            workout={selectedWorkout}
            onClose={() => setSelectedWorkout(null)}
          />
        )}
      </Modal>
    </View>
  );
}

function WorkoutDetailModal({
  workout,
  onClose,
}: {
  workout: WorkoutWithCheckin;
  onClose: () => void;
}) {
  const checkin = workout.checkin;

  function boolLabel(v: boolean): string {
    return v ? 'Yes' : 'No';
  }

  const PAIN_LABELS: Record<string, string> = {
    none: 'No pain',
    start_then_gone: 'Pain at start, then resolved',
    worsened: 'Pain developed and worsened',
    constant: 'Pain throughout',
  };

  return (
    <View style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Workout Detail</Text>
        <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
          <Text style={styles.modalClose}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentPadding}>
        <InfoRow label="Date" value={new Date(workout.date).toDateString()} />
        <InfoRow
          label="Intervals"
          value={`${Math.round(workout.walk_interval_seconds / 60)} min walk / ${Math.round(workout.jog_interval_seconds / 60)} min jog`}
        />
        <InfoRow
          label="Duration"
          value={`${Math.floor(workout.actual_duration_seconds / 60)} min ${workout.actual_duration_seconds % 60} sec`}
        />
        <InfoRow label="Completed" value={workout.completed ? 'Yes' : 'No (ended early)'} />

        {checkin ? (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionHeading}>Check-In Answers</Text>
            <InfoRow
              label="Pain during workout"
              value={PAIN_LABELS[checkin.pain_during] ?? checkin.pain_during}
            />
            <InfoRow label="How you felt after (0–10)" value={String(checkin.feel_now)} />
            <InfoRow label="Night pain" value={boolLabel(checkin.night_pain)} />
            <InfoRow label="Morning stiffness" value={boolLabel(checkin.morning_stiffness)} />
            <InfoRow label="Recommendation" value={checkin.recommendation.replace('_', ' ')} />
          </>
        ) : (
          <Text style={styles.noCheckin}>No check-in recorded for this workout.</Text>
        )}
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  emptyEmoji: {
    fontSize: 64,
  },
  emptyTitle: {
    fontSize: Typography.heading2,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  suggestionBanner: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  suggestionLabel: {
    fontSize: Typography.caption,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  suggestionText: {
    fontSize: Typography.heading3,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: Typography.heading2,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalClose: {
    fontSize: Typography.heading2,
    color: Colors.textSecondary,
  },
  modalContent: {
    flex: 1,
  },
  modalContentPadding: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  sectionHeading: {
    fontSize: Typography.heading3,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  infoLabel: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: Typography.body,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  noCheckin: {
    fontSize: Typography.body,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
});
