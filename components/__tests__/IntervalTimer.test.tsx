import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { IntervalTimer } from '../IntervalTimer';
import { Colors } from '../../constants/theme';

const defaultProps = {
  currentPhase: 'walk' as const,
  secondsRemaining: 240,
  totalSessionSecs: 1800,
  elapsedSecs: 60,
  isPaused: false,
};

describe('IntervalTimer', () => {
  it('renders "WALK" label when currentPhase is walk', () => {
    render(<IntervalTimer {...defaultProps} currentPhase="walk" />);
    expect(screen.getByText('WALK')).toBeTruthy();
  });

  it('renders "JOG" label when currentPhase is jog', () => {
    render(<IntervalTimer {...defaultProps} currentPhase="jog" />);
    expect(screen.getByText('JOG')).toBeTruthy();
  });

  it('renders "COOLDOWN" label when currentPhase is cooldown', () => {
    render(<IntervalTimer {...defaultProps} currentPhase="cooldown" />);
    expect(screen.getByText('COOLDOWN')).toBeTruthy();
  });

  it('displays formatted countdown time (MM:SS)', () => {
    render(<IntervalTimer {...defaultProps} secondsRemaining={150} />);
    expect(screen.getByText('02:30')).toBeTruthy();
  });

  it('displays 00:00 when secondsRemaining is 0', () => {
    render(<IntervalTimer {...defaultProps} secondsRemaining={0} />);
    expect(screen.getByText('00:00')).toBeTruthy();
  });

  it('renders "PAUSED" label (overrides phase label) when isPaused=true', () => {
    render(<IntervalTimer {...defaultProps} isPaused={true} />);
    expect(screen.getByText('PAUSED')).toBeTruthy();
    expect(screen.queryByText('WALK')).toBeNull();
  });

  it('renders "Tap Resume to continue" hint when paused', () => {
    render(<IntervalTimer {...defaultProps} isPaused={true} />);
    expect(screen.getByText('Tap Resume to continue')).toBeTruthy();
  });

  it('does not show pause hint when not paused', () => {
    render(<IntervalTimer {...defaultProps} isPaused={false} />);
    expect(screen.queryByText('Tap Resume to continue')).toBeNull();
  });

  it('progress fill width reflects elapsed / total ratio', () => {
    render(
      <IntervalTimer {...defaultProps} elapsedSecs={900} totalSessionSecs={1800} />
    );
    const fill = screen.getByTestId('progress-fill');
    expect(fill.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ width: '50%' }),
      ])
    );
  });

  it('displays elapsed time label', () => {
    render(<IntervalTimer {...defaultProps} elapsedSecs={120} />);
    expect(screen.getByText('02:00 elapsed')).toBeTruthy();
  });

  it('displays remaining session time label', () => {
    render(
      <IntervalTimer {...defaultProps} elapsedSecs={300} totalSessionSecs={1800} />
    );
    expect(screen.getByText('25:00 remaining')).toBeTruthy();
  });
});
