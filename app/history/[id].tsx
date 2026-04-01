import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { getWorkoutById } from '@/lib/storage';
import { WorkoutWithCheckin, Recommendation, PainDuring } from '@/lib/types';
import { getRecommendationDisplay } from '@/lib/recommendations';
import { formatMinutes } from '@/lib/intervals';

const PAIN_LABELS: Record<PainDuring, string> = {
  none: 'No pain',
  start_then_gone: 'Pain at start that went away',
  worsened: 'Pain that developed and got worse',
  constant: 'Pain the whole time',
};

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [workout, setWorkout] = useState<WorkoutWithCheckin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkout();
  }, [id]);

  async function loadWorkout() {
    try {
      const data = await getWorkoutById(parseInt(id));
      setWorkout(data);
    } catch (e) {
      console.error('Failed to load workout:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Workout not found</Text>
      </View>
    );
  }

  const date = new Date(workout.date);
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const rec = workout.checkin
    ? getRecommendationDisplay(workout.checkin.recommendation as Recommendation)
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.date}>{dateStr}</Text>

      {!workout.completed && (
        <View style={styles.partialBanner}>
          <Text style={styles.partialText}>⚡ Ended early</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Workout</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Walk interval</Text>
          <Text style={styles.detailValue}>
            {formatMinutes(workout.walk_interval_seconds)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Jog interval</Text>
          <Text style={styles.detailValue}>
            {formatMinutes(workout.jog_interval_seconds)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Duration</Text>
          <Text style={styles.detailValue}>
            {formatMinutes(workout.actual_duration_seconds)} of{' '}
            {formatMinutes(workout.planned_duration_seconds)}
          </Text>
        </View>
      </View>

      {workout.checkin && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Check-In</Text>

          <View style={styles.checkinItem}>
            <Text style={styles.checkinQuestion}>Pain during workout</Text>
            <Text style={styles.checkinAnswer}>
              {PAIN_LABELS[workout.checkin.pain_during as PainDuring]}
            </Text>
          </View>

          <View style={styles.checkinItem}>
            <Text style={styles.checkinQuestion}>How did you feel? (0–10)</Text>
            <Text style={styles.checkinAnswer}>{workout.checkin.feel_now}</Text>
          </View>

          <View style={styles.checkinItem}>
            <Text style={styles.checkinQuestion}>Night pain</Text>
            <Text style={styles.checkinAnswer}>
              {workout.checkin.night_pain ? 'Yes' : 'No'}
            </Text>
          </View>

          <View style={styles.checkinItem}>
            <Text style={styles.checkinQuestion}>Morning stiffness</Text>
            <Text style={styles.checkinAnswer}>
              {workout.checkin.morning_stiffness ? 'Yes' : 'No'}
            </Text>
          </View>

          {rec && (
            <View style={[styles.recBadge, { backgroundColor: rec.color + '15' }]}>
              <Text style={[styles.recText, { color: rec.color }]}>
                {rec.emoji} {rec.label}
              </Text>
              <Text style={styles.recDescription}>{rec.description}</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 100,
    color: Colors.textSecondary,
    fontSize: 16,
  },
  date: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  partialBanner: {
    backgroundColor: Colors.cooldownBg,
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    alignItems: 'center',
  },
  partialText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.cooldown,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  detailLabel: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  checkinItem: {
    marginBottom: 16,
  },
  checkinQuestion: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  checkinAnswer: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  recBadge: {
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  recText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  recDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
