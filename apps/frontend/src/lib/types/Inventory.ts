// Re-export inventory types from shared common package
export {
  type ItemRarity,
  type ItemType,
  type InventoryItemWearableArmorSlot,
  type InventoryFilterType,
  type IItemBuff,
  type IImprovementRequirement,
  type IImprovementRequirementDB,
  type IWearRequirement,
  type IInventoryItem,
  type IInventoryArmorItem,
  type IInventoryArmorItemDB,
  type AnyInventoryItem,
  type AnyInventoryItemDB,
  isArmorItem,
  // User inventory types
  type ItemAcquiredFrom,
  type IUserInventoryRecord,
  type IUserInventoryItem,
  type IUserInventoryArmorItem,
} from '@wizard-battle/common';
