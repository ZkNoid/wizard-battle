import type { AnyInventoryItem } from './Inventory';

export interface IMarketBuyItem {
  id: string;
  title: string;
  level: number;
  image: string;
  quantity: number;
  type: string;
  price: number;
  priceCurrency: string;
  tooltipItem?: AnyInventoryItem;
}

export interface IMarketHistoryItem {
  id: string;
  title: string;
  level: number;
  image: string;
  quantity: number;
  type: string;
  price: number;
  priceCurrency: 'gold' | 'usdc';
  date: string;
  status: 'bought' | 'sold';
}

export interface IMarketSellingItem {
  id: string;
  title: string;
  level: number;
  image: string;
  quantity: number;
  type: string;
  price: number;
  priceCurrency: 'gold' | 'usdc';
  listedAt: string;
  status: 'on_sale' | 'sold';
}
