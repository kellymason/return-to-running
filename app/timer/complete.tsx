import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';

export default function CompleteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    recommendation: string;
    emoji: string;
    label: string;
    description: string;
    color: string;
  }>();

  return (
    <View style={styles.container}>
      <Text style={styles.celebration}>🎉</Text>
      <Text style={styles.title}>Workout Complete!</Text>
      <Text style={styles.subtitle}>You showed up today — that&apos;s what matters.</Text>

      <View style={[styles.recCard, { borderColor: params.color + '40' }]}>
        <Text style={styles.recEmoji}>{params.emoji}</Text>
        <Text style={[styles.recLabel, { color: params.color }]}>{params.label}</Text>
        <Text style={styles.recDescription}>{params.description}</Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.homeButton, pressed && styles.homeButtonPressed]}
        onPress={() => router.replace('/(tabs)')}
      >
        <Text style={styles.homeButtonText}>Back to Home</Text>
      </Pressable>

      <Pressable
        style={styles.historyLink}
        onPress={() => router.replace('/(tabs)/history')}
      >
        <Text style={styles.historyLinkText}>View Workout History</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  celebration: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  recCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    borderWidth: 2,
    marginBottom: 32,
  },
  recEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  recLabel: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  recDescription: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  homeButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    marginBottom: 16,
  },
  homeButtonPressed: {
    backgroundColor: Colors.primaryDark,
  },
  homeButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  historyLink: {
    padding: 8,
  },
  historyLinkText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
});
