import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface MiscellaneousSessionStore {
  hasShownWelcomeScreen: boolean;
  setHasShownWelcomeScreen: (hasShownWelcomeScreen: boolean) => void;
  isInventoryModalOpen: boolean;
  setIsInventoryModalOpen: (isInventoryModalOpen: boolean) => void;
  isCraftModalOpen: boolean;
  setIsCraftModalOpen: (isCraftModalOpen: boolean) => void;
  isExpeditionModalOpen: boolean;
  setIsExpeditionModalOpen: (isExpeditionModalOpen: boolean) => void;
  isTestnetModalOpen: boolean;
  setIsTestnetModalOpen: (isTestnetModalOpen: boolean) => void;
  isQuickGuideModalOpen: boolean;
  setIsQuickGuideModalOpen: (isQuickGuideModalOpen: boolean) => void;
  isSoundSettingsModalOpen: boolean;
  setIsSoundSettingsModalOpen: (isSoundSettingsModalOpen: boolean) => void;
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
      isInventoryModalOpen: false,
      setIsInventoryModalOpen: (isInventoryModalOpen: boolean) => {
        set({ isInventoryModalOpen });
      },
      isCraftModalOpen: false,
      setIsCraftModalOpen: (isCraftModalOpen: boolean) => {
        set({ isCraftModalOpen });
      },
      isExpeditionModalOpen: false,
      setIsExpeditionModalOpen: (isExpeditionModalOpen: boolean) => {
        set({ isExpeditionModalOpen });
      },
      isTestnetModalOpen: false,
      setIsTestnetModalOpen: (isTestnetModalOpen: boolean) => {
        set({ isTestnetModalOpen });
      },
      isQuickGuideModalOpen: false,
      setIsQuickGuideModalOpen: (isQuickGuideModalOpen: boolean) => {
        set({ isQuickGuideModalOpen });
      },
      isSoundSettingsModalOpen: false,
      setIsSoundSettingsModalOpen: (isSoundSettingsModalOpen: boolean) => {
        set({ isSoundSettingsModalOpen });
      },
    }),
    {
      name: '@zknoid/wizard-battle/miscellaneous-session-store',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
