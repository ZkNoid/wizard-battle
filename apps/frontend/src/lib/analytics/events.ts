// Analytics Event Constants

export const AnalyticsEvents = {
  // Wallet Events
  WALLET_CONNECTION_INITIATED: 'wallet_connection_initiated',
  WALLET_CONNECTION_SUCCESS: 'wallet_connection_success',
  WALLET_CONNECTION_FAILED: 'wallet_connection_failed',
  WALLET_TRANSACTION_INITIATED: 'wallet_transaction_initiated',
  WALLET_PROMPT_SHOWN: 'wallet_prompt_shown',
  WALLET_PROMPT_DISMISSED: 'wallet_prompt_dismissed',

  // Battle Events
  BATTLE_STARTED: 'battle_started',
  BATTLE_ENDED: 'battle_ended',
  BATTLE_SURRENDERED: 'battle_surrendered',

  // Character Events
  CHARACTER_SELECTED: 'character_selected',
  SKILLS_SELECTED: 'skills_selected',
  CHARACTER_LEVEL_UP: 'character_level_up',

  // Craft Events
  ITEM_CRAFTED: 'item_crafted',
  CRAFT_FAILED: 'craft_failed',
  ITEM_UPGRADED: 'item_upgraded',

  // Expedition Events
  EXPEDITION_STARTED: 'expedition_started',
  EXPEDITION_COMPLETED: 'expedition_completed',

  // UI Events
  AUDIO_MUSIC_TOGGLED: 'audio_music_toggled',
  GUIDE_OPENED: 'guide_opened',

  // Performance Events
  SCREEN_LOAD_HOME: 'screen_load_home',
  SCREEN_LOAD_GAME: 'screen_load_game',
  SCREEN_LOAD_PLAY: 'screen_load_play',
  COMPONENT_LOAD: 'component_load',

  // Funnel Events
  FUNNEL_APP_LOADED: 'funnel_app_loaded',
  FUNNEL_WALLET_CONNECTED: 'funnel_wallet_connected',
  FUNNEL_CHARACTER_CREATED: 'funnel_character_created',
  FUNNEL_FIRST_BATTLE_STARTED: 'funnel_first_battle_started',
  FUNNEL_FIRST_BATTLE_WON: 'funnel_first_battle_won',
  FUNNEL_FIRST_CRAFT_COMPLETED: 'funnel_first_craft_completed',

  // Blockchain Events
  BLOCKCHAIN_TRANSACTION_REQUESTED: 'blockchain_transaction_requested',
  BLOCKCHAIN_TRANSACTION_SIGNED: 'blockchain_transaction_signed',
  BLOCKCHAIN_TRANSACTION_FAILED: 'blockchain_transaction_failed',

  // Session Events
  SESSION_START: 'session_start',
  GAME_LOADED: 'game_loaded',
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];
