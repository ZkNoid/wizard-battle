export interface IInventoryItem {
  id: string;
  title: string;
  description: string;
  image: string;
  rarity: 'common' | 'uncommon' | 'unique';
  type: 'armor' | 'craft' | 'gems';
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

export type InventoryItemWearableArmorSlot =
  | 'arms'
  | 'legs'
  | 'belt'
  | 'necklace'
  | 'gem'
  | 'ring';

export type InventoryFilterType = 'all' | 'armor' | 'craft' | 'gems';
