export interface IInventoryItem {
  id: string;
  title: string;
  description: string;
  image: string;
  rarity: 'common' | 'uncommon' | 'unique';
  type: 'armor' | 'craft' | 'gems' | 'accessory';
  amount: number;
  price: number;
}

export interface IInventoryArmorItem extends IInventoryItem {
  type: 'armor';
  wearableSlot: InventoryItemWearableArmorSlot;
  level: number;
  buff: {
    effect: string;
    value: number;
  }[];
  improvementRequirements: {
    item: IInventoryItem;
    amount: number;
  }[];
  wearRequirements: {
    requirement: string;
    value: number;
  }[];
}

export interface IInventoryAccessoryItem extends IInventoryItem {
  type: 'accessory';
  wearableSlot: InventoryItemWearableAccessorySlot;
  level: number;
  buff: {
    effect: string;
    value: number 
  }[];
  improvementRequirements: {
    item: IInventoryItem;
    amount: number;
  }[];
  wearRequirements: {
    requirement: string;
    value: number;
  }[];
}

export type InventoryItemWearableArmorSlot = 'arms' | 'legs' | 'belt';
export type InventoryItemWearableAccessorySlot = 'necklace' | 'gem' | 'ring';