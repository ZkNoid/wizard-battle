import { useCallback, useEffect } from 'react';
import { useAudioStore } from '../store/audioStore';
import { AUDIO_ASSETS } from '../constants/audioAssets';
import { EventBus } from '@/game/EventBus';
import type { ISpell } from '../../../../common/stater/spells/interface';

export function useSound() {
  const playInterfaceSound = useAudioStore((state) => state.playInterfaceSound);

  return useCallback(
    (soundKey: string) => {
      const findSound = (obj: any, key: string): string | null => {
        for (const k in obj) {
          if (k === key) return obj[k];
          if (typeof obj[k] === 'object') {
            const found = findSound(obj[k], key);
            if (found) return found;
          }
        }
        return null;
      };

      const soundPath = findSound(AUDIO_ASSETS.sfx, soundKey);
      if (soundPath) {
        playInterfaceSound(soundPath);
      }
    },
    [playInterfaceSound]
  );
}

export function useHoverSound() {
  const playInterfaceSound = useAudioStore((state) => state.playInterfaceSound);

  return useCallback(() => {
    playInterfaceSound(AUDIO_ASSETS.sfx.ui.hover);
  }, [playInterfaceSound]);
}

export function useClickSound() {
  const playInterfaceSound = useAudioStore((state) => state.playInterfaceSound);

  return useCallback(() => {
    playInterfaceSound(AUDIO_ASSETS.sfx.ui.click);
  }, [playInterfaceSound]);
}

export function usePreloadMusic() {
  const preload = useAudioStore((state) => state.preloadMusic);

  return useCallback(() => {
    const tracksToPreload = [
      AUDIO_ASSETS.music.background.fantasyVillage,
      AUDIO_ASSETS.music.battle.deathTaker,
    ];
    preload(tracksToPreload);
  }, [preload]);
}

export function useBackgroundMusic() {
  const playMusic = useAudioStore((state) => state.playMusic);
  const stopMusic = useAudioStore((state) => state.stopMusic);

  const playMainTheme = useCallback(() => {
    playMusic(AUDIO_ASSETS.music.background.fantasyVillage);
  }, [playMusic]);

  const playBattleMusic = useCallback(() => {
    playMusic(AUDIO_ASSETS.music.battle.deathTaker);
  }, [playMusic]);

  const stopCurrentMusic = useCallback(() => {
    stopMusic();
  }, [stopMusic]);

  return {
    playMainTheme,
    playBattleMusic,
    stopMusic: stopCurrentMusic,
  };
}

export function useAudioControls() {
  const musicVolume = useAudioStore((state) => state.musicVolume);
  const interfaceVolume = useAudioStore((state) => state.interfaceVolume);
  const effectsVolume = useAudioStore((state) => state.effectsVolume);
  const isMuted = useAudioStore((state) => state.isMuted);
  const setMusicVolume = useAudioStore((state) => state.setMusicVolume);
  const setInterfaceVolume = useAudioStore((state) => state.setInterfaceVolume);
  const setEffectsVolume = useAudioStore((state) => state.setEffectsVolume);
  const toggleMute = useAudioStore((state) => state.toggleMute);
  const setMuted = useAudioStore((state) => state.setMuted);

  return {
    musicVolume,
    interfaceVolume,
    effectsVolume,
    isMuted,
    setMusicVolume,
    setInterfaceVolume,
    setEffectsVolume,
    toggleMute,
    setMuted,
  };
}

export function useModalSound() {
  const playInterfaceSound = useAudioStore((state) => state.playInterfaceSound);

  useEffect(() => {
    playInterfaceSound(AUDIO_ASSETS.sfx.ui.modalOpen);

    return () => {
      playInterfaceSound(AUDIO_ASSETS.sfx.ui.modalClose);
    };
  }, [playInterfaceSound]);
}

const SPELL_SOUND_MAP: Record<string, string> = {
  // Mage spells
  Lightning: AUDIO_ASSETS.sfx.heroes.mage.cast,
  FireBall: AUDIO_ASSETS.sfx.heroes.mage.cast,
  Teleport: AUDIO_ASSETS.sfx.heroes.mage.cast,
  Heal: AUDIO_ASSETS.sfx.heroes.mage.cast,
  Laser: AUDIO_ASSETS.sfx.heroes.mage.cast,

  // Archer spells
  Arrow: AUDIO_ASSETS.sfx.heroes.archer.shot,
  AimingShot: AUDIO_ASSETS.sfx.heroes.archer.shot,
  HailOfArrows: AUDIO_ASSETS.sfx.heroes.archer.shot,
  Decoy: AUDIO_ASSETS.sfx.heroes.archer.shot,
  Cloud: AUDIO_ASSETS.sfx.heroes.archer.shot,
};

export function useSpellSounds(gameInstance?: string) {
  const playEffectsSound = useAudioStore((state) => state.playEffectsSound);

  useEffect(() => {
    const handleSpellCast = (x: number, y: number, spell: ISpell<any>) => {
      const soundPath =
        SPELL_SOUND_MAP[spell.name] ?? AUDIO_ASSETS.sfx.heroes.mage.cast;
      playEffectsSound(soundPath);
    };

    const eventName = gameInstance
      ? `cast-spell-${gameInstance}`
      : 'cast-spell';

    EventBus.on(eventName, handleSpellCast);

    return () => {
      EventBus.off(eventName, handleSpellCast);
    };
  }, [gameInstance, playEffectsSound]);
}
