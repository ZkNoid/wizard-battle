# Crafting Module

NestJS module for handling item crafting in the Wizard Battle game.

## Features

- ✅ Craft items using recipes
- ✅ Validate ingredient availability
- ✅ Automatically deduct ingredients from inventory
- ✅ Add crafted items to user inventory
- ✅ Support for multiple crafting types (crafting, upgrading, unifying)
- ✅ Organized by equipment categories (gem, belt, necklace, ring, arms, legs)

## API Endpoints

### Craft an Item

```
POST /crafting/craft
```

**Request Body:**

```json
{
  "userId": "string",
  "recipeId": "string"
}
```

**Response:** Returns the crafted item added to inventory

```json
{
  "userId": "user123",
  "itemId": "SorcererOrbLv0",
  "quantity": 1,
  "acquiredFrom": "crafting",
  "acquiredAt": "2026-02-06T10:00:00.000Z"
}
```

**Error Response (Insufficient Ingredients):**

```json
{
  "message": "Insufficient ingredients for crafting",
  "missingIngredients": [
    {
      "itemId": "BlackOrb",
      "required": 1,
      "current": 0
    }
  ]
}
```

### Get All Recipes

```
GET /crafting/recipes
```

### Get Recipe by ID

```
GET /crafting/recipes/:id
```

### Get Recipes by Category

```
GET /crafting/recipes/category/:category
```

Categories: `gem`, `belt`, `necklace`, `ring`, `arms`, `legs`

### Get Recipes by Type

```
GET /crafting/recipes/type/:type
```

Types: `crafting`, `upgrading`, `unifying`

## Database Schema

### CraftRecipe Collection

```typescript
{
  id: string;                    // Unique recipe identifier
  title: string;                 // Display name
  description: string;           // Recipe description
  image: string;                 // Image filename
  craftingType: string;          // 'crafting' | 'upgrading' | 'unifying'
  category: string;              // Equipment category
  resultItemId: string;          // ID of the crafted item
  ingredients: [
    {
      itemId: string;           // Required item ID
      requiredAmount: number;   // Amount needed
    }
  ];
  createdAt: Date;
  updatedAt: Date;
}
```

## Setup & Testing

### 1. Seed Craft Items

```bash
cd apps/backend
node seed-craft-items.js
```

### 2. Seed Craft Recipes

```bash
node seed-craft-recipes.js
```

### 3. Add Test Items to User Inventory

```bash
node add-crafting-test-items.js <userId>
```

### 4. Test Crafting

```bash
node test-crafting.js <userId> <recipeId>
```

Example:

```bash
node test-crafting.js user123 gem-sorcerer-lv0
```

## Recipe ID Format

Recipe IDs follow the pattern: `{category}-{class}-lv{level}`

Examples:

- `gem-sorcerer-lv0` - Sorcerer's Orb Level 0
- `belt-archer-lv2` - Archer's Belt Level 2
- `necklace-duelist-lv5` - Duelist's Amulet Level 5

## Crafting Flow

1. **Validate Recipe** - Check if recipe exists
2. **Check Ingredients** - Verify user has all required items
3. **Remove Ingredients** - Deduct required items from inventory
4. **Add Crafted Item** - Add the result item to user's inventory

All operations maintain data integrity:

- If any step fails, no changes are made to inventory
- Detailed error messages for missing ingredients
- Transaction-safe operations

## Integration

The crafting module integrates with:

- **UserInventoryModule** - For inventory management
- **CraftRecipeSchema** - MongoDB schema for recipes

Import in your module:

```typescript
import { CraftingModule } from './crafting/crafting.module';

@Module({
  imports: [CraftingModule],
})
export class AppModule {}
```

## Error Handling

- `NotFoundException` - Recipe not found
- `BadRequestException` - Insufficient ingredients (includes detailed missing items)
- `BadRequestException` - Invalid quantities or item not found

## Development

The module is located in `apps/backend/src/crafting/` with:

- `crafting.module.ts` - Module definition
- `services/crafting.service.ts` - Business logic
- `controllers/crafting.controller.ts` - API endpoints
- `schemas/craft-recipe.schema.ts` - MongoDB schema
- `dto/craft-item.dto.ts` - Request validation
