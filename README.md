# Return to Running

## 1. Project overview

Return to Running is an Expo React Native app for runners building back up after time away due to injury, pregnancy, or other conditions.  
It helps you complete a structured walk/jog session, then uses a short post-run check-in to recommend whether to progress, maintain, pull back, or rest for your next workout.

The core experience is:

- Home dashboard with a suggested next workout split
- Timer setup with interval plan preview and cooldown warnings
- Active workout screen with large glanceable countdown, pause/resume, and end-early support
- Post-run check-in that stores responses and computes a recommendation
- History and workout detail screens for reviewing prior sessions

Offline-first behavior:

- All workout and check-in data is stored locally using SQLite
- If the app is backgrounded or killed during a workout, partial progress is saved and logged on next app launch

## 2. Tech stack

- Expo SDK 54
- React Native 0.81
- React 19
- TypeScript
- Expo Router for file-based navigation
- expo-sqlite for local persistent storage and schema migrations

High-level architecture (inferred from current codebase):

- app/
  - Route-based screens for tabs, timer flow, and history details
- lib/
  - database and migration bootstrap
  - interval planning and timer utilities
  - recommendation logic from check-in answers
  - storage access layer for SQLite CRUD operations
- constants/
  - shared color tokens for UI consistency

## 3. Installation

Prerequisites:

- Node.js LTS (recommended)
- npm (project includes package-lock.json)
- Expo Go on your device, or Android/iOS emulator tooling

Install dependencies:

```bash
npm install
```

## 4. Running locally

Start the Expo dev server:

```bash
npm run start
```

Run directly on Android:

```bash
npm run android
```

Optional targets:

```bash
npm run ios
npm run web
```

TODO: verify iOS and web are part of your intended support scope for this project version.

## 5. Usage walkthrough

1. Open the app and review the suggested next workout on the Home screen.
2. Tap Start Workout to open setup with prefilled intervals.
3. Adjust total duration, walk interval, and jog interval as needed.
4. Review the generated interval sequence, including cooldown.
5. Start the session.
6. During the run:
   - Follow WALK/JOG/COOLDOWN prompts
   - Use Pause/Resume when needed
   - Use End Early if you need to stop (partial workout is still logged)
7. Complete the post-run check-in.
8. Review the recommendation shown at completion.
9. Visit History to view prior workouts and check-in details.
10. Return to Home to see the next suggested interval split based on your latest recommendation.

Recommendation behavior summary:

- Progress: easier walk to jog transition (walk decreases first; jog increases when walk nears minimum)
- Maintain: repeats current split
- Pull back: reduces jog demand and increases walk recovery
- Rest: advises rest first, then returns with easier intervals

## 6. License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
