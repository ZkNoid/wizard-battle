import { create } from 'zustand';
import { audioService } from '../services/audioService';
import type { MusicTrack, SoundEffect } from '../constants/audioAssets';
import { Howl } from 'howler';

/**
 * Audio Store - Manages audio state and playback
 *
 * This store provides centralized audio management including:
 * - Volume control
 * - Mute state
 * - Current playing music with caching
 * - Sound effects playback
 * - Music preloading
 *
 * Usage:
 * ```typescript
 * const {
 *   volume,
 *   isMuted,
 *   setVolume,
 *   toggleMute,
 *   playMusic,
 *   preloadMusic,
 *   playSound
 * } = useAudioStore();
 *
 * // Preload music tracks
 * preloadMusic(['/audio/music/background/fantasy-village.mp3']);
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
  isMusicMuted: boolean; // Separate mute for music only
  musicCache: Map<MusicTrack, Howl>; // Cache of all loaded music tracks
  currentMusicHowl: Howl | null; // Current playing Howl instance
  currentMusicTrack: MusicTrack | null; // Current track path
  isInitialized: boolean;

  // Actions
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  toggleMusicMute: () => void;
  setMusicMuted: (muted: boolean) => void;
  playMusic: (src: MusicTrack) => void;
  preloadMusic: (tracks: MusicTrack[]) => void;
  stopMusic: () => void;
  pauseMusic: () => void;
  resumeMusic: () => void;
  playSound: (src: SoundEffect) => void;
  cleanup: () => void;
  initialize: () => void;
}

export const useAudioStore = create<AudioStore>((set, get) => {
  // Auto-cleanup on window unload
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      get().cleanup();
    });
  }

  return {
    // Initial state
    volume: 50,
    isMuted: false,
    isMusicMuted: false,
    musicCache: new Map<MusicTrack, Howl>(),
    currentMusicHowl: null,
    currentMusicTrack: null,
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

    // Toggle music mute state (only music, not SFX)
    toggleMusicMute: () => {
      const { isMusicMuted, musicCache } = get();
      const newMutedState = !isMusicMuted;

      // Apply mute state to all cached music tracks
      musicCache.forEach((howl) => howl.mute(newMutedState));

      set({ isMusicMuted: newMutedState });
    },

    // Set music mute state directly
    setMusicMuted: (muted: boolean) => {
      const { musicCache } = get();

      // Apply mute state to all cached music tracks
      musicCache.forEach((howl) => howl.mute(muted));

      set({ isMusicMuted: muted });
    },

    // Preload music tracks into cache
    preloadMusic: (tracks: MusicTrack[]) => {
      const { musicCache, isMusicMuted, isInitialized } = get();

      if (!isInitialized) {
        get().initialize();
      }

      let loadedCount = 0;
      tracks.forEach((track) => {
        if (!musicCache.has(track)) {
          const howl = audioService.createMusicHowl(track);

          // Apply current mute state to new track
          if (isMusicMuted) {
            howl.mute(true);
          }

          musicCache.set(track, howl);
          loadedCount++;
        }
      });

      if (loadedCount > 0) {
        set({ musicCache: new Map(musicCache) });
      }
    },

    // Play background music
    playMusic: (src: MusicTrack) => {
      const {
        isInitialized,
        musicCache,
        currentMusicHowl,
        currentMusicTrack,
        isMusicMuted,
      } = get();

      // If the same track is already playing or loading, do nothing
      if (currentMusicTrack === src && currentMusicHowl) {
        // Check if loading (prevents race condition) or already playing
        const state = currentMusicHowl.state();
        if (state === 'loading' || currentMusicHowl.playing()) {
          return;
        }
      }

      if (!isInitialized) {
        get().initialize();
      }

      // Get or create Howl from cache first
      let newHowl = musicCache.get(src);
      if (!newHowl) {
        newHowl = audioService.createMusicHowl(src);

        // Apply current mute state to new track
        if (isMusicMuted) {
          newHowl.mute(true);
        }

        musicCache.set(src, newHowl);
        set({ musicCache: new Map(musicCache) });
      }

      // Stop current music if it's different
      if (currentMusicHowl && currentMusicHowl !== newHowl) {
        currentMusicHowl.stop();
      }

      // Stop the Howl first if it's already playing to prevent duplicate sounds
      if (newHowl.playing()) {
        newHowl.stop();
      }

      // Set state BEFORE calling play() to prevent race conditions
      set({
        currentMusicHowl: newHowl,
        currentMusicTrack: src,
      });

      newHowl.volume(1);
      newHowl.play();
    },

    // Stop background music
    stopMusic: () => {
      const { currentMusicHowl } = get();

      if (currentMusicHowl) {
        currentMusicHowl.stop();
      }

      set({
        currentMusicHowl: null,
        currentMusicTrack: null,
      });
    },

    // Pause background music
    pauseMusic: () => {
      const { currentMusicHowl } = get();
      if (currentMusicHowl) {
        currentMusicHowl.pause();
      }
    },

    // Resume background music
    resumeMusic: () => {
      const { currentMusicHowl } = get();
      if (currentMusicHowl) {
        currentMusicHowl.play();
      }
    },

    // Play sound effect
    playSound: (src: SoundEffect) => {
      const { isInitialized } = get();
      if (!isInitialized) {
        get().initialize();
      }
      audioService.playSound(src);
    },

    // Cleanup all audio resources
    cleanup: () => {
      const { musicCache, currentMusicHowl } = get();

      // Stop current music
      if (currentMusicHowl) {
        currentMusicHowl.stop();
      }

      // Unload all cached music tracks
      musicCache.forEach((howl) => {
        howl.unload();
      });

      // Cleanup sound effects
      audioService.cleanupSoundEffects();

      set({
        musicCache: new Map(),
        currentMusicHowl: null,
        currentMusicTrack: null,
      });
    },
  };
});
