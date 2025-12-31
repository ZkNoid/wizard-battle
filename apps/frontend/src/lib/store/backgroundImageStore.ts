import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface BackgroundImageStore {
  backgroundImage: 'base' | 'win' | 'lose';
  setBackground: (backgroundImage: 'base' | 'win' | 'lose') => void;
}

export const useBackgroundImageStore = create<
  BackgroundImageStore,
  [['zustand/immer', never]]
>(
  immer((set, get) => ({
    backgroundImage: 'base',
    setBackground: (backgroundImage: 'base' | 'win' | 'lose') => {
      set((state) => {
        state.backgroundImage = backgroundImage;
      });
    },
  }))
);
