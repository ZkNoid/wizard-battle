# 📖 PostHog Events Reference

Reference for all 34 PostHog events in Wizard Battle.

---

## 🔐 1. Wallet Events (6 events)

### `wallet_connection_initiated`
Wallet connection initiated by user.
- `wallet_type`: `'Auro' | 'Reown'`

### `wallet_connection_success`
Wallet connected successfully.
- `wallet_type`: `'Auro' | 'Reown'`
- `wallet_address`: `string`

### `wallet_connection_failed`
Wallet connection error.
- `wallet_type`: `'Auro' | 'Reown'`
- `error?`: `string`

### `wallet_transaction_initiated`
Transaction initiated.
- `transaction_type`: `string`
- `wallet_type`: `'Auro' | 'Reown'`

### `wallet_prompt_shown`
Connection prompt shown.

### `wallet_prompt_dismissed`
Prompt dismissed.
- `reason?`: `string`

---

## ⚔️ 2. Battle Events (3 events)

### `battle_started`
Battle started.
- `battle_type`: `'PvP' | 'PvE'`
- `map_id?`: `string`
- `wizard_id`: `string`
- `wizard_name`: `string`
- `concurrent_battles?`: `number`
- `concurrent_players?`: `number`

### `battle_ended`
Battle completed.
- `battle_type`: `'PvP' | 'PvE'`
- `result`: `'win' | 'loss' | 'draw'`
- `duration_ms`: `number`
- `turns_count?`: `number`
- `winner?`: `string`

### `battle_surrendered`
Player surrendered.
- `battle_type`: `'PvP' | 'PvE'`
- `turns_elapsed`: `number`

---

## 🧙 3. Character Events (3 events)

### `character_selected`
Character selected.
- `wizard_id`: `string`
- `wizard_name`: `string`

### `skills_selected`
Skills selected.
- `wizard_id`: `string`
- `skills`: `Array<{ spell_id: string; spell_name: string }>`

### `character_level_up`
Level up.
- `wizard_id`: `string`
- `new_level`: `number`
- `time_to_level_ms?`: `number`

---

## 🔨 4. Craft Events (3 events)

### `item_crafted`
Item crafted.
- `item_name`: `string`
- `item_type?`: `string`
- `resources_used`: `Record<string, number>`

### `craft_failed`
Crafting failed.
- `item_name`: `string`
- `reason`: `string`
- `missing_resources?`: `Record<string, number>`

### `item_upgraded`
Item upgraded.
- `item_name`: `string`
- `upgrade_level`: `number`
- `resources_used`: `Record<string, number>`

---

## 🗺️ 5. Expedition Events (2 events)

### `expedition_started`
Expedition started.
- `location_id`: `string`
- `character_id`: `string`
- `duration`: `number`

### `expedition_completed`
Expedition completed.
- `location_id`: `string`
- `resources_gained`: `Record<string, number>`
- `duration_ms`: `number`

---

## 🎨 6. UI Events (2 events)

### `audio_music_toggled`
Music toggled on/off.
- `is_muted`: `boolean`

### `guide_opened`
Guide opened.
- `location`: `'battle' | 'home'`

---

## ⚡ 7. Performance Events (4 events)

### `screen_load_home`
Home screen loaded.
- `load_time_ms`: `number`
- `screen_name`: `'home'`
- `performance_timing?`: `Record<string, number>`

### `screen_load_game`
Game screen loaded.
- `load_time_ms`: `number`
- `screen_name`: `'game'`
- `performance_timing?`: `Record<string, number>`

### `screen_load_play`
Play screen loaded.
- `load_time_ms`: `number`
- `screen_name`: `'play'`
- `performance_timing?`: `Record<string, number>`

### `component_load`
Component loaded.
- `component_name`: `string`
- `duration_ms`: `number`

---

## 📊 8. Funnel Events (6 events)

### `funnel_app_loaded`
App loaded.

### `funnel_wallet_connected`
Wallet connected (funnel).
- `wallet_type`: `'Auro' | 'Reown'`

### `funnel_character_created`
Character created (funnel).
- `wizard_id`: `string`
- `wizard_name`: `string`
- `selected_skills`: `string[]`

### `funnel_first_battle_started`
First battle started (funnel).
- `battle_type`: `'PvP' | 'PvE'`
- `duration_ms?`: `number`

### `funnel_first_battle_won`
First battle won (funnel).
- `battle_type`: `'PvP' | 'PvE'`
- `duration_ms?`: `number`

### `funnel_first_craft_completed`
First craft completed (funnel).
- `item_name`: `string`
- `resources_used`: `Record<string, number>`

---

## ⛓️ 9. Blockchain Events (3 events)

### `blockchain_transaction_requested`
Transaction requested.
- `action`: `'mint' | 'burn'`
- `resource_type`: `string`
- `amount`: `number`

### `blockchain_transaction_signed`
Transaction signed.
- `action`: `'mint' | 'burn'`
- `resource_type`: `string`
- `amount`: `number`
- `duration_ms`: `number`

### `blockchain_transaction_failed`
Transaction failed.
- `action`: `'mint' | 'burn'`
- `resource_type`: `string`
- `amount`: `number`
- `error`: `string`
- `duration_ms`: `number`

---

## 🎮 10. Session Events (2 events)

### `session_start`
Session started.

### `game_loaded`
Game loaded.

---

## 💻 Usage in Code

```typescript
import { trackEvent } from '@/lib/analytics/posthog-utils';
import { AnalyticsEvents } from '@/lib/analytics/events';

// Example
trackEvent(AnalyticsEvents.BATTLE_STARTED, {
  battle_type: 'PvP',
  wizard_id: 'wizard_123',
  wizard_name: 'Merlin',
});
```

## 👤 User Identification

```typescript
import { identifyUser } from '@/lib/analytics/posthog-utils';

identifyUser(walletAddress, 'Auro');
```

## 📝 User Properties

- `wallet_address`: `string`
- `wallet_type`: `'Auro' | 'Reown'`
- `character_level`: `number`
- `total_battles`: `number`
- `total_victories`: `number`
- `total_crafts`: `number`
- `total_expeditions`: `number`

---

**Total:** 34 events in 10 categories
