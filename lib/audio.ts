import { Audio } from 'expo-av';

// These files must be placed in assets/sounds/ by the user before running.
// The app will log a warning and skip playback if they are missing.
const transitionSound = require('../assets/sounds/transition.mp3');
const completeSound = require('../assets/sounds/complete.mp3');

let transitionSoundObject: Audio.Sound | null = null;
let completeSoundObject: Audio.Sound | null = null;

/**
 * Configure the audio session for background playback.
 * Call once on app start in _layout.tsx.
 */
export async function configureAudioSession(): Promise<void> {
  await Audio.setAudioModeAsync({
    staysActiveInBackground: true,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: false,
    playThroughEarpieceAndroid: false,
  });
}

/**
 * Preload both sounds so they play without latency during a workout.
 */
export async function preloadSounds(): Promise<void> {
  try {
    const { sound: t } = await Audio.Sound.createAsync(transitionSound, {
      shouldPlay: false,
      volume: 1.0,
    });
    transitionSoundObject = t;
  } catch (err) {
    console.warn('[audio] Could not load transition.mp3 — place it in assets/sounds/', err);
  }

  try {
    const { sound: c } = await Audio.Sound.createAsync(completeSound, {
      shouldPlay: false,
      volume: 1.0,
    });
    completeSoundObject = c;
  } catch (err) {
    console.warn('[audio] Could not load complete.mp3 — place it in assets/sounds/', err);
  }
}

/**
 * Unload preloaded sounds (call when workout ends or on unmount).
 */
export async function unloadSounds(): Promise<void> {
  if (transitionSoundObject) {
    await transitionSoundObject.unloadAsync();
    transitionSoundObject = null;
  }
  if (completeSoundObject) {
    await completeSoundObject.unloadAsync();
    completeSoundObject = null;
  }
}

/**
 * Play the transition chime (walk↔jog).
 * Uses the preloaded sound object if available, falls back to a fresh load.
 */
export async function playTransitionSound(): Promise<void> {
  try {
    if (transitionSoundObject) {
      await transitionSoundObject.setPositionAsync(0);
      await transitionSoundObject.playAsync();
    } else {
      const { sound } = await Audio.Sound.createAsync(transitionSound, { shouldPlay: true });
      // Let it clean itself up after playing
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    }
  } catch (err) {
    console.warn('[audio] playTransitionSound failed:', err);
  }
}

/**
 * Play the session completion sound.
 */
export async function playCompleteSound(): Promise<void> {
  try {
    if (completeSoundObject) {
      await completeSoundObject.setPositionAsync(0);
      await completeSoundObject.playAsync();
    } else {
      const { sound } = await Audio.Sound.createAsync(completeSound, { shouldPlay: true });
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    }
  } catch (err) {
    console.warn('[audio] playCompleteSound failed:', err);
  }
}
