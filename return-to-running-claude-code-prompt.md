# Return to Running — Claude Code Kickoff Prompt

## Copy everything below this line into Claude Code to start your project.

---

## Project Overview

Build a mobile app in this folder (`/Users/kellymason/claude-code-projects/return-to-running`) called **"Return to Running"** using **Expo (React Native)** that helps a postpartum runner follow the Brigham & Women's Hospital "Return to Running Protocol." The V1 focus is **Phase III: Walk/Jog Progression** — an interval timer with audio cues, workout logging, and a simple post-run check-in that recommends whether to progress, maintain, or pull back.

The app is for personal use on a single Android device. No user accounts or authentication needed for V1. **The app must work fully offline** — all data persists locally on-device.

---

## Tech Stack

- **Expo SDK** (latest stable) with TypeScript
- **Expo Router** for file-based navigation
- **expo-av** for audio playback (interval transition chimes)
- **SQLite** via `expo-sqlite` for local persistent storage (workout history, settings). Include a simple migration system — store a schema version number and run migrations sequentially on app start.
- **expo-notifications** (local only) if needed for background audio cues
- **expo-keep-awake** to prevent screen sleep during active workouts

---

## Core Features (V1 Scope)

### 1. Interval Timer (Primary Screen)

**Setup:**
- User inputs two values before starting: **walk duration** (minutes) and **jog duration** (minutes).
- The app maps these into a **30-minute session**, always **starting with walking** and ending with a cooldown of at least 5 minutes.
- Calculate interval transitions from wall clock time (Date.now() minus session start), not by incrementing a counter. This prevents timer drift over a 30-minute session.
- Display the planned interval sequence before the user starts (e.g., "Walk 4 min → Jog 2 min → Walk 4 min → Jog 2 min → ... → 30 min total").


**Cooldown logic:**

After the last complete walk/jog cycle, the remaining time becomes a walking cooldown.
Target cooldown: ~5 minutes. The actual cooldown will vary depending on how the intervals divide into 30 minutes.
Minimum cooldown: 3 minutes. If the remaining time after the last full cycle is less than 3 minutes, drop the final cycle and use the longer remaining time as cooldown instead.
Maximum cooldown: no strict cap, but if it exceeds 8 minutes, warn the user during setup that their intervals leave a long cooldown and suggest adjusting.
Display the cooldown as a distinct phase in the interval sequence preview (e.g., "Walk 4 min → Jog 2 min → ... → Cooldown Walk 5 min").
The cooldown counts as walking for timer display purposes (show "COOLDOWN" label instead of "WALK").

Example: 4 min walk / 3 min jog = 4 full cycles (28 min) → 2 min remaining. Since 2 min < 3 min minimum, drop to 3 cycles (21 min) → 9 min cooldown. That exceeds 8 min, so show a suggestion to the user during setup.

**During Workout:**
- Large, glanceable countdown timer showing time remaining in the current interval.
- Clear label: "WALK" or "JOG" with distinct visual treatment (e.g., green for walk, blue for jog).
- Overall session progress bar or elapsed/remaining time.
- **Audio notification** plays automatically at each walk↔jog transition. Use a distinct, short chime — not jarring, but audible over headphones outdoors. Bundle a default sound asset.
- Audio should play even if the screen is off or the app is backgrounded.
- For audio transitions while the app is backgrounded or the screen is off, use a foreground service notification pattern. Research expo-task-manager and Android foreground services. This is the highest-risk technical area — get a working background chime before polishing the UI.
- Pause / Resume button.
- End Early button (still logs the partial workout).
- If the app is killed mid-workout, save the partial workout on the next app open. Don't attempt to resume the timer — just log what was completed.

**Completion:**
- When the 30-minute session ends, play a completion sound and transition to the post-run check-in.

### 2. Post-Run Check-In

After each workout, present 3–4 simple questions to determine the recommended next action. Base the logic on the Brigham & Women's protocol pain guidelines, simplified:

**Questions (answer via tap, not typing):**

1. **"Did you have any pain during your workout?"**
   - No pain
   - Yes, at the start but it went away
   - Yes, it developed and got worse during the workout
   - Yes, it was there the whole time

2. **"How do you feel right now?"** (0–10 slider or segmented scale)
   - 0 = Great, no issues
   - 10 = Significant pain

3. **"Any pain that woke you up last night or kept you awake?"**
   - Yes / No

4. **"Any tightness or discomfort that limits your normal movement this morning?"**
   - Yes / No

**Recommendation Logic:**
- Minimum walk interval: 1 minute. When a 'progress' recommendation would reduce walk below 1 minute, suggest transitioning to continuous jogging (Phase III Stage V in the protocol)

| Condition | Recommendation |
|-----------|---------------|
| No pain, feels great (≤2), no night pain, no morning stiffness | ✅ **Progress** — next session, increase jog time or decrease walk time |
| Pain at start that dissipated, moderate feel (3–5), no night pain | ⏸️ **Maintain** — repeat the same intervals next session |
| Pain that worsened, high discomfort (6+), OR night pain, OR morning stiffness | 🔻 **Pull back** — reduce jog time or increase walk time; consider a rest day |
| Night pain = Yes (regardless of other answers) | 🛑 **Rest** — take at least 1–2 rest days before next session |

Display the recommendation clearly with a brief explanation of why. Save the check-in answers with the workout log.

### 3. Workout History

- Simple list view of past workouts, most recent first.
- Each entry shows: date, walk/jog intervals used, total time completed, and the check-in recommendation.
- Tap a workout to see full check-in answers.
- Show the recommended intervals for the next workout based on the most recent check-in result.

### 4. Home / Dashboard

- Show the **suggested next workout** based on the last check-in recommendation:
  - If "Progress": suggest incremented intervals (e.g., if last was 4W/2J, suggest 3W/3J).
  - If "Maintain": suggest the same intervals.
  - If "Pull back" or "Rest": show a message and the reduced intervals or rest recommendation.
- Quick-start button that pre-fills the suggested intervals into the timer setup.
- Show current streak or total workouts completed (light motivation, nothing aggressive).

---

## Data Model (SQLite)

```sql
CREATE TABLE workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,                    -- ISO 8601
  walk_interval_seconds INTEGER NOT NULL,
  jog_interval_seconds INTEGER NOT NULL,
  planned_duration_seconds INTEGER NOT NULL DEFAULT 1800,
  actual_duration_seconds INTEGER NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT 0,  -- finished full 30 min?
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id INTEGER NOT NULL REFERENCES workouts(id),
  pain_during TEXT NOT NULL,             -- 'none' | 'start_then_gone' | 'worsened' | 'constant'
  feel_now INTEGER NOT NULL,             -- 0-10
  night_pain BOOLEAN NOT NULL,
  morning_stiffness BOOLEAN NOT NULL,
  recommendation TEXT NOT NULL,          -- 'progress' | 'maintain' | 'pull_back' | 'rest'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## Project Structure

```
return-to-running/
├── app/                          # Expo Router pages
│   ├── _layout.tsx               # Root layout with tab navigation
│   ├── index.tsx                  # Home / Dashboard
│   ├── timer.tsx                  # Interval timer setup + active workout
│   ├── checkin.tsx                # Post-run check-in flow
│   └── history.tsx                # Workout history list + detail
├── components/
│   ├── IntervalTimer.tsx          # Countdown display + controls
│   ├── CheckInQuestion.tsx        # Reusable question component
│   └── WorkoutCard.tsx            # History list item
├── lib/
│   ├── db.ts                     # SQLite setup, queries, migrations
│   ├── intervals.ts              # Interval calculation logic
│   ├── recommendations.ts        # Check-in → recommendation logic
│   └── audio.ts                  # Sound playback helpers
├── assets/
│   └── sounds/
│       ├── transition.mp3        # Walk↔jog chime
│       └── complete.mp3          # Session complete sound
└── constants/
    └── theme.ts                  # Colors, typography
```

---

## UX Notes

- **Accessible while running**: large text, high contrast, minimal interaction needed during the active timer. Think "glanceable at arm's length while jogging."
- **Warm, encouraging tone**: this is a recovery app for someone getting back into running postpartum. Avoid anything that feels like a drill sergeant. Celebrate consistency, not intensity.
- **Color palette suggestion**: soft greens and blues, nothing aggressive. Walk = calm green, Jog = energetic blue.

---

## Screen & battery behavior during workouts
- Do NOT use expo-keep-awake. Let Android's normal screen timeout apply.
- The primary interface during a run is audio — chimes at transitions, not the screen. Assume the phone is in a pocket or armband.
- When the user wakes their screen (tap or power button), show the glanceable timer with large text, current interval type, and time remaining. Use high-contrast colors so it's readable in sunlight.
- Use an Android foreground service notification that persists in the notification shade, showing the current interval and time remaining. This serves as a secondary glanceable interface and keeps Android from killing the background process.

---

## Out of Scope for V1

- User accounts / authentication
- Cloud sync
- Phase II: Plyometric Routine (planned for V2)
- Phase IV: Timed Running Schedule
- Social features
- GPS/route tracking
- Heart rate integration

---

## Getting Started

1. Initialize the Expo project: `npx create-expo-app return-to-running --template expo-template-blank-typescript`
2. Install dependencies: `expo-sqlite`, `expo-av`, `expo-keep-awake`, `expo-router`
3. Set up the SQLite database with the schema above, including a migration helper.
4. Build the interval timer screen first — it's the core feature.
5. Add the post-run check-in flow.
6. Build the workout history view.
7. Wire up the home dashboard with suggested next workout.

Start with step 1–3 (project scaffold + database), then we'll iterate on the timer UI.
