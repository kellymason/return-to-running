import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
}

interface Props {
  question: string;
  options: QuestionOption[];
  onAnswer: (value: string) => void;
  selectedValue?: string;
}

export function CheckInQuestion({ question, options, onAnswer, selectedValue }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.questionText}>{question}</Text>
      <View style={styles.optionsContainer}>
        {options.map((option) => {
          const isSelected = selectedValue === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.option, isSelected && styles.optionSelected]}
              onPress={() => onAnswer(option.value)}
              accessibilityLabel={option.label}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
            >
              <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                {option.label}
              </Text>
              {option.description ? (
                <Text style={[styles.optionDescription, isSelected && styles.optionDescriptionSelected]}>
                  {option.description}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  questionText: {
    fontSize: Typography.heading2,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 32,
  },
  optionsContainer: {
    gap: Spacing.sm,
  },
  option: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
    minHeight: 60,
    justifyContent: 'center',
  },
  optionSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#E8F5E9',
  },
  optionLabel: {
    fontSize: Typography.body,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  optionLabelSelected: {
    color: Colors.primaryDark,
  },
  optionDescription: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  optionDescriptionSelected: {
    color: Colors.primaryDark,
  },
});
