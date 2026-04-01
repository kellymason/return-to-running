import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { buildSessionPlan, formatMinutes } from '@/lib/intervals';
import { IntervalSegment } from '@/lib/types';

export default function TimerSetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ walkMin?: string; jogMin?: string; totalMin?: string }>();

  const [totalMin, setTotalMin] = useState(params.totalMin ?? '30');
  const [walkMin, setWalkMin] = useState(params.walkMin ?? '4');
  const [jogMin, setJogMin] = useState(params.jogMin ?? '1');

  const totalNum = parseFloat(totalMin) || 0;
  const walkNum = parseFloat(walkMin) || 0;
  const jogNum = parseFloat(jogMin) || 0;

  const plan = useMemo(
    () => buildSessionPlan(totalNum, walkNum, jogNum),
    [totalNum, walkNum, jogNum]
  );

  const isValid = totalNum > 0 && walkNum > 0 && jogNum > 0 && plan.intervals.length > 0;

  function handleStart() {
    if (!isValid) return;
    router.push({
      pathname: '/timer/active',
      params: {
        totalMin: String(totalNum),
        walkMin: String(walkNum),
        jogMin: String(jogNum),
      },
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Workout Duration</Text>
      <View style={styles.inputRow}>
        <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            value={totalMin}
            onChangeText={setTotalMin}
            keyboardType="numeric"
            selectTextOnFocus
          />
          <Text style={styles.inputLabel}>minutes total</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Interval Durations</Text>
      <View style={styles.inputRow}>
        <View style={styles.inputGroup}>
          <TextInput
            style={[styles.input, styles.walkInput]}
            value={walkMin}
            onChangeText={setWalkMin}
            keyboardType="numeric"
            selectTextOnFocus
          />
          <Text style={styles.inputLabel}>min walk</Text>
        </View>
        <View style={styles.inputGroup}>
          <TextInput
            style={[styles.input, styles.jogInput]}
            value={jogMin}
            onChangeText={setJogMin}
            keyboardType="numeric"
            selectTextOnFocus
          />
          <Text style={styles.inputLabel}>min jog</Text>
        </View>
      </View>

      {/* Warnings */}
      {plan.warnings.map((w, i) => (
        <View key={i} style={styles.warningBox}>
          <Text style={styles.warningText}>⚠️ {w}</Text>
        </View>
      ))}

      {/* Interval Preview */}
      {isValid && (
        <View style={styles.previewSection}>
          <Text style={styles.sectionTitle}>Workout Plan</Text>
          <View style={styles.previewContainer}>
            {plan.intervals.map((seg, i) => (
              <IntervalPreviewItem key={i} segment={seg} index={i} isLast={i === plan.intervals.length - 1} />
            ))}
          </View>
        </View>
      )}

      <Pressable
        style={({ pressed }) => [
          styles.startButton,
          !isValid && styles.startButtonDisabled,
          pressed && isValid && styles.startButtonPressed,
        ]}
        onPress={handleStart}
        disabled={!isValid}
      >
        <Text style={styles.startButtonText}>Start Workout</Text>
      </Pressable>
    </ScrollView>
  );
}

function IntervalPreviewItem({
  segment,
  index,
  isLast,
}: {
  segment: IntervalSegment;
  index: number;
  isLast: boolean;
}) {
  const bgColor =
    segment.type === 'walk'
      ? Colors.walkBg
      : segment.type === 'jog'
        ? Colors.jogBg
        : Colors.cooldownBg;
  const textColor =
    segment.type === 'walk'
      ? Colors.walk
      : segment.type === 'jog'
        ? Colors.jog
        : Colors.cooldown;
  const label =
    segment.type === 'cooldown'
      ? 'Cooldown Walk'
      : segment.type === 'walk'
        ? 'Walk'
        : 'Jog';

  return (
    <View style={styles.previewRow}>
      <View style={[styles.previewBadge, { backgroundColor: bgColor }]}>
        <Text style={[styles.previewBadgeText, { color: textColor }]}>
          {label} {formatMinutes(segment.durationSeconds)}
        </Text>
      </View>
      {!isLast && <Text style={styles.previewArrow}>→</Text>}
    </View>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  inputGroup: {
    flex: 1,
    alignItems: 'center',
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.surfaceBorder,
    borderRadius: 12,
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: Colors.text,
    width: '100%',
  },
  walkInput: {
    borderColor: Colors.walk + '60',
  },
  jogInput: {
    borderColor: Colors.jog + '60',
  },
  inputLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  warningBox: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  warningText: {
    fontSize: 14,
    color: '#E65100',
    lineHeight: 20,
  },
  previewSection: {
    marginBottom: 20,
  },
  previewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  previewBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  previewArrow: {
    fontSize: 16,
    color: Colors.textLight,
    marginHorizontal: 4,
  },
  startButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 12,
  },
  startButtonPressed: {
    backgroundColor: Colors.primaryDark,
  },
  startButtonDisabled: {
    backgroundColor: Colors.textLight,
  },
  startButtonText: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: '700',
  },
});
