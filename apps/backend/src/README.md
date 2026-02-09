# Backend Modules

## Modules Used by Frontend (via tRPC)

### /expedition

- **Purpose**: Used for expeditions management
- **Used by Frontend**: ✅ Yes
- **Frontend Usage**: Via `trpcClient.expeditions.*`
  - `getUserExpeditions` - Get user's expeditions
  - `getLocations` - Get expedition locations
  - `createExpedition` - Create new expedition
  - `completeExpedition` - Complete an expedition
  - `interruptExpedition` - Interrupt an expedition
- **Frontend Modules Using This**:
  - `apps/frontend/src/lib/store/expeditionStore.ts`
  - `apps/frontend/src/components/ExpeditionModal/*`
  - `apps/frontend/src/components/HomePage/index.tsx`
  - `apps/frontend/src/app/initializer.tsx`

### /crafting

- **Purpose**: Used for item crafting system
- **Used by Frontend**: ✅ Yes
- **Frontend Usage**: Via `trpcClient.crafting.*`
  - `getAllRecipes` - Get all crafting recipes
  - `getRecipesByType` - Get recipes by type
  - `getGroupedRecipes` - Get grouped recipes
  - `craftItem` - Craft an item
- **Frontend Modules Using This**:
  - `apps/frontend/src/lib/store/craftStore.ts`
  - `apps/frontend/src/components/CraftModal/*`

### /game-item (items router)

- **Purpose**: Inventory and item management
- **Used by Frontend**: ✅ Yes
- **Frontend Usage**: Via `trpcClient.items.*`
  - `getUserInventory` - Get user's inventory
- **Frontend Modules Using This**:
  - `apps/frontend/src/lib/store/inventoryStore.ts`
  - `apps/frontend/src/components/InventoryModal/*`
  - `apps/frontend/src/components/InventoryModalForm/*`

## Modules NOT Yet Used by Frontend

### /reward

- **Purpose**: Reward users with items, resources after a battle
- **Used by Frontend**: ❌ No (not yet integrated)
- **Available Endpoints**:
  - `POST /reward/gold` - Reward user with gold (userId, amount)
- **Frontend Modules Using This**: None yet

### /user-inventory

- **Purpose**: Direct user inventory management (used internally by other modules)
- **Used by Frontend**: ❌ No (frontend uses `/game-item` via `items` router instead)
- **Frontend Modules Using This**: None (internal backend service)

### /game-session

- **Purpose**: WebSocket game session management
- **Used by Frontend**: ⚠️ Yes (via WebSocket, not REST/tRPC)
- **Frontend Modules Using This**:
  - Frontend connects via Socket.IO for real-time game sessions
  - Not via tRPC router

### /matchmaking

- **Purpose**: Player matchmaking system
- **Used by Frontend**: ⚠️ Yes (via WebSocket, not REST/tRPC)
- **Frontend Modules Using This**:
  - Frontend connects via Socket.IO for matchmaking
  - Not via tRPC router

### /game-commit

- **Purpose**: Game state commits and blockchain integration
- **Used by Frontend**: ❌ No (backend service only)
- **Frontend Modules Using This**: None (internal backend service)

### /bot

- **Purpose**: Bot player management for testing
- **Used by Frontend**: ❌ No (backend service only)
- **Frontend Modules Using This**: None (backend testing/automation)

### /game-character

- **Purpose**: Character/wizard management
- **Used by Frontend**: ❌ No (not yet integrated)
- **Frontend Modules Using This**: None yet

### /health

- **Purpose**: Health checks and monitoring
- **Used by Frontend**: ❌ No (infrastructure only)
- **Frontend Modules Using This**: None (devops/monitoring)
