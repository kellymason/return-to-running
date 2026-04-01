import { Colors } from "@/constants/Colors";
import {
  getRecommendationDisplay,
  suggestNextIntervals,
} from "@/lib/recommendations";
import { getLatestWorkoutWithCheckin, getWorkoutCount } from "@/lib/storage";
import { Recommendation, WorkoutWithCheckin } from "@/lib/types";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

const DEFAULT_WALK = 4 * 60;
const DEFAULT_JOG = 1 * 60;
const DEFAULT_DURATION = 30;

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 360;
  const [lastWorkout, setLastWorkout] = useState<WorkoutWithCheckin | null>(
    null,
  );
  const [workoutCount, setWorkoutCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  async function loadData() {
    try {
      const [latest, count] = await Promise.all([
        getLatestWorkoutWithCheckin(),
        getWorkoutCount(),
      ]);
      setLastWorkout(latest);
      setWorkoutCount(count);
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setLoading(false);
    }
  }

  function getSuggestedParams(): {
    walkMin: number;
    jogMin: number;
    totalMin: number;
    message: string;
  } {
    if (!lastWorkout?.checkin) {
      return {
        walkMin: DEFAULT_WALK / 60,
        jogMin: DEFAULT_JOG / 60,
        totalMin: DEFAULT_DURATION,
        message: "Start with a gentle walk/jog to ease back in!",
      };
    }

    const suggestion = suggestNextIntervals(
      lastWorkout.walk_interval_seconds,
      lastWorkout.jog_interval_seconds,
      lastWorkout.checkin.recommendation as Recommendation,
    );

    return {
      walkMin: suggestion.walkSeconds / 60,
      jogMin: suggestion.jogSeconds / 60,
      totalMin: lastWorkout.planned_duration_seconds / 60,
      message: suggestion.message,
    };
  }

  const suggested = getSuggestedParams();
  const lastRec = lastWorkout?.checkin
    ? getRecommendationDisplay(
        lastWorkout.checkin.recommendation as Recommendation,
      )
    : null;

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={[styles.loadingText, isSmallScreen && styles.loadingTextSmall]}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isSmallScreen && styles.contentSmall]}
    >
      <Text style={[styles.title, isSmallScreen && styles.titleSmall]}>
        Return to Running
      </Text>
      <Text style={styles.subtitle}>Phase III: Walk/Jog Progression</Text>

      {/* Next Workout Card */}
      <View style={[styles.card, isSmallScreen && styles.cardSmall]}>
        <Text style={styles.cardTitle}>
          {workoutCount === 0 ? "Your First Workout" : "Next Workout"}
        </Text>

        {lastRec && (
          <View
            style={[styles.recBadge, { backgroundColor: lastRec.color + "20" }]}
          >
            <Text style={[styles.recBadgeText, { color: lastRec.color }]}>
              {lastRec.emoji} Last check-in: {lastRec.label}
            </Text>
          </View>
        )}

        <Text style={styles.suggestionMessage}>{suggested.message}</Text>

        <View style={styles.intervalPreview}>
          <View style={styles.intervalItem}>
            <Text style={[styles.intervalValue, isSmallScreen && styles.intervalValueSmall]}>
              {suggested.walkMin}
            </Text>
            <Text style={styles.intervalLabel}>min walk</Text>
          </View>
          <Text style={[styles.intervalDivider, isSmallScreen && styles.intervalDividerSmall]}>
            →
          </Text>
          <View style={styles.intervalItem}>
            <Text style={[styles.intervalValue, isSmallScreen && styles.intervalValueSmall]}>
              {suggested.jogMin}
            </Text>
            <Text style={styles.intervalLabel}>min jog</Text>
          </View>
          <Text style={[styles.intervalDivider, isSmallScreen && styles.intervalDividerSmall]}>
            ×
          </Text>
          <View style={styles.intervalItem}>
            <Text style={[styles.intervalValue, isSmallScreen && styles.intervalValueSmall]}>
              {suggested.totalMin}
            </Text>
            <Text style={styles.intervalLabel}>min total</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.startButton,
            isSmallScreen && styles.startButtonSmall,
            pressed && styles.startButtonPressed,
          ]}
          onPress={() =>
            router.push({
              pathname: "/timer/setup",
              params: {
                walkMin: String(suggested.walkMin),
                jogMin: String(suggested.jogMin),
                totalMin: String(suggested.totalMin),
              },
            })
          }
        >
          <Text style={styles.startButtonText}>
            {workoutCount === 0 ? "Let's Go!" : "Start Workout"}
          </Text>
        </Pressable>
      </View>

      {/* Stats */}
      {workoutCount > 0 && (
        <View style={[styles.card, isSmallScreen && styles.cardSmall]}>
          <Text style={styles.cardTitle}>Your Journey</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, isSmallScreen && styles.statValueSmall]}>
                {workoutCount}
              </Text>
              <Text style={styles.statLabel}>
                {workoutCount === 1 ? "workout" : "workouts"} completed
              </Text>
            </View>
          </View>
          <Text style={styles.encouragement}>
            {workoutCount === 1
              ? "First one in the books! 💜"
              : workoutCount < 5
                ? "Building a great foundation! 💜"
                : workoutCount < 10
                  ? "You're on a roll! Keep listening to your body. 💜"
                  : "Incredible consistency! Look how far you've come. 💜"}
          </Text>
        </View>
      )}

      {workoutCount === 0 && (
        <View style={[styles.card, isSmallScreen && styles.cardSmall]}>
          <Text style={styles.cardTitle}>Welcome Back 💜</Text>
          <Text style={styles.welcomeText}>
            This app follows the Brigham & Women's Hospital Return to Running
            Protocol to help you safely build back your running after pregnancy.
          </Text>
          <Text style={styles.welcomeText}>
            Start with short walk/jog intervals and progress based on how your
            body feels. There's no rush — consistency beats intensity every
            time.
          </Text>
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
  contentSmall: {
    padding: 12,
    paddingBottom: 24,
  },
  loadingText: {
    textAlign: "center",
    marginTop: 100,
    color: Colors.textSecondary,
    fontSize: 16,
  },
  loadingTextSmall: {
    marginTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.primary,
    textAlign: "center",
    marginTop: 20,
  },
  titleSmall: {
    fontSize: 22,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    marginTop: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  cardSmall: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 12,
  },
  recBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  recBadgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  suggestionMessage: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 22,
  },
  intervalPreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  intervalItem: {
    alignItems: "center",
  },
  intervalValue: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.text,
  },
  intervalValueSmall: {
    fontSize: 22,
  },
  intervalLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  intervalDivider: {
    fontSize: 20,
    color: Colors.textLight,
    marginHorizontal: 16,
  },
  intervalDividerSmall: {
    fontSize: 16,
    marginHorizontal: 8,
  },
  startButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  startButtonSmall: {
    paddingVertical: 12,
  },
  startButtonPressed: {
    backgroundColor: Colors.primaryDark,
  },
  startButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 12,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 36,
    fontWeight: "700",
    color: Colors.primary,
  },
  statValueSmall: {
    fontSize: 28,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  encouragement: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
  },
  welcomeText: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 8,
  },
});
