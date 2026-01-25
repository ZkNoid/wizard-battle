/**
 * Audio Assets Configuration
 * Centralized paths for all audio files in the game
 */

export const AUDIO_ASSETS = {
  music: {
    background: {
      fantasyVillage: '/audio/music/background/fantasy-village-woods.mp3',
    },
    battle: {
      deathTaker: '/audio/music/background/death-taker-battle-music-fanta.mp3',
    },
  },
  sfx: {
    ui: {
      hover: '/audio/sfx/ui/hover.mp3',
      click: '/audio/sfx/ui/click.mp3',
      modalOpen: '/audio/sfx/ui/modal-open.mp3',
      modalClose: '/audio/sfx/ui/modal-close.mp3',
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
