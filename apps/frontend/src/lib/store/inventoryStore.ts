import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  IInventoryItem,
  IInventoryArmorItem,
  InventoryItemWearableArmorSlot,
} from '@/lib/types/Inventory';
import { ALL_ITEMS } from '@/lib/constants/items';

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

interface InventoryStore {
  // Equipped items per wizard (wizard index as key: 0=ARCHER, 1=WARRIOR, 2=MAGE)
  equippedItemsByWizard: Record<number, EquippedSlots>;

  // User's inventory items (not equipped)
  inventoryItems: (IInventoryItem | IInventoryArmorItem)[];

  // Actions
  getEquippedItems: (wizardIndex: number) => EquippedSlots;
  equipItem: (
    wizardIndex: number,
    slotId: InventoryItemWearableArmorSlot,
    item: IInventoryItem
  ) => void;
  unequipItem: (
    wizardIndex: number,
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
      inventoryItems: [...ALL_ITEMS],

      getEquippedItems: (wizardIndex: number): EquippedSlots => {
        const state = get();
        return (
          state.equippedItemsByWizard[wizardIndex] ?? {
            ...defaultEquippedSlots,
          }
        );
      },

      equipItem: (
        wizardIndex: number,
        slotId: InventoryItemWearableArmorSlot,
        item: IInventoryItem
      ) =>
        set((state) => {
          // Get current equipped items for this wizard
          const currentEquipped = state.equippedItemsByWizard[wizardIndex] ?? {
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
              [wizardIndex]: updatedEquipped,
            },
            inventoryItems: newInventory,
          };
        }),

      unequipItem: (
        wizardIndex: number,
        slotId: InventoryItemWearableArmorSlot
      ) =>
        set((state) => {
          const currentEquipped = state.equippedItemsByWizard[wizardIndex] ?? {
            ...defaultEquippedSlots,
          };
          const item = currentEquipped[slotId];

          if (!item) return state;

          // Remove item from slot
          const updatedEquipped = { ...currentEquipped };
          updatedEquipped[slotId] = null;

          // Add item back to inventory
          return {
            equippedItemsByWizard: {
              ...state.equippedItemsByWizard,
              [wizardIndex]: updatedEquipped,
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
        inventoryItems: state.inventoryItems,
      }),
    }
  )
);
