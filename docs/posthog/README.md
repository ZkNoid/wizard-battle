# 📊 PostHog Analytics

PostHog analytics documentation for Wizard Battle.

---

## 🚀 Quick Start

1. **Check events** → [EVENTS.md](./EVENTS.md) - all 34 events
2. **Configure analytics** → Create dashboards and funnels in PostHog UI

---

## 📈 What's Implemented

- ✅ **34 events** are being sent to PostHog
- ✅ **91% of requirements** (20/22) already implemented
- ✅ **Complete onboarding funnel** (6 steps)
- ✅ **Blockchain metrics**
- ✅ **Game metrics**
- ✅ **Performance metrics**

---

## 🎯 Event Categories

1. **🔐 Wallet Events** (6) - Wallet connections
2. **⚔️ Battle Events** (3) - Game battles
3. **🧙 Character Events** (3) - Characters
4. **🔨 Craft Events** (3) - Item crafting
5. **🗺️ Expedition Events** (2) - Expeditions
6. **🎨 UI Events** (2) - User interface
7. **⚡ Performance Events** (4) - Performance
8. **📊 Funnel Events** (6) - Conversion funnel
9. **⛓️ Blockchain Events** (3) - Blockchain
10. **🎮 Session Events** (2) - Sessions

---

## 📊 Onboarding Funnel

```
1. funnel_app_loaded              (100%)
2. funnel_wallet_connected        (?)
3. funnel_character_created       (?)
4. funnel_first_battle_started    (?)
5. funnel_first_battle_won        (?)
6. funnel_first_craft_completed   (?)
```

---

## 🛠️ Configuration

```env
NEXT_PUBLIC_POSTHOG_KEY="your_api_key"
NEXT_PUBLIC_POSTHOG_HOST="https://posthog.zknoid.io/"
```

**Files:**
- `/apps/frontend/src/lib/analytics/events.ts` - event definitions
- `/apps/frontend/src/lib/analytics/types.ts` - TypeScript types
- `/apps/frontend/src/lib/analytics/posthog-utils.ts` - utilities
- `/apps/frontend/src/lib/analytics/posthog-provider.tsx` - React provider

---

## 📚 Documentation

- **[EVENTS.md](./EVENTS.md)** - Reference of all 34 events with parameters

---

## 💡 How to Use

### For Developers:
- Study [EVENTS.md](./EVENTS.md) to understand what events are being sent
- Use code examples to integrate new events

### For Analysts:
- All events are already configured and being sent to PostHog
- Create dashboards and funnels directly in PostHog UI
- Refer to [EVENTS.md](./EVENTS.md) to understand data structure

---

**Status:** Ready to use 🚀
