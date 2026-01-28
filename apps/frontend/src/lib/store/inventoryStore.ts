import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  IInventoryArmorItem,
  InventoryItemWearableArmorSlot,
  IUserInventoryItem,
  AnyInventoryItem,
} from '@/lib/types/Inventory';
import type { IHeroStats } from '@/lib/types/IHeroStat';
import { defaultHeroStats } from '@/lib/constants/stat';
import { trpcClient } from '@/trpc/vanilla';

export type EquippedSlots = Record<
  InventoryItemWearableArmorSlot,
  IUserInventoryItem | null
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

  Object.values(equippedSlots).forEach((userItem) => {
    if (userItem && userItem.item.type === 'armor') {
      const armorItem = userItem.item as IInventoryArmorItem;
      armorItem.buff.forEach((buff) => {
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
  // Current user ID
  userId: string | null;

  // Loading state
  isLoading: boolean;
  error: string | null;

  // Equipped items per wizard (wizard ID as string key)
  equippedItemsByWizard: Record<string, EquippedSlots>;

  // Stats per wizard (calculated from equipped items)
  statsByWizard: Record<string, IHeroStats>;

  // User's inventory items (from database)
  inventoryItems: IUserInventoryItem[];

  // Actions
  setUserId: (userId: string | null) => void;
  loadUserInventory: (userId: string) => Promise<void>;
  getEquippedItems: (wizardId: string) => EquippedSlots;
  getStats: (wizardId: string) => IHeroStats;
  equipItem: (
    wizardId: string,
    slotId: InventoryItemWearableArmorSlot,
    userItem: IUserInventoryItem
  ) => void;
  unequipItem: (
    wizardId: string,
    slotId: InventoryItemWearableArmorSlot
  ) => void;
  setInventoryItems: (items: IUserInventoryItem[]) => void;
  addToInventory: (item: IUserInventoryItem) => void;
  removeFromInventory: (itemId: string) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  clearInventory: () => void;
}

export const useInventoryStore = create<InventoryStore>()(
  persist(
    (set, get) => ({
      userId: null,
      isLoading: false,
      error: null,
      equippedItemsByWizard: {},
      statsByWizard: {},
      inventoryItems: [],

      setUserId: (userId: string | null) => set({ userId }),

      loadUserInventory: async (userId: string) => {
        set({ isLoading: true, error: null, userId });

        try {
          // Fetch user's inventory from database
          const inventory = await trpcClient.items.getUserInventory.query({
            userId,
          });

          // Separate equipped and non-equipped items
          const equippedByWizard: Record<string, EquippedSlots> = {};
          const nonEquippedItems: IUserInventoryItem[] = [];

          inventory.forEach((userItem) => {
            if (userItem.isEquipped && userItem.equippedToWizardId) {
              const wizardId = userItem.equippedToWizardId;
              if (!equippedByWizard[wizardId]) {
                equippedByWizard[wizardId] = { ...defaultEquippedSlots };
              }

              // Get the slot from the item
              if (userItem.item.type === 'armor') {
                const armorItem = userItem.item as IInventoryArmorItem;
                equippedByWizard[wizardId][armorItem.wearableSlot] = userItem;
              }
            } else {
              nonEquippedItems.push(userItem);
            }
          });

          // Calculate stats for each wizard
          const statsByWizard: Record<string, IHeroStats> = {};
          Object.entries(equippedByWizard).forEach(([wizardId, slots]) => {
            statsByWizard[wizardId] = calculateStats(slots);
          });

          set({
            inventoryItems: nonEquippedItems,
            equippedItemsByWizard: equippedByWizard,
            statsByWizard,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load inventory',
            isLoading: false,
          });
        }
      },

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
        userItem: IUserInventoryItem
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
            if (updatedEquipped[slot]?.item.id === userItem.item.id) {
              updatedEquipped[slot] = null;
            }
          });

          // Equip the new item with updated metadata
          const equippedItem: IUserInventoryItem = {
            ...userItem,
            isEquipped: true,
            equippedToWizardId: wizardId,
          };
          updatedEquipped[slotId] = equippedItem;

          // Recalculate stats for this wizard
          const newStats = calculateStats(updatedEquipped);

          // Update inventory: remove the equipped item, add back the previously equipped item if any
          let newInventory = state.inventoryItems.filter(
            (i) => i.item.id !== userItem.item.id
          );
          if (previousItem) {
            const unequippedItem: IUserInventoryItem = {
              ...previousItem,
              isEquipped: false,
              equippedToWizardId: undefined,
            };
            newInventory = [...newInventory, unequippedItem];
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
          const userItem = currentEquipped[slotId];

          if (!userItem) return state;

          // Remove item from slot
          const updatedEquipped = { ...currentEquipped };
          updatedEquipped[slotId] = null;

          // Recalculate stats for this wizard
          const newStats = calculateStats(updatedEquipped);

          // Add item back to inventory
          const unequippedItem: IUserInventoryItem = {
            ...userItem,
            isEquipped: false,
            equippedToWizardId: undefined,
          };

          return {
            equippedItemsByWizard: {
              ...state.equippedItemsByWizard,
              [wizardId]: updatedEquipped,
            },
            statsByWizard: {
              ...state.statsByWizard,
              [wizardId]: newStats,
            },
            inventoryItems: [...state.inventoryItems, unequippedItem],
          };
        }),

      setInventoryItems: (items: IUserInventoryItem[]) =>
        set({ inventoryItems: items }),

      addToInventory: (item: IUserInventoryItem) =>
        set((state) => {
          // Check if item already exists, if so increase quantity
          const existingIndex = state.inventoryItems.findIndex(
            (i) => i.item.id === item.item.id
          );

          if (existingIndex >= 0) {
            const updatedItems = [...state.inventoryItems];
            updatedItems[existingIndex] = {
              ...updatedItems[existingIndex]!,
              quantity: updatedItems[existingIndex]!.quantity + item.quantity,
            };
            return { inventoryItems: updatedItems };
          }

          return { inventoryItems: [...state.inventoryItems, item] };
        }),

      removeFromInventory: (itemId: string) =>
        set((state) => ({
          inventoryItems: state.inventoryItems.filter(
            (i) => i.item.id !== itemId
          ),
        })),

      updateItemQuantity: (itemId: string, quantity: number) =>
        set((state) => {
          if (quantity <= 0) {
            return {
              inventoryItems: state.inventoryItems.filter(
                (i) => i.item.id !== itemId
              ),
            };
          }

          return {
            inventoryItems: state.inventoryItems.map((i) =>
              i.item.id === itemId ? { ...i, quantity } : i
            ),
          };
        }),

      clearInventory: () =>
        set({
          inventoryItems: [],
          equippedItemsByWizard: {},
          statsByWizard: {},
        }),
    }),
    {
      name: 'wizard-battle-inventory',
      partialize: (state) => ({
        userId: state.userId,
        equippedItemsByWizard: state.equippedItemsByWizard,
        statsByWizard: state.statsByWizard,
        inventoryItems: state.inventoryItems,
      }),
    }
  )
);
