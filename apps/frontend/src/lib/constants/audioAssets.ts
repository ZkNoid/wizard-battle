/**
 * Audio Assets Configuration
 * Centralized paths for all audio files in the game
 */

export const AUDIO_ASSETS = {
  music: {
    background: {
      fantasyVillage: '/audio/music/background/fantasy-village-woods.mp3',
      // Добавим позже другие треки
    },
    battle: {
      deathTaker: '/audio/music/battle/death-taker.mp3',
      // Добавим позже другие треки
    },
  },
  sfx: {
    ui: {
      hover: '/audio/sfx/ui/hover.mp3',
      click: '/audio/sfx/ui/click.mp3',
      open: '/audio/sfx/ui/open.mp3',
      close: '/audio/sfx/ui/close.mp3',
    },
    spells: {
      cast: {
        magic: '/audio/sfx/spells/cast/magic-spell-cast.mp3',
      },
      impact: {
        magic: '/audio/sfx/spells/impact/magic-spell-impact.mp3',
      },
    },
    archer: {
      shot: {
        arrow: '/audio/sfx/archer/shot/arrow-shot.mp3',
      },
      impact: {
        arrow: '/audio/sfx/archer/impact/arrow-impact.mp3',
      },
    },
  },
} as const;

export type MusicTrack = string;
export type SoundEffect = string;
