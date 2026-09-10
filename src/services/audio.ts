import { AppState } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioSource } from 'expo-audio';

import { useSettingsStore } from '../stores/useSettingsStore';

export type SoundEffectEvent =
  | 'loopClose'
  | 'capture'
  | 'combo'
  | 'goldCapture'
  | 'levelComplete'
  | 'rewardOpen';

// No .mp3/.wav assets are bundled with the project yet. Drop files into
// assets/audio/ and register them here (e.g.
// `capture: require('../../assets/audio/capture.mp3')`) to turn on real
// playback - everything below already respects settings and mixes/layers
// correctly, it just has nothing to play until then. Until a source is
// registered, playSound()/playMusic() for that event are silent no-ops,
// never errors.
const SOUND_SOURCES: Partial<Record<SoundEffectEvent, AudioSource>> = {};
const MUSIC_SOURCE: AudioSource | null = null;

let audioModePromise: Promise<void> | null = null;
const effectPlayers = new Map<SoundEffectEvent, AudioPlayer>();
let musicPlayer: AudioPlayer | null = null;
let musicShouldBePlaying = false;

function ensureAudioMode(): Promise<void> {
  if (!audioModePromise) {
    audioModePromise = setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    }).catch(() => {
      // Best-effort: playback still works with platform defaults if this fails.
    });
  }
  return audioModePromise;
}

function getEffectPlayer(event: SoundEffectEvent): AudioPlayer | null {
  const source = SOUND_SOURCES[event];
  if (!source) return null;

  let player = effectPlayers.get(event);
  if (!player) {
    player = createAudioPlayer(source);
    effectPlayers.set(event, player);
  }
  return player;
}

// One-shot sound effect. Safe to call rapidly (combo captures, repeated
// taps) - each call just restarts that event's single shared player from
// the top rather than stacking overlapping instances.
export async function playSound(event: SoundEffectEvent): Promise<void> {
  if (!useSettingsStore.getState().soundEnabled) return;
  const player = getEffectPlayer(event);
  if (!player) return;

  await ensureAudioMode();
  try {
    player.seekTo(0);
    player.play();
  } catch {
    // A codec/platform playback failure should never take gameplay down.
  }
}

export async function playMusic(): Promise<void> {
  musicShouldBePlaying = true;
  if (!useSettingsStore.getState().musicEnabled || !MUSIC_SOURCE) return;

  await ensureAudioMode();
  try {
    if (!musicPlayer) {
      musicPlayer = createAudioPlayer(MUSIC_SOURCE);
      musicPlayer.loop = true;
    }
    musicPlayer.play();
  } catch {
    // ignore
  }
}

export function stopMusic(): void {
  musicShouldBePlaying = false;
  try {
    musicPlayer?.pause();
  } catch {
    // ignore
  }
}

// Reacts live to the player toggling Music in Settings mid-playback, not
// just the next time playMusic() happens to be called.
let previousMusicEnabled = useSettingsStore.getState().musicEnabled;
useSettingsStore.subscribe((state) => {
  if (state.musicEnabled === previousMusicEnabled) return;
  previousMusicEnabled = state.musicEnabled;
  if (state.musicEnabled) void playMusic();
  else stopMusic();
});

// Background music should not keep playing (or draining battery) while the
// app is backgrounded, independent of any one screen's own pause handling.
AppState.addEventListener('change', (nextState) => {
  if (!musicPlayer) return;
  if (nextState === 'active') {
    if (musicShouldBePlaying && useSettingsStore.getState().musicEnabled) {
      try {
        musicPlayer.play();
      } catch {
        // ignore
      }
    }
  } else {
    try {
      musicPlayer.pause();
    } catch {
      // ignore
    }
  }
});
