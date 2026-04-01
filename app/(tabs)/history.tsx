import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '@/constants/Colors';
import { getWorkoutsWithCheckins } from '@/lib/storage';
import { WorkoutWithCheckin, Recommendation } from '@/lib/types';
import { getRecommendationDisplay } from '@/lib/recommendations';
import { formatMinutes } from '@/lib/intervals';

export default function HistoryScreen() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<WorkoutWithCheckin[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadWorkouts();
    }, [])
  );

  async function loadWorkouts() {
    try {
      const data = await getWorkoutsWithCheckins();
      setWorkouts(data);
    } catch (e) {
      console.error('Failed to load workouts:', e);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  function renderWorkout({ item }: { item: WorkoutWithCheckin }) {
    const rec = item.checkin
      ? getRecommendationDisplay(item.checkin.recommendation as Recommendation)
      : null;

    return (
      <Pressable
        style={({ pressed }) => [styles.workoutCard, pressed && styles.workoutCardPressed]}
        onPress={() => router.push(`/history/${item.id}`)}
      >
        <View style={styles.workoutHeader}>
          <Text style={styles.workoutDate}>{formatDate(item.date)}</Text>
          {!item.completed && <Text style={styles.partialBadge}>Partial</Text>}
        </View>

        <View style={styles.workoutIntervals}>
          <Text style={styles.workoutIntervalText}>
            {formatMinutes(item.walk_interval_seconds)} walk / {formatMinutes(item.jog_interval_seconds)} jog
          </Text>
          <Text style={styles.workoutDuration}>
            {formatMinutes(item.actual_duration_seconds)} of {formatMinutes(item.planned_duration_seconds)}
          </Text>
        </View>

        {rec && (
          <View style={[styles.recRow, { backgroundColor: rec.color + '10' }]}>
            <Text style={[styles.recText, { color: rec.color }]}>
              {rec.emoji} {rec.label}
            </Text>
          </View>
        )}
      </Pressable>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {workouts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🏃‍♀️</Text>
          <Text style={styles.emptyTitle}>No workouts yet</Text>
          <Text style={styles.emptyText}>
            Complete your first workout and it will show up here!
          </Text>
        </View>
      ) : (
        <FlatList
          data={workouts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderWorkout}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  workoutCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  workoutCardPressed: {
    opacity: 0.7,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  workoutDate: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  partialBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.cooldown,
    backgroundColor: Colors.cooldownBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  workoutIntervals: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  workoutIntervalText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  workoutDuration: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  recRow: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  recText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
