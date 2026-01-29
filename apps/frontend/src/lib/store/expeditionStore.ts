import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  IExpedition,
  ILocation,
  ExpeditionTimePeriod,
} from '@wizard-battle/common';
import { trpcClient } from '@/trpc/vanilla';

interface ExpeditionStore {
  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;

  // Data
  expeditions: IExpedition[];
  locations: ILocation[];

  // Actions - address comes from useMinaAppkit hook in components
  loadUserExpeditions: (address: string) => Promise<void>;
  loadLocations: () => Promise<void>;
  createExpedition: (
    address: string,
    input: {
      characterId: string;
      characterRole: string;
      characterImage: string;
      locationId: string;
      timePeriod: ExpeditionTimePeriod;
    }
  ) => Promise<IExpedition | null>;
  completeExpedition: (address: string, expeditionId: string) => Promise<IExpedition | null>;
  interruptExpedition: (address: string, expeditionId: string) => Promise<IExpedition | null>;
  clearExpeditions: () => void;

  // Selectors
  getActiveExpeditions: () => IExpedition[];
  getCompletedExpeditions: () => IExpedition[];
  getPendingExpeditions: () => IExpedition[];
  getExpeditionById: (id: string) => IExpedition | undefined;
}

export const useExpeditionStore = create<ExpeditionStore>()(
  persist(
    (set, get) => ({
      isLoading: false,
      isCreating: false,
      error: null,
      expeditions: [],
      locations: [],

      loadUserExpeditions: async (address: string) => {
        set({ isLoading: true, error: null });

        try {
          const expeditions = await trpcClient.expeditions.getUserExpeditions.query({
            userId: address,
          });

          set({
            expeditions,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load expeditions',
            isLoading: false,
          });
        }
      },

      loadLocations: async () => {
        try {
          const locations = await trpcClient.expeditions.getLocations.query();
          set({ locations });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load locations',
          });
        }
      },

      createExpedition: async (address, input) => {
        if (!address) {
          console.log('Wallet not connected');
          set({ error: 'Wallet not connected' });
          return null;
        }

        set({ isCreating: true, error: null });

        try {
          const newExpedition = await trpcClient.expeditions.createExpedition.mutate({
            userId: address,
            ...input,
          });

          set((state) => ({
            expeditions: [newExpedition, ...state.expeditions],
            isCreating: false,
          }));

          return newExpedition;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create expedition',
            isCreating: false,
          });
          return null;
        }
      },

      completeExpedition: async (address: string, expeditionId: string) => {
        if (!address) {
          set({ error: 'Wallet not connected' });
          return null;
        }

        try {
          const completedExpedition = await trpcClient.expeditions.completeExpedition.mutate({
            id: expeditionId,
            userId: address,
          });

          set((state) => ({
            expeditions: state.expeditions.map((exp) =>
              exp.id === expeditionId ? completedExpedition : exp
            ),
          }));

          return completedExpedition;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to complete expedition',
          });
          return null;
        }
      },

      interruptExpedition: async (address: string, expeditionId: string) => {
        if (!address) {
          set({ error: 'Wallet not connected' });
          return null;
        }

        try {
          const interruptedExpedition = await trpcClient.expeditions.interruptExpedition.mutate({
            id: expeditionId,
            userId: address,
          });

          set((state) => ({
            expeditions: state.expeditions.map((exp) =>
              exp.id === expeditionId ? interruptedExpedition : exp
            ),
          }));

          return interruptedExpedition;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to interrupt expedition',
          });
          return null;
        }
      },

      clearExpeditions: () =>
        set({
          expeditions: [],
        }),

      // Selectors
      getActiveExpeditions: () => {
        return get().expeditions.filter((exp) => exp.status === 'active');
      },

      getCompletedExpeditions: () => {
        return get().expeditions.filter((exp) => exp.status === 'completed');
      },

      getPendingExpeditions: () => {
        return get().expeditions.filter((exp) => exp.status === 'pending');
      },

      getExpeditionById: (id: string) => {
        return get().expeditions.find((exp) => exp.id === id);
      },
    }),
    {
      name: 'wizard-battle-expeditions',
      partialize: (state) => ({
        expeditions: state.expeditions,
        locations: state.locations,
      }),
    }
  )
);

