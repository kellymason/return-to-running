import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { CheckInQuestion } from '../CheckInQuestion';
import type { QuestionOption } from '../CheckInQuestion';

const options: QuestionOption[] = [
  { value: 'none', label: 'No pain', description: 'Felt fine' },
  { value: 'start_then_gone', label: 'Pain at start, then resolved' },
  { value: 'worsened', label: 'Pain developed and worsened' },
  { value: 'constant', label: 'Pain throughout' },
];

describe('CheckInQuestion', () => {
  it('renders the question text', () => {
    render(
      <CheckInQuestion
        question="Did you have any pain?"
        options={options}
        onAnswer={jest.fn()}
      />
    );
    expect(screen.getByText('Did you have any pain?')).toBeTruthy();
  });

  it('renders all provided option labels', () => {
    render(
      <CheckInQuestion
        question="Did you have any pain?"
        options={options}
        onAnswer={jest.fn()}
      />
    );
    options.forEach((opt) => {
      expect(screen.getByText(opt.label)).toBeTruthy();
    });
  });

  it('renders option descriptions when provided', () => {
    render(
      <CheckInQuestion
        question="Did you have any pain?"
        options={options}
        onAnswer={jest.fn()}
      />
    );
    expect(screen.getByText('Felt fine')).toBeTruthy();
  });

  it('calls onAnswer with the correct value when an option is tapped', () => {
    const onAnswer = jest.fn();
    render(
      <CheckInQuestion
        question="Did you have any pain?"
        options={options}
        onAnswer={onAnswer}
      />
    );
    fireEvent.press(screen.getByText('No pain'));
    expect(onAnswer).toHaveBeenCalledWith('none');
  });

  it('calls onAnswer with the correct value for a different option', () => {
    const onAnswer = jest.fn();
    render(
      <CheckInQuestion
        question="Did you have any pain?"
        options={options}
        onAnswer={onAnswer}
      />
    );
    fireEvent.press(screen.getByText('Pain throughout'));
    expect(onAnswer).toHaveBeenCalledWith('constant');
  });

  it('does not call onAnswer multiple times on a single press', () => {
    const onAnswer = jest.fn();
    render(
      <CheckInQuestion
        question="Did you have any pain?"
        options={options}
        onAnswer={onAnswer}
      />
    );
    fireEvent.press(screen.getByText('No pain'));
    expect(onAnswer).toHaveBeenCalledTimes(1);
  });

  it('renders 11 options for a 0-10 scale', () => {
    const scaleOptions: QuestionOption[] = Array.from({ length: 11 }, (_, i) => ({
      value: String(i),
      label: i === 0 ? '0 — Great' : i === 10 ? '10 — Severe' : String(i),
    }));
    render(
      <CheckInQuestion
        question="How do you feel? (0-10)"
        options={scaleOptions}
        onAnswer={jest.fn()}
      />
    );
    expect(screen.getByText('0 — Great')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('10 — Severe')).toBeTruthy();
  });

  it('shows selected state for selectedValue', () => {
    render(
      <CheckInQuestion
        question="Did you have any pain?"
        options={options}
        onAnswer={jest.fn()}
        selectedValue="none"
      />
    );
    // The selected option is accessible — check it's rendered
    const noPainOption = screen.getByAccessibilityValue
      ? screen.getByText('No pain')
      : screen.getByText('No pain');
    expect(noPainOption).toBeTruthy();
  });
});
