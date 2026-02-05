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
      console.log('🎵 Preloaded', loadedCount, 'music track(s)');
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

    if (!isInitialized) {
      get().initialize();
    }

    // Get or create Howl from cache first
    let newHowl = musicCache.get(src);
    if (!newHowl) {
      console.log('🎵 Creating new Howl for:', src);
      newHowl = audioService.createMusicHowl(src);

      // Apply current mute state to new track
      if (isMusicMuted) {
        newHowl.mute(true);
      }

      musicCache.set(src, newHowl);
      set({ musicCache: new Map(musicCache) });
    } else {
      console.log('🎵 Using cached Howl for:', src);
    }

    console.log('🎵 Current state:', {
      currentTrack: currentMusicTrack,
      requestedTrack: src,
      isSameHowl: currentMusicHowl === newHowl,
      isPlaying: currentMusicHowl?.playing(),
      cacheSize: musicCache.size,
    });

    // If the same music is already playing, do nothing
    if (currentMusicHowl === newHowl && currentMusicHowl.playing()) {
      console.log('🎵 Music already playing:', src);
      return;
    }

    // Stop current music if it's different
    if (currentMusicHowl && currentMusicHowl !== newHowl) {
      console.log('🎵 Stopping old music:', currentMusicTrack);
      currentMusicHowl.stop();
    }

    // Start new music
    console.log('🎵 Starting new music:', src);
    
    // Stop the Howl first if it's already playing to prevent duplicate sounds
    if (newHowl.playing()) {
      console.log('🎵 Stopping existing playback before starting new one');
      newHowl.stop();
    }
    
    newHowl.volume(1);
    newHowl.play();

    set({
      currentMusicHowl: newHowl,
      currentMusicTrack: src,
    });

    console.log('🎵 Set as current:', src);
  },

  // Stop background music
  stopMusic: () => {
    const { currentMusicHowl } = get();

    if (currentMusicHowl) {
      console.log('🎵 Stopping music');
      currentMusicHowl.stop();

      set({
        currentMusicHowl: null,
        currentMusicTrack: null,
      });
    }
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

    console.log('🎵 Audio cleanup completed');
  },
};
});
