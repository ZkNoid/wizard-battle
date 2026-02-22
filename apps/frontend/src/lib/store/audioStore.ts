import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { audioService } from '../services/audioService';
import type { MusicTrack, SoundEffect } from '../constants/audioAssets';
import { Howl } from 'howler';
import { trackEvent } from '../analytics/posthog-utils';
import { AnalyticsEvents } from '../analytics/events';

interface AudioStore {
  // State
  musicVolume: number;      // 0-100, controls background music
  interfaceVolume: number;  // 0-100, controls UI sounds (hover, click, modals)
  effectsVolume: number;    // 0-100, controls battle spell sounds
  isMuted: boolean;
  musicCache: Map<MusicTrack, Howl>;
  currentMusicHowl: Howl | null;
  currentMusicTrack: MusicTrack | null;
  isInitialized: boolean;

  // Actions
  setMusicVolume: (volume: number) => void;
  setInterfaceVolume: (volume: number) => void;
  setEffectsVolume: (volume: number) => void;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  playMusic: (src: MusicTrack) => void;
  preloadMusic: (tracks: MusicTrack[]) => void;
  stopMusic: () => void;
  pauseMusic: () => void;
  resumeMusic: () => void;
  playSound: (src: SoundEffect) => void;
  playInterfaceSound: (src: SoundEffect) => void;
  playEffectsSound: (src: SoundEffect) => void;
  cleanup: () => void;
  initialize: () => void;
}

export const useAudioStore = create<AudioStore>()(
  persist(
    (set, get) => {
      if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', () => {
          get().cleanup();
        });
      }

      return {
        // Initial state
        musicVolume: 50,
        interfaceVolume: 70,
        effectsVolume: 80,
        isMuted: false,
        musicCache: new Map<MusicTrack, Howl>(),
        currentMusicHowl: null,
        currentMusicTrack: null,
        isInitialized: false,

        initialize: () => {
          const { musicVolume, interfaceVolume, effectsVolume, isMuted } = get();
          audioService.setMusicVolume(musicVolume);
          audioService.setInterfaceVolume(interfaceVolume);
          audioService.setEffectsVolume(effectsVolume);
          audioService.setMuted(isMuted);
          set({ isInitialized: true });
        },

        setMusicVolume: (volume: number) => {
          const v = Math.max(0, Math.min(100, volume));
          const { musicCache } = get();
          // Update volume on all cached music Howls live
          musicCache.forEach((howl) => howl.volume(v / 100));
          audioService.setMusicVolume(v);
          set({ musicVolume: v });
        },

        setInterfaceVolume: (volume: number) => {
          const v = Math.max(0, Math.min(100, volume));
          audioService.setInterfaceVolume(v);
          set({ interfaceVolume: v });
        },

        setEffectsVolume: (volume: number) => {
          const v = Math.max(0, Math.min(100, volume));
          audioService.setEffectsVolume(v);
          set({ effectsVolume: v });
        },

        toggleMute: () => {
          const { isMuted } = get();
          const newMuted = !isMuted;
          audioService.setMuted(newMuted);
          set({ isMuted: newMuted });
        },

        setMuted: (muted: boolean) => {
          audioService.setMuted(muted);
          set({ isMuted: muted });
        },

        preloadMusic: (tracks: MusicTrack[]) => {
          const { musicCache, musicVolume, isInitialized } = get();

          if (!isInitialized) {
            get().initialize();
          }

          let loadedCount = 0;
          tracks.forEach((track) => {
            if (!musicCache.has(track)) {
              const howl = audioService.createMusicHowl(track);
              howl.volume(musicVolume / 100);
              musicCache.set(track, howl);
              loadedCount++;
            }
          });

          if (loadedCount > 0) {
            set({ musicCache: new Map(musicCache) });
          }
        },

        playMusic: (src: MusicTrack) => {
          const {
            isInitialized,
            musicCache,
            currentMusicHowl,
            currentMusicTrack,
            musicVolume,
            isMuted,
          } = get();

          if (currentMusicTrack === src) {
            return;
          }

          if (!isInitialized) {
            get().initialize();
          }

          let newHowl = musicCache.get(src);
          if (!newHowl) {
            newHowl = audioService.createMusicHowl(src);
            musicCache.set(src, newHowl);
            set({ musicCache: new Map(musicCache) });
          }

          if (currentMusicHowl && currentMusicHowl !== newHowl) {
            currentMusicHowl.stop();
          }

          if (newHowl.playing()) {
            newHowl.stop();
          }

          set({
            currentMusicHowl: newHowl,
            currentMusicTrack: src,
          });

          newHowl.volume(isMuted ? 0 : musicVolume / 100);
          newHowl.play();
        },

        stopMusic: () => {
          const { currentMusicHowl } = get();
          if (currentMusicHowl) {
            currentMusicHowl.stop();
          }
          set({ currentMusicHowl: null, currentMusicTrack: null });
        },

        pauseMusic: () => {
          const { currentMusicHowl } = get();
          if (currentMusicHowl) {
            currentMusicHowl.pause();
          }
        },

        resumeMusic: () => {
          const { currentMusicHowl } = get();
          if (currentMusicHowl) {
            currentMusicHowl.play();
          }
        },

        playSound: (src: SoundEffect) => {
          const { isInitialized } = get();
          if (!isInitialized) {
            get().initialize();
          }
          audioService.playInterfaceSound(src);
        },

        playInterfaceSound: (src: SoundEffect) => {
          const { isInitialized } = get();
          if (!isInitialized) {
            get().initialize();
          }
          audioService.playInterfaceSound(src);
        },

        playEffectsSound: (src: SoundEffect) => {
          const { isInitialized } = get();
          if (!isInitialized) {
            get().initialize();
          }
          audioService.playEffectsSound(src);
        },

        cleanup: () => {
          const { musicCache, currentMusicHowl } = get();

          if (currentMusicHowl) {
            currentMusicHowl.stop();
          }

          musicCache.forEach((howl) => {
            howl.unload();
          });

          audioService.cleanupSoundEffects();

          set({
            musicCache: new Map(),
            currentMusicHowl: null,
            currentMusicTrack: null,
          });
        },
      };
    },
    {
      name: '@zknoid/wizard-battle/audio-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist volume settings, not runtime audio state
      partialize: (state) => ({
        musicVolume: state.musicVolume,
        interfaceVolume: state.interfaceVolume,
        effectsVolume: state.effectsVolume,
        isMuted: state.isMuted,
      }),
    }
  )
);
