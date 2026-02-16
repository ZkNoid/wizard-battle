import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { IUser } from '@/lib/types/IUser';

interface UserDataStore {
  // User data from database
  userData: IUser | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUserData: (user: IUser | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearUserData: () => void;

  // Computed getters
  getXp: () => number;
  getArcherXp: () => number;
  getDuelistXp: () => number;
  getMageXp: () => number;
  getName: () => string | undefined;
  getAddress: () => string | undefined;
}

export const useUserDataStore = create<UserDataStore>()(
  persist(
    (set, get) => ({
      userData: null,
      isLoading: false,
      error: null,

      setUserData: (user: IUser | null) => set({ userData: user, error: null }),
      setLoading: (isLoading: boolean) => set({ isLoading }),
      setError: (error: string | null) => set({ error }),
      clearUserData: () => set({ userData: null, error: null }),

      // Computed getters
      getXp: () => get().userData?.xp ?? 0,
      getArcherXp: () => get().userData?.archer_xp ?? 0,
      getDuelistXp: () => get().userData?.duelist_xp ?? 0,
      getMageXp: () => get().userData?.mage_xp ?? 0,
      getName: () => get().userData?.name,
      getAddress: () => get().userData?.address,
    }),
    {
      name: 'user-data-storage',
      partialize: (state) => ({
        userData: state.userData,
      }),
    }
  )
);

