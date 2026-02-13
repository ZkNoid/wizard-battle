// Shared expedition types for frontend and backend

export type ExpeditionStatus = 'active' | 'completed' | 'pending';
export type ExpeditionDuration = '1hour' | '3hour' | '8hour';
export type ExpeditionTimePeriod = 1 | 3 | 8;
export type LocationBiome = 'forest' | 'water' | 'mountains';

// Location types
export interface ILocation {
  id: string;
  name: string;
  image: string;
  biome: LocationBiome;
  commonRewards?: string[]; // Item IDs for common rarity items in this biome
  uncommonRewards?: string[]; // Item IDs for uncommon rarity items in this biome
}

// Expedition reward reference (for database storage)
export interface IExpeditionRewardDB {
  itemId: string;
  amount: number;
}

// Expedition reward (populated with full item data)
export interface IExpeditionReward {
  id: string;
  name: string;
  image: string;
  amount: number;
}

// Database schema for expedition
export interface IExpeditionDB {
  id: string;
  userId: string;
  characterId: string; // Wizard ID as string for database
  characterRole: string;
  characterImage: string;
  locationId: string;
  locationName: string;
  rewards: IExpeditionRewardDB[];
  status: ExpeditionStatus;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completesAt?: Date;
  timeToComplete: number; // Duration in milliseconds
}

// Frontend expedition type (with populated rewards)
export interface IExpedition {
  id: string;
  userId: string;
  characterId: string;
  characterRole: string;
  characterImage: string;
  locationId: string;
  locationName: string;
  rewards: IExpeditionReward[];
  status: ExpeditionStatus;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completesAt?: Date;
  timeToComplete: number;
}

// Create expedition input
export interface ICreateExpeditionInput {
  userId: string;
  characterId: string;
  characterRole: string;
  characterImage: string;
  locationId: string;
  timePeriod: ExpeditionTimePeriod;
}

// Location definition for database
export interface ILocationDB {
  id: string;
  name: string;
  image: string;
  biome: LocationBiome;
  commonRewards: string[]; // Item IDs for common rarity items in this biome
  uncommonRewards: string[]; // Item IDs for uncommon rarity items in this biome
}

