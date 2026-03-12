import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { CheckInQuestion, QuestionOption } from '../components/CheckInQuestion';
import { computeRecommendation, getRecommendationDisplay } from '../lib/recommendations';
import { saveCheckin } from '../lib/db';
import type { PainDuring } from '../lib/db';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

const PAIN_DURING_OPTIONS: QuestionOption[] = [
  { value: 'none', label: 'No pain', description: 'Felt completely fine throughout' },
  {
    value: 'start_then_gone',
    label: 'Pain at the start, then it went away',
    description: 'Mild discomfort early on that resolved',
  },
  {
    value: 'worsened',
    label: 'Pain developed and got worse during the run',
    description: 'Discomfort that increased over time',
  },
  {
    value: 'constant',
    label: 'Pain was there the whole time',
    description: 'Persistent discomfort throughout',
  },
];

const FEEL_NOW_OPTIONS: QuestionOption[] = Array.from({ length: 11 }, (_, i) => ({
  value: String(i),
  label: i === 0 ? '0 — Great, no issues' : i === 10 ? '10 — Significant pain' : String(i),
}));

const NIGHT_PAIN_OPTIONS: QuestionOption[] = [
  { value: 'false', label: 'No' },
  { value: 'true', label: 'Yes' },
];

const MORNING_STIFFNESS_OPTIONS: QuestionOption[] = [
  { value: 'false', label: 'No' },
  { value: 'true', label: 'Yes' },
];

type Step = 'q1' | 'q2' | 'q3' | 'q4' | 'result';

export default function CheckInScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const router = useRouter();

  const [step, setStep] = useState<Step>('q1');
  const [painDuring, setPainDuring] = useState<string>('');
  const [feelNow, setFeelNow] = useState<string>('');
  const [nightPain, setNightPain] = useState<string>('');
  const [morningStiffness, setMorningStiffness] = useState<string>('');
  const [recommendation, setRecommendation] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const handleQ1 = (value: string) => {
    setPainDuring(value);
    setStep('q2');
  };

  const handleQ2 = (value: string) => {
    setFeelNow(value);
    setStep('q3');
  };

  const handleQ3 = async (value: string) => {
    setNightPain(value);
    setStep('q4');
  };

  const handleQ4 = async (value: string) => {
    setMorningStiffness(value);
    setIsSaving(true);

    const input = {
      pain_during: painDuring as PainDuring,
      feel_now: parseInt(feelNow, 10),
      night_pain: value === 'true',
      morning_stiffness: value === 'true',
    };

    const rec = computeRecommendation({
      ...input,
      night_pain: nightPain === 'true',
      morning_stiffness: value === 'true',
    });

    try {
      await saveCheckin({
        workout_id: parseInt(workoutId, 10),
        pain_during: painDuring as PainDuring,
        feel_now: parseInt(feelNow, 10),
        night_pain: nightPain === 'true',
        morning_stiffness: value === 'true',
        recommendation: rec,
      });
    } catch (err) {
      console.error('Failed to save check-in:', err);
    }

    setRecommendation(rec);
    setIsSaving(false);
    setStep('result');
  };

  const handleDone = () => {
    router.replace('/');
  };

  if (step === 'result') {
    const display = getRecommendationDisplay(recommendation as any);
    return (
      <View style={styles.resultContainer}>
        <Text style={styles.resultEmoji}>{display.emoji}</Text>
        <Text style={[styles.resultTitle, { color: display.color }]}>{display.title}</Text>
        <Text style={styles.resultSubtitle}>{display.subtitle}</Text>
        <View style={[styles.nextActionBox, { borderColor: display.color }]}>
          <Text style={[styles.nextActionText, { color: display.color }]}>
            {display.nextActionText}
          </Text>
        </View>
        <TouchableOpacity style={[styles.doneButton, { backgroundColor: display.color }]} onPress={handleDone}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.progressBar}>
        {(['q1', 'q2', 'q3', 'q4'] as Step[]).map((s, i) => (
          <View
            key={s}
            style={[
              styles.progressStep,
              ['q1', 'q2', 'q3', 'q4'].indexOf(step) >= i && { backgroundColor: Colors.primary },
            ]}
          />
        ))}
      </View>

      <Text style={styles.sectionLabel}>HOW ARE YOU FEELING?</Text>

      {step === 'q1' && (
        <CheckInQuestion
          question="Did you have any pain during your workout?"
          options={PAIN_DURING_OPTIONS}
          onAnswer={handleQ1}
        />
      )}
      {step === 'q2' && (
        <>
          <CheckInQuestion
            question="How do you feel right now? (0 = Great, 10 = Significant pain)"
            options={FEEL_NOW_OPTIONS}
            onAnswer={handleQ2}
          />
        </>
      )}
      {step === 'q3' && (
        <CheckInQuestion
          question="Any pain that woke you up last night or kept you awake?"
          options={NIGHT_PAIN_OPTIONS}
          onAnswer={handleQ3}
        />
      )}
      {step === 'q4' && (
        <CheckInQuestion
          question="Any tightness or discomfort that limits your normal movement this morning?"
          options={MORNING_STIFFNESS_OPTIONS}
          onAnswer={handleQ4}
        />
      )}

      {isSaving && (
        <Text style={styles.savingText}>Saving your check-in...</Text>
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
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  progressBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  progressStep: {
    flex: 1,
    height: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.border,
  },
  sectionLabel: {
    fontSize: Typography.caption,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  savingText: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // Result screen
  resultContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  resultEmoji: {
    fontSize: 72,
  },
  resultTitle: {
    fontSize: Typography.heading2,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 32,
  },
  resultSubtitle: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  nextActionBox: {
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    width: '100%',
  },
  nextActionText: {
    fontSize: Typography.body,
    fontWeight: '600',
    textAlign: 'center',
  },
  doneButton: {
    width: '100%',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  doneButtonText: {
    fontSize: Typography.heading3,
    fontWeight: '700',
    color: Colors.textOnColor,
  },
});
