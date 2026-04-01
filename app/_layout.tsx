import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { getDatabase } from '@/lib/database';
import { getPendingWorkout, saveWorkout, clearPendingWorkout } from '@/lib/storage';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        await getDatabase();

        // Check for pending workout from a killed app
        const pending = await getPendingWorkout();
        if (pending) {
          await saveWorkout({
            date: pending.start_time,
            walk_interval_seconds: pending.walk_interval_seconds,
            jog_interval_seconds: pending.jog_interval_seconds,
            planned_duration_seconds: pending.planned_duration_seconds,
            actual_duration_seconds: pending.elapsed_seconds,
            completed: 0,
          });
          await clearPendingWorkout();
        }
      } catch (e) {
        console.error('Init error:', e);
      } finally {
        setReady(true);
        SplashScreen.hideAsync();
      }
    }
    init();
  }, []);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="timer/setup"
          options={{
            headerShown: true,
            title: 'Set Up Workout',
            headerStyle: { backgroundColor: '#FFF8F0' },
            headerTintColor: '#2D2D2D',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="timer/active"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="timer/checkin"
          options={{
            headerShown: true,
            title: 'Post-Run Check-In',
            headerStyle: { backgroundColor: '#FFF8F0' },
            headerTintColor: '#2D2D2D',
            gestureEnabled: false,
            headerBackVisible: false,
          }}
        />
        <Stack.Screen
          name="timer/complete"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="history/[id]"
          options={{
            headerShown: true,
            title: 'Workout Details',
            headerStyle: { backgroundColor: '#FFF8F0' },
            headerTintColor: '#2D2D2D',
          }}
        />
      </Stack>
    </>
  );
}
