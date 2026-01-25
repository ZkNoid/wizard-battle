import { Howl, Howler } from 'howler';
import type { MusicTrack, SoundEffect } from '../constants/audioAssets';

/**
 * AudioService - Centralized audio management using Howler.js
 * Handles background music and sound effects
 */
class AudioService {
  private musicTracks: Map<string, Howl> = new Map();
  private soundEffects: Map<string, Howl> = new Map();
  private currentMusic: Howl | null = null;
  private currentMusicKey: string | null = null;

  /**
   * Initialize or get a music track
   */
  private getOrCreateMusic(src: MusicTrack): Howl {
    if (!this.musicTracks.has(src)) {
      const howl = new Howl({
        src: [src],
        loop: true,
        preload: true,
        html5: true, // Use HTML5 Audio for streaming large files
        onplayerror: (id, error) => {
          console.error('Audio play error:', error);
          // Try to unlock audio on next user interaction
          howl.once('unlock', () => {
            howl.play();
          });
        },
      });
      this.musicTracks.set(src, howl);
    }
    return this.musicTracks.get(src)!;
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
   * Play background music with optional fade
   */
  playMusic(src: MusicTrack, fadeDuration: number = 500): void {
    const newMusic = this.getOrCreateMusic(src);

    // If the same music is already playing, do nothing
    if (this.currentMusicKey === src && this.currentMusic?.playing()) {
      return;
    }

    // Fade out current music if playing
    if (this.currentMusic && this.currentMusic.playing()) {
      this.currentMusic.fade(this.currentMusic.volume(), 0, fadeDuration);
      this.currentMusic.once('fade', () => {
        this.currentMusic?.stop();
      });
    }

    // Fade in new music
    newMusic.volume(0);
    newMusic.play();
    newMusic.fade(0, 1, fadeDuration);

    this.currentMusic = newMusic;
    this.currentMusicKey = src;
  }

  /**
   * Stop current background music
   */
  stopMusic(fadeDuration: number = 500): void {
    if (this.currentMusic && this.currentMusic.playing()) {
      this.currentMusic.fade(this.currentMusic.volume(), 0, fadeDuration);
      this.currentMusic.once('fade', () => {
        this.currentMusic?.stop();
      });
      this.currentMusic = null;
      this.currentMusicKey = null;
    }
  }

  /**
   * Pause current background music
   */
  pauseMusic(): void {
    if (this.currentMusic) {
      this.currentMusic.pause();
    }
  }

  /**
   * Resume paused music
   */
  resumeMusic(): void {
    if (this.currentMusic) {
      this.currentMusic.play();
    }
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
   * Get current music volume
   */
  getMusicVolume(): number {
    return this.currentMusic?.volume() ?? 1;
  }

  /**
   * Cleanup all audio resources
   */
  cleanup(): void {
    this.musicTracks.forEach((howl) => howl.unload());
    this.soundEffects.forEach((howl) => howl.unload());
    this.musicTracks.clear();
    this.soundEffects.clear();
    this.currentMusic = null;
    this.currentMusicKey = null;
  }
}

// Export singleton instance
export const audioService = new AudioService();
