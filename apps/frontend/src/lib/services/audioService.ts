import { Howl, Howler } from 'howler';
import type { MusicTrack, SoundEffect } from '../constants/audioAssets';

/**
 * AudioService - Centralized audio management using Howler.js
 * Handles background music and sound effects
 */
class AudioService {
  private musicTracks = new Map<string, Howl>();
  private soundEffects = new Map<string, Howl>();
  private currentMusic: Howl | null = null;
  private currentMusicKey: string | null = null;
  private isMusicMuted = false;
  private isFading = false; // Track if music is currently fading

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
        onplayerror: () => {
          // Try to unlock audio on next user interaction
          howl.once('unlock', () => {
            howl.play();
          });
        },
      });
      // Apply current music mute state to new track (only if muted)
      if (this.isMusicMuted) {
        howl.mute(true);
      }
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
  playMusic(src: MusicTrack, fadeDuration = 500): void {
    const newMusic = this.getOrCreateMusic(src);

    // If the same music is already playing or transitioning, do nothing
    if (this.currentMusicKey === src) {
      // Check if it's playing or if it's the same track that's fading
      if (this.currentMusic?.playing() || this.isFading) {
        console.log('🎵 Music already playing or fading, skipping duplicate play');
        return;
      }
    }

    // Set fading flag to prevent duplicate calls during transition
    this.isFading = true;

    // Fade out current music if playing
    if (this.currentMusic && this.currentMusic.playing()) {
      const oldMusic = this.currentMusic;
      oldMusic.fade(oldMusic.volume(), 0, fadeDuration);
      oldMusic.once('fade', () => {
        oldMusic.stop();
      });
    }

    // Fade in new music
    newMusic.volume(0);
    newMusic.play();
    newMusic.fade(0, 1, fadeDuration);
    
    // Clear fading flag after fade completes
    newMusic.once('fade', () => {
      this.isFading = false;
    });

    this.currentMusic = newMusic;
    this.currentMusicKey = src;
  }

  /**
   * Stop current background music
   */
  stopMusic(fadeDuration = 500): void {
    if (this.currentMusic) {
      if (this.currentMusic.playing()) {
        const musicToStop = this.currentMusic;
        this.isFading = true;
        
        musicToStop.fade(musicToStop.volume(), 0, fadeDuration);
        musicToStop.once('fade', () => {
          musicToStop.stop();
          this.isFading = false;
        });
      } else {
        // Music exists but not playing - just stop it
        this.currentMusic.stop();
      }
      
      this.currentMusic = null;
      this.currentMusicKey = null;
      this.isFading = false;
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
   * Mute/unmute only background music
   */
  setMusicMuted(muted: boolean): void {
    this.isMusicMuted = muted;
    if (this.currentMusic) {
      this.currentMusic.mute(muted);
    }
    // Also mute all music tracks in cache
    this.musicTracks.forEach((howl) => howl.mute(muted));
  }

  /**
   * Get current music volume
   */
  getMusicVolume(): number {
    return this.currentMusic?.volume() ?? 1;
  }

  /**
   * Get current music track key
   */
  getCurrentMusicKey(): string | null {
    return this.currentMusicKey;
  }

  /**
   * Check if music is currently fading
   */
  isMusicFading(): boolean {
    return this.isFading;
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
    this.isFading = false;
  }
}

// Export singleton instance
export const audioService = new AudioService();
