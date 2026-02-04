// Shared inventory types for frontend and backend

export type ItemRarity = 'common' | 'uncommon' | 'unique';
export type ItemType = 'armor' | 'craft' | 'gems';
export type InventoryItemWearableArmorSlot =
  | 'arms'
  | 'legs'
  | 'belt'
  | 'necklace'
  | 'gem'
  | 'ring';

export type InventoryFilterType = 'all' | 'armor' | 'craft' | 'gems';

export interface IItemBuff {
  effect: string;
  value: number;
}

// For database storage - stores item reference by ID
export interface IImprovementRequirementDB {
  itemId: string;
  amount: number;
}

// For frontend display - includes full item object
export interface IImprovementRequirement {
  item: IInventoryItem;
  amount: number;
}

export interface IWearRequirement {
  requirement: string;
  value: number;
}

export interface IInventoryItem {
  id: string;
  title: string;
  description: string;
  image: string;
  rarity: ItemRarity;
  type: ItemType;
  amount: number;
  price: number;
}

// For frontend display - includes full item objects in requirements
export interface IInventoryArmorItem extends IInventoryItem {
  type: 'armor';
  wearableSlot: InventoryItemWearableArmorSlot;
  level: number;
  buff: IItemBuff[];
  improvementRequirements: IImprovementRequirement[];
  wearRequirements: IWearRequirement[];
}

// For database storage - stores item references by ID
export interface IInventoryArmorItemDB extends IInventoryItem {
  type: 'armor';
  wearableSlot: InventoryItemWearableArmorSlot;
  level: number;
  buff: IItemBuff[];
  improvementRequirements: IImprovementRequirementDB[];
  wearRequirements: IWearRequirement[];
}

// Union types
export type AnyInventoryItem = IInventoryItem | IInventoryArmorItem;
export type AnyInventoryItemDB = IInventoryItem | IInventoryArmorItemDB;

// Type guard to check if an item is an armor item
export function isArmorItem(item: IInventoryItem): item is IInventoryArmorItem {
  return item.type === 'armor' && 'wearableSlot' in item;
}

// ============================================
// User Inventory Types (ownership records)
// ============================================

export type ItemAcquiredFrom = 'crafted' | 'loot' | 'trade' | 'drop' | 'reward' | 'purchase';

// Database record for user's owned item
export interface IUserInventoryRecord {
  userId: string;
  itemId: string; // Reference to InventoryItem.id
  quantity: number;
  isEquipped?: boolean;
  equippedToWizardId?: string; // Which wizard has this equipped
  acquiredAt?: Date;
  acquiredFrom?: ItemAcquiredFrom;
}

// Populated user inventory item (with full item data)
export interface IUserInventoryItem {
  item: AnyInventoryItem;
  quantity: number;
  isEquipped?: boolean;
  equippedToWizardId?: string;
  acquiredAt?: Date;
  acquiredFrom?: ItemAcquiredFrom;
}

// Populated user inventory armor item
export interface IUserInventoryArmorItem {
  item: IInventoryArmorItem;
  quantity: number;
  isEquipped?: boolean;
  equippedToWizardId?: string;
  acquiredAt?: Date;
  acquiredFrom?: ItemAcquiredFrom;
}
