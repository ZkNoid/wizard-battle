import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  IInventoryArmorItem,
  InventoryItemWearableArmorSlot,
  IUserInventoryItem,
  AnyInventoryItem,
} from '@/lib/types/Inventory';
import type { IHeroStats } from '@/lib/types/IHeroStat';
import { trpcClient } from '@/trpc/vanilla';
import { allWizards } from '../../../../common/wizards';
import { defaultHeroStats } from '@/lib/constants/stat';

export type EquippedSlots = Record<
  InventoryItemWearableArmorSlot,
  IUserInventoryItem | null
>;

const defaultEquippedSlots: EquippedSlots = {
  Orb: null,
  Belt: null,
  Ring: null,
  Amulet: null,
  Boots: null,
  Gloves: null,
};

// Helper function to get default stats for a wizard based on their type
const getWizardDefaultStats = (wizardId: string): IHeroStats => {
  const wizard = allWizards.find((w) => w.id.toString() === wizardId);

  if (!wizard) {
    return { ...defaultHeroStats };
  }

  const state = wizard.defaultState();
  const playerStats = state.playerStats;

  return {
    hp: Number(playerStats.maxHp.toBigint()),
    atk: Number(playerStats.attack.toBigInt()),
    def: Number(playerStats.defense.toBigInt()),
    crit: Number(playerStats.critChance.toBigInt()),
    dodge: Number(playerStats.dodgeChance.toBigInt()),
    accuracy: Number(playerStats.accuracy.toBigInt()),
  };
};

// Mapping from buff keys to IHeroStats keys
const buffToStatKeyMap: Record<string, keyof IHeroStats> = {
  critChance: 'crit',
  Accuracy: 'accuracy',
  Attack: 'atk',
  Dodge: 'dodge',
  Defence: 'def',
  // Movement has no direct mapping in IHeroStats
};

// Helper function to calculate stats from equipped items
const calculateStats = (
  equippedSlots: EquippedSlots,
  wizardId: string
): IHeroStats => {
  const stats: IHeroStats = getWizardDefaultStats(wizardId);

  Object.values(equippedSlots).forEach((userItem) => {
    if (userItem && userItem.item.type === 'armor') {
      const armorItem = userItem.item as IInventoryArmorItem;
      if (armorItem.buff) {
        Object.entries(armorItem.buff).forEach(([buffKey, buffValue]) => {
          const statKey = buffToStatKeyMap[buffKey];
          if (statKey && statKey in stats && buffValue) {
            stats[statKey] += Number(buffValue);
          }
        });
      }
    }
  });

  return stats;
};

interface InventoryStore {
  // Loading state
  isLoading: boolean;
  error: string | null;

  // Currency balances
  gold: number;
  blackOrb: number;

  // Equipped items per wizard (wizard ID as string key)
  equippedItemsByWizard: Record<string, EquippedSlots>;

  // Stats per wizard (calculated from equipped items)
  statsByWizard: Record<string, IHeroStats>;

  // User's inventory items (from database)
  iteminventory: IUserInventoryItem[];

  // Actions - address comes from useMinaAppkit hook in components
  loadUserInventory: (address: string) => Promise<void>;
  loadCurrencies: (address: string) => Promise<void>;
  getEquippedItems: (wizardId: string) => EquippedSlots;
  getStats: (wizardId: string) => IHeroStats;
  equipItem: (
    userId: string,
    wizardId: string,
    slotId: InventoryItemWearableArmorSlot,
    userItem: IUserInventoryItem
  ) => Promise<void>;
  unequipItem: (
    userId: string,
    wizardId: string,
    slotId: InventoryItemWearableArmorSlot
  ) => Promise<void>;
  setiteminventory: (items: IUserInventoryItem[]) => void;
  addToInventory: (item: IUserInventoryItem) => void;
  removeFromInventory: (itemId: string) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  clearInventory: () => void;
}

export const useInventoryStore = create<InventoryStore>()(
  persist(
    (set, get) => ({
      isLoading: false,
      error: null,
      gold: 0,
      blackOrb: 0,
      equippedItemsByWizard: {},
      statsByWizard: {},
      iteminventory: [],

      loadCurrencies: async (address: string) => {
        try {
          const inventory = await trpcClient.items.getUserInventory.query({
            userId: address,
          });

          const goldItem = inventory.find((item) => item.item.id === 'Gold');
          const blackOrbItem = inventory.find(
            (item) => item.item.id === 'BlackOrb'
          );

          set({
            gold: goldItem?.quantity ?? 0,
            blackOrb: blackOrbItem?.quantity ?? 0,
          });
        } catch (error) {
          console.error('Failed to load currencies:', error);
        }
      },

      loadUserInventory: async (address: string) => {
        set({ isLoading: true, error: null });

        try {
          // Fetch user's inventory from database (using wallet address as userId)
          const inventory = await trpcClient.items.getUserInventory.query({
            userId: address,
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
            statsByWizard[wizardId] = calculateStats(slots, wizardId);
          });

          // Extract currency balances
          const goldItem = inventory.find((item) => item.item.id === 'Gold');
          const blackOrbItem = inventory.find(
            (item) => item.item.id === 'BlackOrb'
          );

          set({
            iteminventory: nonEquippedItems,
            equippedItemsByWizard: equippedByWizard,
            statsByWizard,
            gold: goldItem?.quantity ?? 0,
            blackOrb: blackOrbItem?.quantity ?? 0,
            isLoading: false,
          });
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to load inventory',
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
        return state.statsByWizard[wizardId] ?? getWizardDefaultStats(wizardId);
      },

      equipItem: async (
        userId: string,
        wizardId: string,
        slotId: InventoryItemWearableArmorSlot,
        userItem: IUserInventoryItem
      ) => {
        // Call tRPC to persist the equip action
        await trpcClient.items.equipItem.mutate({
          userId,
          itemId: userItem.item.id,
          wizardId,
        });

        // Update local state
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
          const newStats = calculateStats(updatedEquipped, wizardId);

          // Update inventory: remove the equipped item, add back the previously equipped item if any
          let newInventory = state.iteminventory.filter(
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
            iteminventory: newInventory,
          };
        });
      },

      unequipItem: async (
        userId: string,
        wizardId: string,
        slotId: InventoryItemWearableArmorSlot
      ) => {
        const state = get();
        const currentEquipped = state.equippedItemsByWizard[wizardId] ?? {
          ...defaultEquippedSlots,
        };
        const userItem = currentEquipped[slotId];

        if (!userItem) return;

        // Call tRPC to persist the unequip action
        await trpcClient.items.unequipItem.mutate({
          userId,
          itemId: userItem.item.id,
        });

        // Update local state
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
          const newStats = calculateStats(updatedEquipped, wizardId);

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
            iteminventory: [...state.iteminventory, unequippedItem],
          };
        });
      },

      setiteminventory: (items: IUserInventoryItem[]) =>
        set({ iteminventory: items }),

      addToInventory: (item: IUserInventoryItem) =>
        set((state) => {
          // Check if item already exists, if so increase quantity
          const existingIndex = state.iteminventory.findIndex(
            (i) => i.item.id === item.item.id
          );

          if (existingIndex >= 0) {
            const updatedItems = [...state.iteminventory];
            updatedItems[existingIndex] = {
              ...updatedItems[existingIndex]!,
              quantity: updatedItems[existingIndex]!.quantity + item.quantity,
            };
            return { iteminventory: updatedItems };
          }

          return { iteminventory: [...state.iteminventory, item] };
        }),

      removeFromInventory: (itemId: string) =>
        set((state) => ({
          iteminventory: state.iteminventory.filter(
            (i) => i.item.id !== itemId
          ),
        })),

      updateItemQuantity: (itemId: string, quantity: number) =>
        set((state) => {
          if (quantity <= 0) {
            return {
              iteminventory: state.iteminventory.filter(
                (i) => i.item.id !== itemId
              ),
            };
          }

          return {
            iteminventory: state.iteminventory.map((i) =>
              i.item.id === itemId ? { ...i, quantity } : i
            ),
          };
        }),

      clearInventory: () =>
        set({
          iteminventory: [],
          equippedItemsByWizard: {},
          statsByWizard: {},
          gold: 0,
          blackOrb: 0,
        }),
    }),
    {
      name: 'wizard-battle-inventory',
      partialize: (state) => ({
        equippedItemsByWizard: state.equippedItemsByWizard,
        statsByWizard: state.statsByWizard,
        iteminventory: state.iteminventory,
        gold: state.gold,
        blackOrb: state.blackOrb,
      }),
    }
  )
);
