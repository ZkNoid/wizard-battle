import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type SlotNumber = '1' | '2' | '3' | '4';

interface TilemapSlot {
  tilemap: number[];
  lastModified: number;
}

interface TilemapStore {
  slots: Record<SlotNumber, TilemapSlot | null>;

  getTilemap: (slot: SlotNumber) => number[] | null;
  saveTilemap: (slot: SlotNumber, tilemap: number[]) => void;
  removeTilemap: (slot: SlotNumber) => void;
  clearAllTilemaps: () => void;
  hasTilemap: (slot: SlotNumber) => boolean;
  getLastModified: (slot: SlotNumber) => number | null;
}

const defaultTilemap = Array(64).fill(0); // empty tilemap

export const useTilemapStore = create<TilemapStore>()(
  persist(
    (set, get) => ({
      slots: {
        '1': null,
        '2': null,
        '3': null,
        '4': null,
      },

      getTilemap: (slot: SlotNumber) => {
        const slotData = get().slots[slot];
        return slotData ? slotData.tilemap : null;
      },

      saveTilemap: (slot: SlotNumber, tilemap: number[]) => {
        set((state) => ({
          slots: {
            ...state.slots,
            [slot]: {
              tilemap: [...tilemap],
              lastModified: Date.now(),
            },
          },
        }));
      },

      removeTilemap: (slot: SlotNumber) => {
        set((state) => ({
          slots: {
            ...state.slots,
            [slot]: null,
          },
        }));
      },

      clearAllTilemaps: () => {
        set({
          slots: {
            '1': null,
            '2': null,
            '3': null,
            '4': null,
          },
        });
      },

      hasTilemap: (slot: SlotNumber) => {
        const slotData = get().slots[slot];
        return slotData !== null && slotData.tilemap.length > 0;
      },

      getLastModified: (slot: SlotNumber) => {
        const slotData = get().slots[slot];
        return slotData ? slotData.lastModified : null;
      },
    }),
    {
      name: '@Zknoid/wizard-battle-tilemaps',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
