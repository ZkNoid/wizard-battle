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
      deathTaker: '/audio/music/battle/death-taker.mp3',
    },
  },
  sfx: {
    // UI звуки
    ui: {
      hover: '/audio/sfx/ui/hover.mp3',
      click: '/audio/sfx/ui/click.mp3',
      modalOpen: '/audio/sfx/ui/modal-open.mp3',
      modalClose: '/audio/sfx/ui/modal-close.mp3',
    },

    // Звуки героев
    heroes: {
      // Mage - базовые звуки каста и попадания
      mage: {
        cast: '/audio/sfx/mage/cast.mp3',
        impact: '/audio/sfx/mage/impact.mp3',
      },

      // Archer - выстрел и попадание стрелы
      archer: {
        shot: '/audio/sfx/archer/arrow-shot.mp3',
        impact: '/audio/sfx/archer/arrow-impact.mp3',
      },

      // Phantom Duelist - пока пусто, для будущего расширения
      phantomDuelist: {},
    },
  },
} as const;

export type MusicTrack = string;
export type SoundEffect = string;
