import { Howl, Howler } from 'howler';
import type { MusicTrack, SoundEffect } from '../constants/audioAssets';

/**
 * AudioService - Manages SFX playback with per-category volume control.
 * Music is managed by audioStore (Howl instances owned by the store).
 *
 * Categories:
 *  - interface: UI sounds (hover, click, modal open/close)
 *  - effects:   Battle spell/impact sounds
 */
class AudioService {
  private interfaceSounds = new Map<string, Howl>();
  private effectsSounds = new Map<string, Howl>();

  private interfaceVolume = 0.7;
  private effectsVolume = 0.8;
  private musicVolume = 0.5;

  // ─── Music ───────────────────────────────────────────────────────────────

  createMusicHowl(src: MusicTrack): Howl {
    return new Howl({
      src: [src],
      loop: true,
      preload: true,
      html5: true,
      onplayerror: () => {
        console.error('🎵 Play error for:', src);
      },
      onend: () => {
        console.log('🎵 Music ended (should loop):', src);
      },
      onstop: () => {
        console.log('🎵 Music stopped:', src);
      },
      onpause: () => {
        console.log('🎵 Music paused:', src);
      },
    });
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(100, volume)) / 100;
  }

  // ─── Interface sounds ────────────────────────────────────────────────────

  setInterfaceVolume(volume: number): void {
    this.interfaceVolume = Math.max(0, Math.min(100, volume)) / 100;
    // Update all cached interface sound Howls
    this.interfaceSounds.forEach((howl) => howl.volume(this.interfaceVolume));
  }

  playInterfaceSound(src: SoundEffect): void {
    const howl = this.getOrCreateInterfaceSound(src);
    howl.volume(this.interfaceVolume);
    howl.play();
  }

  private getOrCreateInterfaceSound(src: SoundEffect): Howl {
    if (!this.interfaceSounds.has(src)) {
      const howl = new Howl({ src: [src], loop: false, preload: true });
      this.interfaceSounds.set(src, howl);
    }
    return this.interfaceSounds.get(src)!;
  }

  // ─── Effects sounds ──────────────────────────────────────────────────────

  setEffectsVolume(volume: number): void {
    this.effectsVolume = Math.max(0, Math.min(100, volume)) / 100;
    // Update all cached effects sound Howls
    this.effectsSounds.forEach((howl) => howl.volume(this.effectsVolume));
  }

  playEffectsSound(src: SoundEffect): void {
    const howl = this.getOrCreateEffectsSound(src);
    howl.volume(this.effectsVolume);
    howl.play();
  }

  private getOrCreateEffectsSound(src: SoundEffect): Howl {
    if (!this.effectsSounds.has(src)) {
      const howl = new Howl({ src: [src], loop: false, preload: true });
      this.effectsSounds.set(src, howl);
    }
    return this.effectsSounds.get(src)!;
  }

  // ─── Global ──────────────────────────────────────────────────────────────

  setMuted(muted: boolean): void {
    Howler.mute(muted);
  }

  cleanupSoundEffects(): void {
    this.interfaceSounds.forEach((howl) => howl.unload());
    this.interfaceSounds.clear();
    this.effectsSounds.forEach((howl) => howl.unload());
    this.effectsSounds.clear();
  }
}

export const audioService = new AudioService();
