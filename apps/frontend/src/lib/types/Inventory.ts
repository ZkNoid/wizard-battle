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

export interface IInventoryArmor extends IInventoryItem {
  type: 'armor';
  wearableSlot: 'gem' | 'ring' | 'necklace' | 'arms' | 'legs' | 'belt';
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
