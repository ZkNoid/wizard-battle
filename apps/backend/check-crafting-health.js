/**
 * Script to check health of crafting items
 *
 * This script verifies that:
 * 1. All resultItemIds in craft recipes exist in iteminventory
 * 2. All ingredient itemIds in craft recipes exist in iteminventory
 *
 * Run with: node check-crafting-health.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'wizardbattle';

async function checkCraftingHealth() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log(`   URI: ${MONGODB_URI}`);
    console.log(`   Database: ${MONGODB_DB}`);

    await mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DB,
    });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const itemInventoryCollection = db.collection('iteminventory');
    const craftRecipesCollection = db.collection('craftrecipes');

    // Step 1: Fetch all items from iteminventory
    console.log('📦 Fetching items from iteminventory...');
    const allItems = await itemInventoryCollection.find({}).toArray();
    const itemIds = new Set(allItems.map((item) => item.id));
    console.log(`   Found ${allItems.length} items\n`);

    // Step 2: Fetch all craft recipes
    console.log('📋 Fetching craft recipes...');
    const allRecipes = await craftRecipesCollection.find({}).toArray();
    console.log(`   Found ${allRecipes.length} recipes\n`);

    if (allRecipes.length === 0) {
      console.log('⚠️  No craft recipes found in database.');
      console.log('   Run seed-craft-recipes.js to seed recipes first.');
      process.exit(0);
    }

    // Step 3: Check health
    console.log('🔍 Checking crafting health...\n');

    const missingResultItems = [];
    const missingIngredients = [];
    const recipesWithIssues = new Set();

    for (const recipe of allRecipes) {
      // Check if result item exists
      if (!itemIds.has(recipe.resultItemId)) {
        missingResultItems.push({
          recipeId: recipe.id,
          recipeTitle: recipe.title,
          missingItemId: recipe.resultItemId,
        });
        recipesWithIssues.add(recipe.id);
      }

      // Check if all ingredients exist
      for (const ingredient of recipe.ingredients || []) {
        if (!itemIds.has(ingredient.itemId)) {
          missingIngredients.push({
            recipeId: recipe.id,
            recipeTitle: recipe.title,
            missingItemId: ingredient.itemId,
            requiredAmount: ingredient.requiredAmount,
          });
          recipesWithIssues.add(recipe.id);
        }
      }
    }

    // Step 4: Report results
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    CRAFTING HEALTH REPORT');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`📊 Summary:`);
    console.log(`   Total items in inventory: ${allItems.length}`);
    console.log(`   Total craft recipes: ${allRecipes.length}`);
    console.log(`   Recipes with issues: ${recipesWithIssues.size}`);
    console.log(`   Missing result items: ${missingResultItems.length}`);
    console.log(`   Missing ingredients: ${missingIngredients.length}`);
    console.log('');

    if (missingResultItems.length === 0 && missingIngredients.length === 0) {
      console.log('✅ All crafting items are healthy!');
      console.log('   - All recipe result items exist in iteminventory');
      console.log('   - All recipe ingredients exist in iteminventory\n');
    } else {
      console.log('❌ ISSUES FOUND:\n');

      if (missingResultItems.length > 0) {
        console.log('───────────────────────────────────────────────────────────────');
        console.log('🚫 MISSING RESULT ITEMS (recipe outputs not in iteminventory):');
        console.log('───────────────────────────────────────────────────────────────');

        // Group by missing item ID
        const groupedResults = {};
        for (const item of missingResultItems) {
          if (!groupedResults[item.missingItemId]) {
            groupedResults[item.missingItemId] = [];
          }
          groupedResults[item.missingItemId].push(item);
        }

        for (const [itemId, recipes] of Object.entries(groupedResults)) {
          console.log(`\n   ❌ "${itemId}" - missing in ${recipes.length} recipe(s):`);
          recipes.forEach((r) => {
            console.log(`      - Recipe: ${r.recipeId} (${r.recipeTitle})`);
          });
        }
        console.log('');
      }

      if (missingIngredients.length > 0) {
        console.log('───────────────────────────────────────────────────────────────');
        console.log('🚫 MISSING INGREDIENTS (recipe inputs not in iteminventory):');
        console.log('───────────────────────────────────────────────────────────────');

        // Group by missing item ID
        const groupedIngredients = {};
        for (const item of missingIngredients) {
          if (!groupedIngredients[item.missingItemId]) {
            groupedIngredients[item.missingItemId] = [];
          }
          groupedIngredients[item.missingItemId].push(item);
        }

        for (const [itemId, recipes] of Object.entries(groupedIngredients)) {
          console.log(`\n   ❌ "${itemId}" - missing in ${recipes.length} recipe(s):`);
          recipes.forEach((r) => {
            console.log(`      - Recipe: ${r.recipeId} (${r.recipeTitle}) - needs ${r.requiredAmount}x`);
          });
        }
        console.log('');
      }

      // List unique missing item IDs for easy reference
      const allMissingIds = new Set([
        ...missingResultItems.map((m) => m.missingItemId),
        ...missingIngredients.map((m) => m.missingItemId),
      ]);

      console.log('───────────────────────────────────────────────────────────────');
      console.log('📝 ALL UNIQUE MISSING ITEM IDs:');
      console.log('───────────────────────────────────────────────────────────────');
      const sortedMissingIds = Array.from(allMissingIds).sort();
      sortedMissingIds.forEach((id) => {
        console.log(`   - ${id}`);
      });
      console.log(`\n   Total: ${allMissingIds.size} unique items missing\n`);
    }

    // Step 5: Additional stats
    console.log('───────────────────────────────────────────────────────────────');
    console.log('📈 ADDITIONAL STATISTICS:');
    console.log('───────────────────────────────────────────────────────────────');

    // Count items by type
    const itemsByType = {};
    for (const item of allItems) {
      const type = item.type || 'unknown';
      itemsByType[type] = (itemsByType[type] || 0) + 1;
    }
    console.log('\n   Items by type:');
    for (const [type, count] of Object.entries(itemsByType).sort()) {
      console.log(`      - ${type}: ${count}`);
    }

    // Count recipes by category
    const recipesByCategory = {};
    for (const recipe of allRecipes) {
      const category = recipe.category || 'unknown';
      recipesByCategory[category] = (recipesByCategory[category] || 0) + 1;
    }
    console.log('\n   Recipes by category:');
    for (const [category, count] of Object.entries(recipesByCategory).sort()) {
      console.log(`      - ${category}: ${count}`);
    }

    // Count recipes by craftingType
    const recipesByCraftingType = {};
    for (const recipe of allRecipes) {
      const craftingType = recipe.craftingType || 'unknown';
      recipesByCraftingType[craftingType] = (recipesByCraftingType[craftingType] || 0) + 1;
    }
    console.log('\n   Recipes by crafting type:');
    for (const [craftingType, count] of Object.entries(recipesByCraftingType).sort()) {
      console.log(`      - ${craftingType}: ${count}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');

    // Exit with error code if issues found
    if (missingResultItems.length > 0 || missingIngredients.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
checkCraftingHealth();

