import type { IInventoryItem } from './Inventory';

export interface ICraftGroupPanel {
  title: string;
  icon: string;
  items: ICraftItem[];
}

export interface ICraftItem {
  id: string;
  image: string;
  title: string;
  description: string;
  recipe: IInventoryItem[];
}
