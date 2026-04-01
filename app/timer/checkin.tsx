import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { PainDuring } from '@/lib/types';
import { computeRecommendation, getRecommendationDisplay, CheckinAnswers } from '@/lib/recommendations';
import { saveWorkout, saveCheckin } from '@/lib/storage';

const PAIN_OPTIONS: { value: PainDuring; label: string }[] = [
  { value: 'none', label: 'No pain' },
  { value: 'start_then_gone', label: 'Yes, at the start but it went away' },
  { value: 'worsened', label: 'Yes, it developed and got worse' },
  { value: 'constant', label: 'Yes, it was there the whole time' },
];

const FEEL_SCALE = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function CheckinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    walkSeconds: string;
    jogSeconds: string;
    plannedSeconds: string;
    actualSeconds: string;
    completed: string;
    date: string;
  }>();

  const [step, setStep] = useState(0);
  const [painDuring, setPainDuring] = useState<PainDuring | null>(null);
  const [feelNow, setFeelNow] = useState<number | null>(null);
  const [nightPain, setNightPain] = useState<boolean | null>(null);
  const [morningStiffness, setMorningStiffness] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleFinish() {
    if (painDuring === null || feelNow === null || nightPain === null || morningStiffness === null) {
      return;
    }

    setSaving(true);
    try {
      const answers: CheckinAnswers = { painDuring, feelNow, nightPain, morningStiffness };
      const recommendation = computeRecommendation(answers);

      const workoutId = await saveWorkout({
        date: params.date,
        walk_interval_seconds: parseInt(params.walkSeconds),
        jog_interval_seconds: parseInt(params.jogSeconds),
        planned_duration_seconds: parseInt(params.plannedSeconds),
        actual_duration_seconds: parseInt(params.actualSeconds),
        completed: params.completed === '1' ? 1 : 0,
      });

      await saveCheckin({
        workout_id: workoutId,
        pain_during: painDuring,
        feel_now: feelNow,
        night_pain: nightPain ? 1 : 0,
        morning_stiffness: morningStiffness ? 1 : 0,
        recommendation,
      });

      const recDisplay = getRecommendationDisplay(recommendation);
      router.replace({
        pathname: '/timer/complete',
        params: {
          recommendation,
          emoji: recDisplay.emoji,
          label: recDisplay.label,
          description: recDisplay.description,
          color: recDisplay.color,
        },
      });
    } catch (e) {
      console.error('Failed to save:', e);
      setSaving(false);
    }
  }

  function canAdvance(): boolean {
    switch (step) {
      case 0: return painDuring !== null;
      case 1: return feelNow !== null;
      case 2: return nightPain !== null;
      case 3: return morningStiffness !== null;
      default: return false;
    }
  }

  function handleNext() {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Progress dots */}
      <View style={styles.progressDots}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]}
          />
        ))}
      </View>

      {/* Step 0: Pain during workout */}
      {step === 0 && (
        <View>
          <Text style={styles.question}>Did you have any pain during your workout?</Text>
          {PAIN_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[styles.option, painDuring === opt.value && styles.optionSelected]}
              onPress={() => setPainDuring(opt.value)}
            >
              <Text
                style={[styles.optionText, painDuring === opt.value && styles.optionTextSelected]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Step 1: How do you feel now */}
      {step === 1 && (
        <View>
          <Text style={styles.question}>How do you feel right now?</Text>
          <Text style={styles.scaleHints}>0 = Great, no issues → 10 = Significant pain</Text>
          <View style={styles.scaleContainer}>
            {FEEL_SCALE.map((n) => (
              <Pressable
                key={n}
                style={[styles.scaleButton, feelNow === n && styles.scaleButtonSelected]}
                onPress={() => setFeelNow(n)}
              >
                <Text
                  style={[styles.scaleText, feelNow === n && styles.scaleTextSelected]}
                >
                  {n}
                </Text>
              </Pressable>
            ))}
          </View>
          {feelNow !== null && (
            <Text style={styles.feelDescription}>
              {feelNow <= 2
                ? 'Feeling great! 🎉'
                : feelNow <= 5
                  ? 'Some discomfort — that\'s okay.'
                  : feelNow <= 7
                    ? 'Moderate pain — worth noting.'
                    : 'Significant pain — please be gentle with yourself.'}
            </Text>
          )}
        </View>
      )}

      {/* Step 2: Night pain */}
      {step === 2 && (
        <View>
          <Text style={styles.question}>
            Any pain that woke you up last night or kept you awake?
          </Text>
          <View style={styles.yesNoRow}>
            <Pressable
              style={[styles.yesNoButton, nightPain === false && styles.yesNoSelected]}
              onPress={() => setNightPain(false)}
            >
              <Text style={[styles.yesNoText, nightPain === false && styles.yesNoTextSelected]}>
                No
              </Text>
            </Pressable>
            <Pressable
              style={[styles.yesNoButton, nightPain === true && styles.yesNoSelectedWarn]}
              onPress={() => setNightPain(true)}
            >
              <Text style={[styles.yesNoText, nightPain === true && styles.yesNoTextSelected]}>
                Yes
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Step 3: Morning stiffness */}
      {step === 3 && (
        <View>
          <Text style={styles.question}>
            Any tightness or discomfort that limits your normal movement this morning?
          </Text>
          <View style={styles.yesNoRow}>
            <Pressable
              style={[styles.yesNoButton, morningStiffness === false && styles.yesNoSelected]}
              onPress={() => setMorningStiffness(false)}
            >
              <Text
                style={[
                  styles.yesNoText,
                  morningStiffness === false && styles.yesNoTextSelected,
                ]}
              >
                No
              </Text>
            </Pressable>
            <Pressable
              style={[styles.yesNoButton, morningStiffness === true && styles.yesNoSelectedWarn]}
              onPress={() => setMorningStiffness(true)}
            >
              <Text
                style={[
                  styles.yesNoText,
                  morningStiffness === true && styles.yesNoTextSelected,
                ]}
              >
                Yes
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Next / Submit button */}
      <Pressable
        style={({ pressed }) => [
          styles.nextButton,
          !canAdvance() && styles.nextButtonDisabled,
          pressed && canAdvance() && styles.nextButtonPressed,
        ]}
        onPress={handleNext}
        disabled={!canAdvance() || saving}
      >
        <Text style={styles.nextButtonText}>
          {saving ? 'Saving...' : step < 3 ? 'Next' : 'See Results'}
        </Text>
      </Pressable>

      {step > 0 && (
        <Pressable style={styles.backButton} onPress={() => setStep(step - 1)}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
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
    padding: 24,
    paddingBottom: 40,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.surfaceBorder,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 24,
  },
  dotDone: {
    backgroundColor: Colors.primaryLight,
  },
  question: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 30,
    marginBottom: 20,
  },
  option: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: Colors.surfaceBorder,
  },
  optionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  optionText: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 22,
  },
  optionTextSelected: {
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  scaleHints: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  scaleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 12,
  },
  scaleButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scaleButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  scaleText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  scaleTextSelected: {
    color: Colors.white,
  },
  feelDescription: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  yesNoRow: {
    flexDirection: 'row',
    gap: 16,
  },
  yesNoButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
  },
  yesNoSelected: {
    borderColor: Colors.progress,
    backgroundColor: Colors.progress + '10',
  },
  yesNoSelectedWarn: {
    borderColor: Colors.pullBack,
    backgroundColor: Colors.pullBack + '10',
  },
  yesNoText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  yesNoTextSelected: {
    color: Colors.primaryDark,
  },
  nextButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 32,
  },
  nextButtonPressed: {
    backgroundColor: Colors.primaryDark,
  },
  nextButtonDisabled: {
    backgroundColor: Colors.textLight,
  },
  nextButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  backButton: {
    alignItems: 'center',
    marginTop: 16,
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
});
