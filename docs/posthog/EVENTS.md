# 📖 PostHog Events Reference

Справочник всех 34 событий PostHog в Wizard Battle.

---

## 🔐 1. Wallet Events (6 событий)

### `wallet_connection_initiated`
Подключение кошелька инициировано.
- `wallet_type`: `'Auro' | 'Reown'`

### `wallet_connection_success`
Кошелек подключен успешно.
- `wallet_type`: `'Auro' | 'Reown'`
- `wallet_address`: `string`

### `wallet_connection_failed`
Ошибка подключения кошелька.
- `wallet_type`: `'Auro' | 'Reown'`
- `error?`: `string`

### `wallet_transaction_initiated`
Транзакция инициирована.
- `transaction_type`: `string`
- `wallet_type`: `'Auro' | 'Reown'`

### `wallet_prompt_shown`
Показан промпт подключения.

### `wallet_prompt_dismissed`
Промпт закрыт.
- `reason?`: `string`

---

## ⚔️ 2. Battle Events (3 события)

### `battle_started`
Бой начат.
- `battle_type`: `'PvP' | 'PvE'`
- `map_id?`: `string`
- `wizard_id`: `string`
- `wizard_name`: `string`
- `concurrent_battles?`: `number`
- `concurrent_players?`: `number`

### `battle_ended`
Бой завершен.
- `battle_type`: `'PvP' | 'PvE'`
- `result`: `'win' | 'loss' | 'draw'`
- `duration_ms`: `number`
- `turns_count?`: `number`
- `winner?`: `string`

### `battle_surrendered`
Игрок сдался.
- `battle_type`: `'PvP' | 'PvE'`
- `turns_elapsed`: `number`

---

## 🧙 3. Character Events (3 события)

### `character_selected`
Персонаж выбран.
- `wizard_id`: `string`
- `wizard_name`: `string`

### `skills_selected`
Навыки выбраны.
- `wizard_id`: `string`
- `skills`: `Array<{ spell_id: string; spell_name: string }>`

### `character_level_up`
Повышение уровня.
- `wizard_id`: `string`
- `new_level`: `number`
- `time_to_level_ms?`: `number`

---

## 🔨 4. Craft Events (3 события)

### `item_crafted`
Предмет создан.
- `item_name`: `string`
- `item_type?`: `string`
- `resources_used`: `Record<string, number>`

### `craft_failed`
Ошибка крафта.
- `item_name`: `string`
- `reason`: `string`
- `missing_resources?`: `Record<string, number>`

### `item_upgraded`
Предмет улучшен.
- `item_name`: `string`
- `upgrade_level`: `number`
- `resources_used`: `Record<string, number>`

---

## 🗺️ 5. Expedition Events (2 события)

### `expedition_started`
Экспедиция начата.
- `location_id`: `string`
- `character_id`: `string`
- `duration`: `number`

### `expedition_completed`
Экспедиция завершена.
- `location_id`: `string`
- `resources_gained`: `Record<string, number>`
- `duration_ms`: `number`

---

## 🎨 6. UI Events (2 события)

### `audio_music_toggled`
Музыка включена/выключена.
- `is_muted`: `boolean`

### `guide_opened`
Гайд открыт.
- `location`: `'battle' | 'home'`

---

## ⚡ 7. Performance Events (4 события)

### `screen_load_home`
Загрузка главного экрана.
- `load_time_ms`: `number`
- `screen_name`: `'home'`
- `performance_timing?`: `Record<string, number>`

### `screen_load_game`
Загрузка игрового экрана.
- `load_time_ms`: `number`
- `screen_name`: `'game'`
- `performance_timing?`: `Record<string, number>`

### `screen_load_play`
Загрузка экрана игры.
- `load_time_ms`: `number`
- `screen_name`: `'play'`
- `performance_timing?`: `Record<string, number>`

### `component_load`
Загрузка компонента.
- `component_name`: `string`
- `duration_ms`: `number`

---

## 📊 8. Funnel Events (6 событий)

### `funnel_app_loaded`
Приложение загружено.

### `funnel_wallet_connected`
Кошелек подключен (воронка).
- `wallet_type`: `'Auro' | 'Reown'`

### `funnel_character_created`
Персонаж создан (воронка).
- `wizard_id`: `string`
- `wizard_name`: `string`
- `selected_skills`: `string[]`

### `funnel_first_battle_started`
Первый бой начат (воронка).
- `battle_type`: `'PvP' | 'PvE'`
- `duration_ms?`: `number`

### `funnel_first_battle_won`
Первый бой выигран (воронка).
- `battle_type`: `'PvP' | 'PvE'`
- `duration_ms?`: `number`

### `funnel_first_craft_completed`
Первый крафт завершен (воронка).
- `item_name`: `string`
- `resources_used`: `Record<string, number>`

---

## ⛓️ 9. Blockchain Events (3 события)

### `blockchain_transaction_requested`
Транзакция запрошена.
- `action`: `'mint' | 'burn'`
- `resource_type`: `string`
- `amount`: `number`

### `blockchain_transaction_signed`
Транзакция подписана.
- `action`: `'mint' | 'burn'`
- `resource_type`: `string`
- `amount`: `number`
- `duration_ms`: `number`

### `blockchain_transaction_failed`
Транзакция не удалась.
- `action`: `'mint' | 'burn'`
- `resource_type`: `string`
- `amount`: `number`
- `error`: `string`
- `duration_ms`: `number`

---

## 🎮 10. Session Events (2 события)

### `session_start`
Сессия начата.

### `game_loaded`
Игра загружена.

---

## 💻 Использование в коде

```typescript
import { trackEvent } from '@/lib/analytics/posthog-utils';
import { AnalyticsEvents } from '@/lib/analytics/events';

// Пример
trackEvent(AnalyticsEvents.BATTLE_STARTED, {
  battle_type: 'PvP',
  wizard_id: 'wizard_123',
  wizard_name: 'Merlin',
});
```

## 👤 Идентификация пользователя

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

**Всего:** 34 события в 10 категориях
