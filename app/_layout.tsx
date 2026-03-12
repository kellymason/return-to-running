import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { initDatabase } from '../lib/db';
import { configureAudioSession } from '../lib/audio';
import { configureNotificationHandler, requestNotificationPermissions, setupNotificationChannel } from '../lib/notifications';
import { Colors } from '../constants/theme';

export default function RootLayout() {
  useEffect(() => {
    async function init() {
      await initDatabase();
      await configureAudioSession();
      configureNotificationHandler();
      await setupNotificationChannel();
      await requestNotificationPermissions();
    }

    init().catch((err) => console.error('Init error:', err));
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: Colors.primary,
            tabBarInactiveTintColor: Colors.textMuted,
            tabBarStyle: {
              backgroundColor: Colors.surface,
              borderTopColor: Colors.border,
            },
            headerStyle: {
              backgroundColor: Colors.background,
            },
            headerTintColor: Colors.textPrimary,
            headerTitleStyle: {
              fontWeight: '600',
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Home',
              tabBarIcon: ({ color, size }) => (
                <TabIcon name="home" color={color} size={size} />
              ),
            }}
          />
          <Tabs.Screen
            name="timer"
            options={{
              title: 'Run',
              tabBarIcon: ({ color, size }) => (
                <TabIcon name="timer" color={color} size={size} />
              ),
            }}
          />
          <Tabs.Screen
            name="history"
            options={{
              title: 'History',
              tabBarIcon: ({ color, size }) => (
                <TabIcon name="history" color={color} size={size} />
              ),
            }}
          />
          <Tabs.Screen
            name="checkin"
            options={{
              href: null, // Hidden from tab bar — navigated to programmatically
              title: 'Check In',
            }}
          />
        </Tabs>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Simple emoji-based tab icons that don't require an icon library
function TabIcon({ name, color, size }: { name: string; color: string; size: number }) {
  const icons: Record<string, string> = {
    home: '🏠',
    timer: '▶️',
    history: '📋',
  };
  const { Text } = require('react-native');
  return <Text style={{ fontSize: size - 4 }}>{icons[name] ?? '●'}</Text>;
}
