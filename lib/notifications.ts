import * as Notifications from 'expo-notifications';
import type { Interval, IntervalType } from './intervals';

const PROGRESS_NOTIFICATION_ID = 'workout-progress';
const WORKOUT_NOTIFICATION_TAG = 'workout-transition';

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function setupNotificationChannel(): Promise<void> {
  await Notifications.setNotificationChannelAsync('workout-progress', {
    name: 'Workout Progress',
    importance: Notifications.AndroidImportance.HIGH,
    sound: null, // Channel for live progress notification (no sound)
    vibrationPattern: [0],
    enableVibrate: false,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
  });

  await Notifications.setNotificationChannelAsync('workout-transitions', {
    name: 'Interval Transitions',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'transition', // References transition.mp3 from assets/sounds
    vibrationPattern: [0, 250, 250, 250],
    enableVibrate: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
  });

  await Notifications.setNotificationChannelAsync('workout-complete', {
    name: 'Workout Complete',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'complete', // References complete.mp3 from assets/sounds
    vibrationPattern: [0, 500, 250, 500],
    enableVibrate: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
  });
}

function phaseLabel(type: IntervalType): string {
  switch (type) {
    case 'walk':
      return 'Walk';
    case 'jog':
      return 'Jog';
    case 'cooldown':
      return 'Cool Down';
  }
}

function nextPhaseLabel(type: IntervalType): string {
  switch (type) {
    case 'walk':
      return 'jog';
    case 'jog':
      return 'walk';
    case 'cooldown':
      return 'finish';
  }
}

/**
 * Schedule a local notification for each interval transition.
 * Called once when the workout starts.
 * Returns an array of scheduled notification identifiers (for cancellation).
 */
export async function scheduleWorkoutNotifications(
  intervals: Interval[],
  startTimeMs: number
): Promise<string[]> {
  const ids: string[] = [];

  for (let i = 0; i < intervals.length; i++) {
    const interval = intervals[i];
    const transitionTimeMs = startTimeMs + (interval.startSecs + interval.durationSecs) * 1000;
    const isLast = i === intervals.length - 1;
    const nextInterval = intervals[i + 1];

    const triggerDate = new Date(transitionTimeMs);

    if (isLast) {
      // Completion notification
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎉 Workout Complete!',
          body: 'Amazing work! Head to the app to log your check-in.',
          data: { type: 'complete' },
          sound: 'complete',
          sticky: false,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          channelId: 'workout-complete',
        },
      });
      ids.push(id);
    } else if (nextInterval) {
      // Transition notification
      const nextLabel = phaseLabel(nextInterval.type);
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Time to ${nextLabel}!`,
          body: `${phaseLabel(nextInterval.type)} interval starting now`,
          data: { type: 'transition', nextPhase: nextInterval.type },
          sound: 'transition',
          sticky: false,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          channelId: 'workout-transitions',
        },
      });
      ids.push(id);
    }
  }

  return ids;
}

/**
 * Cancel all previously scheduled workout transition/completion notifications.
 */
export async function cancelWorkoutNotifications(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}

/**
 * Show or update the persistent progress notification in the notification shade.
 * This is the "glanceable" notification showing current phase and next transition.
 */
export async function showProgressNotification(
  currentPhase: IntervalType,
  nextTransitionTime: Date | null
): Promise<void> {
  const label = phaseLabel(currentPhase);
  const nextLabel = nextTransitionTime
    ? `Next: ${nextPhaseLabel(currentPhase)} at ${nextTransitionTime.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`
    : 'Almost done!';

  await Notifications.scheduleNotificationAsync({
    identifier: PROGRESS_NOTIFICATION_ID,
    content: {
      title: `Return to Running — ${label}`,
      body: nextLabel,
      data: { type: 'progress' },
      sticky: true,
      priority: Notifications.AndroidNotificationPriority.LOW,
      ongoing: true,
    },
    trigger: null, // Show immediately
  });
}

/**
 * Dismiss the persistent progress notification.
 */
export async function dismissProgressNotification(): Promise<void> {
  await Notifications.dismissNotificationAsync(PROGRESS_NOTIFICATION_ID);
}

/**
 * Configure the default notification handler (called once in _layout.tsx).
 */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
