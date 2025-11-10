import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface MiscellaneousSessionStore {
  hasShownWelcomeScreen: boolean;
  setHasShownWelcomeScreen: (hasShownWelcomeScreen: boolean) => void;
}

export const useMiscellaneousSessionStore = create<
  MiscellaneousSessionStore,
  [['zustand/persist', never]]
>(
  persist(
    (set, get) => ({
      hasShownWelcomeScreen: false,
      setHasShownWelcomeScreen: (hasShownWelcomeScreen: boolean) => {
        set({ hasShownWelcomeScreen });
      },
    }),
    {
      name: '@zknoid/wizard-battle/miscellaneous-session-store',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
