import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { WorkoutCard } from '../WorkoutCard';
import type { WorkoutWithCheckin } from '../../lib/db';

const baseWorkout: WorkoutWithCheckin = {
  id: 1,
  date: '2024-01-15T10:00:00.000Z',
  walk_interval_seconds: 240,
  jog_interval_seconds: 120,
  planned_duration_seconds: 1800,
  actual_duration_seconds: 1800,
  completed: true,
  created_at: '2024-01-15T10:00:00.000Z',
  checkin: null,
};

const workoutWithCheckin: WorkoutWithCheckin = {
  ...baseWorkout,
  checkin: {
    id: 1,
    workout_id: 1,
    pain_during: 'none',
    feel_now: 0,
    night_pain: false,
    morning_stiffness: false,
    recommendation: 'progress',
    created_at: '2024-01-15T10:35:00.000Z',
  },
};

describe('WorkoutCard', () => {
  it('displays a formatted date', () => {
    render(<WorkoutCard workout={baseWorkout} />);
    // Date should be formatted — check it renders something date-like
    expect(screen.getByText(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/)).toBeTruthy();
  });

  it('displays interval format like "4W / 2J"', () => {
    render(<WorkoutCard workout={baseWorkout} />);
    expect(screen.getByText('4W / 2J')).toBeTruthy();
  });

  it('displays duration in minutes', () => {
    render(<WorkoutCard workout={baseWorkout} />);
    expect(screen.getByText('30 min')).toBeTruthy();
  });

  it('shows "Incomplete" badge when completed=false', () => {
    render(<WorkoutCard workout={{ ...baseWorkout, completed: false }} />);
    expect(screen.getByText('Incomplete')).toBeTruthy();
  });

  it('does not show "Incomplete" badge when completed=true', () => {
    render(<WorkoutCard workout={baseWorkout} />);
    expect(screen.queryByText('Incomplete')).toBeNull();
  });

  it('shows "✅ Progress" recommendation badge', () => {
    render(<WorkoutCard workout={workoutWithCheckin} />);
    expect(screen.getByText('✅ Progress')).toBeTruthy();
  });

  it('shows "🛑 Rest" recommendation badge', () => {
    const restWorkout: WorkoutWithCheckin = {
      ...workoutWithCheckin,
      checkin: { ...workoutWithCheckin.checkin!, recommendation: 'rest' },
    };
    render(<WorkoutCard workout={restWorkout} />);
    expect(screen.getByText('🛑 Rest')).toBeTruthy();
  });

  it('shows "⏸️ Maintain" recommendation badge', () => {
    const maintainWorkout: WorkoutWithCheckin = {
      ...workoutWithCheckin,
      checkin: { ...workoutWithCheckin.checkin!, recommendation: 'maintain' },
    };
    render(<WorkoutCard workout={maintainWorkout} />);
    expect(screen.getByText('⏸️ Maintain')).toBeTruthy();
  });

  it('shows "🔻 Pull back" recommendation badge', () => {
    const pullBackWorkout: WorkoutWithCheckin = {
      ...workoutWithCheckin,
      checkin: { ...workoutWithCheckin.checkin!, recommendation: 'pull_back' },
    };
    render(<WorkoutCard workout={pullBackWorkout} />);
    expect(screen.getByText('🔻 Pull back')).toBeTruthy();
  });

  it('does not show recommendation badge when no check-in', () => {
    render(<WorkoutCard workout={baseWorkout} />);
    expect(screen.queryByText(/Progress|Maintain|Pull back|Rest/)).toBeNull();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<WorkoutCard workout={baseWorkout} onPress={onPress} />);
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
