import { Howl, Howler } from 'howler';
import type { MusicTrack, SoundEffect } from '../constants/audioAssets';

/**
 * AudioService - Simplified audio service for SFX and global settings
 * Music management is now handled by audioStore
 */
class AudioService {
  private soundEffects = new Map<string, Howl>();

  /**
   * Create a new Howl instance for background music
   * Used by audioStore to create music players
   */
  createMusicHowl(src: MusicTrack): Howl {
    const howl = new Howl({
      src: [src],
      loop: true,
      preload: true,
      html5: true, // Use HTML5 Audio for streaming large files
      onplayerror: () => {
        // Try to unlock audio on next user interaction
        howl.once('unlock', () => {
          howl.play();
        });
      },
    });
    return howl;
  }

  /**
   * Initialize or get a sound effect
   */
  private getOrCreateSound(src: SoundEffect): Howl {
    if (!this.soundEffects.has(src)) {
      const howl = new Howl({
        src: [src],
        loop: false,
        preload: true,
      });
      this.soundEffects.set(src, howl);
    }
    return this.soundEffects.get(src)!;
  }

  /**
   * Play a sound effect
   */
  playSound(src: SoundEffect): void {
    const sound = this.getOrCreateSound(src);
    sound.play();
  }

  /**
   * Set master volume (0-100)
   */
  setMasterVolume(volume: number): void {
    const normalizedVolume = Math.max(0, Math.min(100, volume)) / 100;
    Howler.volume(normalizedVolume);
  }

  /**
   * Mute/unmute all audio
   */
  setMuted(muted: boolean): void {
    Howler.mute(muted);
  }

  /**
   * Cleanup sound effects resources
   */
  cleanupSoundEffects(): void {
    this.soundEffects.forEach((howl) => howl.unload());
    this.soundEffects.clear();
  }
}

// Export singleton instance
export const audioService = new AudioService();
