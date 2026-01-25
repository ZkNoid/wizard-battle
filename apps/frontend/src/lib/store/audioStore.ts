import { create } from 'zustand';
import { audioService } from '../services/audioService';
import type { MusicTrack, SoundEffect } from '../constants/audioAssets';

/**
 * Audio Store - Manages audio state and playback
 *
 * This store provides centralized audio management including:
 * - Volume control
 * - Mute state
 * - Current playing music
 * - Sound effects playback
 *
 * Usage:
 * ```typescript
 * const {
 *   volume,
 *   isMuted,
 *   setVolume,
 *   toggleMute,
 *   playMusic,
 *   playSound
 * } = useAudioStore();
 *
 * // Set volume
 * setVolume(75);
 *
 * // Play background music
 * playMusic('/audio/music/background/fantasy-village.mp3');
 *
 * // Play sound effect
 * playSound('/audio/sfx/ui/click.mp3');
 * ```
 */

interface AudioStore {
  // State
  volume: number; // 0-100
  isMuted: boolean;
  currentMusic: MusicTrack | null;
  isInitialized: boolean;

  // Actions
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  playMusic: (src: MusicTrack, fadeDuration?: number) => void;
  stopMusic: (fadeDuration?: number) => void;
  pauseMusic: () => void;
  resumeMusic: () => void;
  playSound: (src: SoundEffect) => void;
  initialize: () => void;
}

export const useAudioStore = create<AudioStore>((set, get) => ({
  // Initial state
  volume: 50,
  isMuted: false,
  currentMusic: null,
  isInitialized: false,

  // Initialize audio system
  initialize: () => {
    const { volume, isMuted } = get();
    audioService.setMasterVolume(volume);
    audioService.setMuted(isMuted);
    set({ isInitialized: true });
  },

  // Set volume (0-100)
  setVolume: (volume: number) => {
    const clampedVolume = Math.max(0, Math.min(100, volume));
    audioService.setMasterVolume(clampedVolume);
    set({ volume: clampedVolume });
  },

  // Toggle mute state
  toggleMute: () => {
    const { isMuted } = get();
    const newMutedState = !isMuted;
    audioService.setMuted(newMutedState);
    set({ isMuted: newMutedState });
  },

  // Set mute state directly
  setMuted: (muted: boolean) => {
    audioService.setMuted(muted);
    set({ isMuted: muted });
  },

  // Play background music
  playMusic: (src: MusicTrack, fadeDuration = 500) => {
    const { isInitialized } = get();
    if (!isInitialized) {
      get().initialize();
    }
    audioService.playMusic(src, fadeDuration);
    set({ currentMusic: src });
  },

  // Stop background music
  stopMusic: (fadeDuration = 500) => {
    audioService.stopMusic(fadeDuration);
    set({ currentMusic: null });
  },

  // Pause background music
  pauseMusic: () => {
    audioService.pauseMusic();
  },

  // Resume background music
  resumeMusic: () => {
    audioService.resumeMusic();
  },

  // Play sound effect
  playSound: (src: SoundEffect) => {
    const { isInitialized } = get();
    if (!isInitialized) {
      get().initialize();
    }
    audioService.playSound(src);
  },
}));
