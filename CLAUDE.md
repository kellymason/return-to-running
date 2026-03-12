# Return to Running

Expo + React Native app (TypeScript) for postpartum return-to-running protocol.

## Stack
- Expo SDK 55, React Native 0.83, React 19
- Expo Router (file-based navigation, tab layout)
- expo-sqlite — local SQLite DB with versioned migrations
- expo-av — foreground audio playback
- expo-notifications — pre-scheduled background audio cues + live progress notification
- @react-native-async-storage/async-storage — crash recovery state

## Commands
```
npm test          # run tests in watch mode
npm run test:ci   # CI mode with coverage
npx expo run:android  # build + run on connected Android device (requires custom dev build)
```

## Before first build
1. Replace `assets/sounds/transition.mp3` with your actual transition chime
2. Replace `assets/sounds/complete.mp3` with your actual completion sound
   (Placeholders exist — they are silent WAV data so the build does not fail)

## Architecture notes
- Timer uses wall-clock time (Date.now() - startMs - pausedMs) — no drift
- Background audio works via pre-scheduled expo-notifications with custom sounds
- Foreground service notification shows current phase + next transition time
- Partial workout crashes recovered via AsyncStorage on next app open

## Key files
- lib/intervals.ts — buildIntervalSequence(), getCurrentInterval(), cooldown logic
- lib/recommendations.ts — computeRecommendation(), suggestNextIntervals()
- lib/db.ts — SQLite migrations + all CRUD
- app/timer.tsx — core feature: setup + active workout screens
