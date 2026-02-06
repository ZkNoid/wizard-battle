/**
 * Test script for crafting functionality
 *
 * Prerequisites:
 * 1. Run seed-craft-recipes.js to seed recipes
 * 2. Run seed-craft-items.js to seed craft items
 * 3. Make sure you have a user with items in inventory
 *
 * Usage: node test-crafting.js <userId> <recipeId>
 * Example: node test-crafting.js user123 gem-sorcerer-lv0
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:3030';
const userId =
  process.env.USER_PUBLIC_KEY || '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const recipeId = process.argv[3] || 'gem-sorcerer-lv0';

if (!userId) {
  console.error('❌ Error: userId is required');
  console.log('Usage: node test-crafting.js <userId> [recipeId]');
  console.log('Example: node test-crafting.js user123 gem-sorcerer-lv0');
  process.exit(1);
}

async function testCrafting() {
  try {
    console.log('🔧 Testing Crafting System\n');
    console.log(`User ID: ${userId}`);
    console.log(`Recipe ID: ${recipeId}\n`);

    // Step 1: Get the recipe details
    console.log('📋 Step 1: Fetching recipe details...');
    const recipeResponse = await axios.get(
      `${BASE_URL}/crafting/recipes/${recipeId}`
    );
    const recipe = recipeResponse.data;

    console.log(`Recipe: ${recipe.title}`);
    console.log(`Description: ${recipe.description}`);
    console.log(`Category: ${recipe.category}`);
    console.log(`Crafting Type: ${recipe.craftingType}`);
    console.log(`Result Item: ${recipe.resultItemId}`);
    console.log('\nRequired Ingredients:');
    recipe.ingredients.forEach((ing) => {
      console.log(`  - ${ing.itemId}: ${ing.requiredAmount}`);
    });

    // Step 2: Check user's current inventory
    console.log('\n📦 Step 2: Checking user inventory...');
    const inventoryResponse = await axios.get(
      `${BASE_URL}/user-inventory/${userId}`
    );
    const inventory = inventoryResponse.data;

    console.log(`Total items in inventory: ${inventory.length}`);
    console.log('\nCurrent inventory:');
    inventory.forEach((item) => {
      console.log(`  - ${item.itemId}: ${item.quantity}`);
    });

    // Step 3: Check if user has required ingredients
    console.log('\n✅ Step 3: Verifying ingredients...');
    let canCraft = true;
    for (const ingredient of recipe.ingredients) {
      const userItem = inventory.find((i) => i.itemId === ingredient.itemId);
      const hasEnough =
        userItem && userItem.quantity >= ingredient.requiredAmount;

      console.log(
        `  ${hasEnough ? '✓' : '✗'} ${ingredient.itemId}: ${userItem?.quantity || 0}/${ingredient.requiredAmount}`
      );

      if (!hasEnough) {
        canCraft = false;
      }
    }

    if (!canCraft) {
      console.log('\n❌ Cannot craft: Insufficient ingredients');
      return;
    }

    // Step 4: Craft the item
    console.log('\n🔨 Step 4: Crafting item...');
    const craftResponse = await axios.post(`${BASE_URL}/crafting/craft`, {
      userId,
      recipeId,
    });
    const craftedItem = craftResponse.data;

    console.log(`✅ Successfully crafted item!`);
    console.log(`  Item ID: ${craftedItem.itemId}`);
    console.log(`  Quantity: ${craftedItem.quantity}`);
    console.log(`  Acquired From: ${craftedItem.acquiredFrom}`);

    // Step 5: Verify updated inventory
    console.log('\n📦 Step 5: Verifying updated inventory...');
    const updatedInventoryResponse = await axios.get(
      `${BASE_URL}/user-inventory/${userId}`
    );
    const updatedInventory = updatedInventoryResponse.data;

    console.log('\nUpdated inventory:');
    updatedInventory.forEach((item) => {
      console.log(`  - ${item.itemId}: ${item.quantity}`);
    });

    console.log('\n✅ Crafting test completed successfully!');
  } catch (error) {
    console.error('\n❌ Error during crafting test:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error(
        'Message:',
        error.response.data.message || error.response.data
      );
      if (error.response.data.missingIngredients) {
        console.error('\nMissing ingredients:');
        error.response.data.missingIngredients.forEach((ing) => {
          console.error(
            `  - ${ing.itemId}: ${ing.current}/${ing.required} (need ${ing.required - ing.current} more)`
          );
        });
      }
    } else {
      console.error('Error:', error.message);
      console.error('Full error:', error);
    }
    process.exit(1);
  }
}

testCrafting();
