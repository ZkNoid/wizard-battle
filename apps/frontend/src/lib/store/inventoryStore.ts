import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  IInventoryItem,
  IInventoryArmorItem,
  InventoryItemWearableArmorSlot,
} from '@/lib/types/Inventory';
import type { IHeroStats } from '@/lib/types/IHeroStat';
import { ALL_ITEMS } from '@/lib/constants/items';
import { defaultHeroStats } from '@/lib/constants/stat';

export type EquippedSlots = Record<
  InventoryItemWearableArmorSlot,
  IInventoryItem | null
>;

const defaultEquippedSlots: EquippedSlots = {
  gem: null,
  ring: null,
  necklace: null,
  arms: null,
  legs: null,
  belt: null,
};

// Helper function to calculate stats from equipped items
const calculateStats = (equippedSlots: EquippedSlots): IHeroStats => {
  const stats: IHeroStats = { ...defaultHeroStats };

  Object.values(equippedSlots).forEach((item) => {
    if (item && item.type === 'armor') {
      const wearableItem = item as IInventoryArmorItem;
      wearableItem.buff.forEach((buff) => {
        const statKey = buff.effect as keyof IHeroStats;
        if (statKey in stats) {
          stats[statKey] += buff.value;
        }
      });
    }
  });

  return stats;
};

interface InventoryStore {
  // Equipped items per wizard (wizard ID as string key, e.g. Field.toString())
  equippedItemsByWizard: Record<string, EquippedSlots>;

  // Stats per wizard (calculated from equipped items)
  statsByWizard: Record<string, IHeroStats>;

  // User's inventory items (not equipped)
  inventoryItems: (IInventoryItem | IInventoryArmorItem)[];

  // Actions
  getEquippedItems: (wizardId: string) => EquippedSlots;
  getStats: (wizardId: string) => IHeroStats;
  equipItem: (
    wizardId: string,
    slotId: InventoryItemWearableArmorSlot,
    item: IInventoryItem
  ) => void;
  unequipItem: (
    wizardId: string,
    slotId: InventoryItemWearableArmorSlot
  ) => void;
  setInventoryItems: (items: (IInventoryItem | IInventoryArmorItem)[]) => void;
  addToInventory: (item: IInventoryItem | IInventoryArmorItem) => void;
  removeFromInventory: (itemId: string) => void;
}

export const useInventoryStore = create<InventoryStore>()(
  persist(
    (set, get) => ({
      equippedItemsByWizard: {},
      statsByWizard: {},
      inventoryItems: [...ALL_ITEMS],

      getEquippedItems: (wizardId: string): EquippedSlots => {
        const state = get();
        return (
          state.equippedItemsByWizard[wizardId] ?? {
            ...defaultEquippedSlots,
          }
        );
      },

      getStats: (wizardId: string): IHeroStats => {
        const state = get();
        return state.statsByWizard[wizardId] ?? { ...defaultHeroStats };
      },

      equipItem: (
        wizardId: string,
        slotId: InventoryItemWearableArmorSlot,
        item: IInventoryItem
      ) =>
        set((state) => {
          // Get current equipped items for this wizard
          const currentEquipped = state.equippedItemsByWizard[wizardId] ?? {
            ...defaultEquippedSlots,
          };
          const previousItem = currentEquipped[slotId];

          // Check if item is already equipped in another slot for this wizard
          const updatedEquipped = { ...currentEquipped };
          Object.keys(updatedEquipped).forEach((key) => {
            const slot = key as InventoryItemWearableArmorSlot;
            if (updatedEquipped[slot]?.id === item.id) {
              updatedEquipped[slot] = null;
            }
          });

          // Equip the new item
          updatedEquipped[slotId] = item;

          // Recalculate stats for this wizard
          const newStats = calculateStats(updatedEquipped);

          // Update inventory: remove the equipped item, add back the previously equipped item if any
          let newInventory = state.inventoryItems.filter(
            (i) => i.id !== item.id
          );
          if (previousItem) {
            newInventory = [...newInventory, previousItem];
          }

          return {
            equippedItemsByWizard: {
              ...state.equippedItemsByWizard,
              [wizardId]: updatedEquipped,
            },
            statsByWizard: {
              ...state.statsByWizard,
              [wizardId]: newStats,
            },
            inventoryItems: newInventory,
          };
        }),

      unequipItem: (wizardId: string, slotId: InventoryItemWearableArmorSlot) =>
        set((state) => {
          const currentEquipped = state.equippedItemsByWizard[wizardId] ?? {
            ...defaultEquippedSlots,
          };
          const item = currentEquipped[slotId];

          if (!item) return state;

          // Remove item from slot
          const updatedEquipped = { ...currentEquipped };
          updatedEquipped[slotId] = null;

          // Recalculate stats for this wizard
          const newStats = calculateStats(updatedEquipped);

          // Add item back to inventory
          return {
            equippedItemsByWizard: {
              ...state.equippedItemsByWizard,
              [wizardId]: updatedEquipped,
            },
            statsByWizard: {
              ...state.statsByWizard,
              [wizardId]: newStats,
            },
            inventoryItems: [...state.inventoryItems, item],
          };
        }),

      setInventoryItems: (items: (IInventoryItem | IInventoryArmorItem)[]) =>
        set({ inventoryItems: items }),

      addToInventory: (item: IInventoryItem | IInventoryArmorItem) =>
        set((state) => ({
          inventoryItems: [...state.inventoryItems, item],
        })),

      removeFromInventory: (itemId: string) =>
        set((state) => ({
          inventoryItems: state.inventoryItems.filter((i) => i.id !== itemId),
        })),
    }),
    {
      name: 'wizard-battle-inventory',
      partialize: (state) => ({
        equippedItemsByWizard: state.equippedItemsByWizard,
        statsByWizard: state.statsByWizard,
        inventoryItems: state.inventoryItems,
      }),
    }
  )
);
