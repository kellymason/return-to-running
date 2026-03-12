# Return to Running

A return-to-running protocol app for iOS and Android. Built with Expo + React Native, co-created with [Claude](https://claude.ai).

The app guides users through a structured walk-jog interval program, automatically advancing or pulling back based on post-run pain check-ins. It works in the foreground and background — audio transition cues and notifications fire even when the screen is off.

---

## Screenshots

<!-- Add screenshots here -->
| Home | Active Workout | History |
|------|---------------|---------|
| _coming soon_ | _coming soon_ | _coming soon_ |

---

## Features

- **Structured intervals** — customizable walk/jog durations in 30-minute sessions
- **Smart recommendations** — post-run check-in drives progress, maintain, pull-back, or rest decisions
- **Background audio cues** — transition chimes pre-scheduled via expo-notifications; survive screen-off
- **Crash recovery** — partially completed workouts restore on next app open
- **Local-first** — all data stored on-device via SQLite; no account required

---

## Tech Stack

- Expo SDK 55 / React Native 0.83 / React 19
- Expo Router (file-based tabs navigation)
- expo-sqlite — versioned local database
- expo-av — foreground audio playback
- expo-notifications — background audio cues + live progress notification
- @react-native-async-storage/async-storage — crash recovery state

---

## Prerequisites

- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- For device builds: a physical device or emulator with a **custom dev build** (Expo Go is not supported due to expo-notifications custom sounds and expo-sqlite)

---

## Getting Started

**1. Install dependencies**

```bash
npm install
```

**2. Add sound assets**

Replace the placeholder files with real audio before building:

- `assets/sounds/transition.mp3` — played at each walk/jog transition
- `assets/sounds/complete.mp3` — played when the workout finishes

(The placeholders are silent audio files so the build won't fail without them.)

**3. Start the development server**

```bash
npx expo start
```

**4. Run on a device (requires custom dev build)**

```bash
# Android
npx expo run:android

# iOS
npx expo run:ios
```

---

## Running Tests

```bash
npm test          # watch mode
npm run test:ci   # CI mode with coverage
```

---

## Project Structure

```
app/          # Expo Router screens (tabs: home, timer, check-in, history)
lib/          # Business logic: intervals, recommendations, db, audio, notifications
components/   # Reusable UI components
constants/    # Design tokens (colors, typography, spacing)
assets/       # Icons and sound files
```

Key files:

- `lib/intervals.ts` — interval sequence builder and wall-clock timer logic
- `lib/recommendations.ts` — pain assessment → next-session recommendation engine
- `lib/db.ts` — SQLite migrations and all CRUD operations
- `app/timer.tsx` — setup screen and active workout screen

---

## License

MIT
