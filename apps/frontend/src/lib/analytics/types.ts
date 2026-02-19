// Analytics Event Types and Interfaces

export type WalletType = 'Auro' | 'Reown';
export type BattleType = 'PvP' | 'PvE';
export type BattleResult = 'win' | 'loss' | 'draw';
export type GuideLocation = 'battle' | 'home';

// Event Categories
export enum EventCategory {
  WALLET = 'wallet',
  BATTLE = 'battle',
  CHARACTER = 'character',
  CRAFT = 'craft',
  EXPEDITION = 'expedition',
  UI = 'ui',
  PERFORMANCE = 'performance',
  FUNNEL = 'funnel',
  BLOCKCHAIN = 'blockchain',
  SESSION = 'session',
}

// Wallet Events
export interface WalletConnectionInitiatedProps {
  wallet_type: WalletType;
}

export interface WalletConnectionSuccessProps {
  wallet_type: WalletType;
  wallet_address: string;
}

export interface WalletConnectionFailedProps {
  wallet_type: WalletType;
  error?: string;
}

export interface WalletTransactionInitiatedProps {
  transaction_type: string;
  wallet_type: WalletType;
}

export interface WalletPromptDismissedProps {
  reason?: string;
}

// Battle Events
export interface BattleStartedProps {
  battle_type: BattleType;
  map_id?: string;
  wizard_id: string;
  wizard_name: string;
  concurrent_battles?: number;
  concurrent_players?: number;
}

export interface BattleEndedProps {
  battle_type: BattleType;
  result: BattleResult;
  duration_ms: number;
  turns_count?: number;
  winner?: string;
}

export interface BattleSurrenderedProps {
  battle_type: BattleType;
  turns_elapsed: number;
}

// Character Events
export interface CharacterSelectedProps {
  wizard_id: string;
  wizard_name: string;
}

export interface SkillsSelectedProps {
  wizard_id: string;
  skills: Array<{
    spell_id: string;
    spell_name: string;
  }>;
}

export interface CharacterLevelUpProps {
  wizard_id: string;
  new_level: number;
  time_to_level_ms?: number;
}

// Craft Events
export interface ItemCraftedProps {
  item_name: string;
  item_type?: string;
  resources_used: Record<string, number>;
}

export interface CraftFailedProps {
  item_name: string;
  reason: string;
  missing_resources?: Record<string, number>;
}

export interface ItemUpgradedProps {
  item_name: string;
  upgrade_level: number;
  resources_used: Record<string, number>;
}

// Expedition Events
export interface ExpeditionStartedProps {
  location_id: string;
  character_id: string;
  duration: number;
}

export interface ExpeditionCompletedProps {
  location_id: string;
  resources_gained: Record<string, number>;
  duration_ms: number;
}

// UI Events
export interface AudioMusicToggledProps {
  is_muted: boolean;
}

export interface GuideOpenedProps {
  location: GuideLocation;
}

// Performance Events
export interface ScreenLoadProps {
  load_time_ms: number;
  performance_timing?: Record<string, number>;
  screen_name: string;
}

export interface ComponentLoadProps {
  component_name: string;
  duration_ms: number;
}

// Funnel Events
export interface FunnelCharacterCreatedProps {
  wizard_id: string;
  wizard_name: string;
  selected_skills: string[];
}

export interface FunnelFirstBattleProps {
  battle_type: BattleType;
  duration_ms?: number;
}

export interface FunnelFirstCraftProps {
  item_name: string;
  resources_used: Record<string, number>;
}

// Blockchain Events
export interface BlockchainTransactionRequestedProps {
  action: 'mint' | 'burn';
  resource_type: string;
  amount: number;
}

export interface BlockchainTransactionSignedProps {
  action: 'mint' | 'burn';
  resource_type: string;
  amount: number;
  duration_ms: number;
}

export interface BlockchainTransactionFailedProps {
  action: 'mint' | 'burn';
  resource_type: string;
  amount: number;
  error: string;
  duration_ms: number;
}

// User Properties
export interface UserProperties {
  wallet_address?: string;
  wallet_type?: WalletType;
  character_level?: number;
  total_battles?: number;
  total_victories?: number;
  total_crafts?: number;
  total_expeditions?: number;
}
