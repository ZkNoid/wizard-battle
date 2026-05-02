/**
 * Script to seed craft recipes in MongoDB
 *
 * This script seeds the `craftrecipes` collection with all crafting recipes
 * for equipment items across all classes and levels
 *
 * Run with: node seed-craft-recipes.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// ============================================================================
// CRAFT RECIPE DEFINITIONS
// ============================================================================

// Recipe data structure:
// Each equipment type has recipes for 3 classes (Sorcerer, Archer, Duelist)
// Each class variant has 6 levels (0-5)

const RECIPE_DATA = {
  gem: {
    name: 'Orb',
    uniqueResource: 'BlackOrb',
    variants: {
      Sorcerer: {
        resources: ['BlackOrb', 'ElvenRune', 'ManaBark'],
        amounts: [
          [1, 1, 5], // Lv. 0
          [1, 2, 10], // Lv. 1
          [2, 3, 20], // Lv. 2
          [3, 5, 50], // Lv. 3
          [7, 10, 100], // Lv. 4
          [10, 15, 200], // Lv. 5
        ],
      },
      Archer: {
        resources: ['BlackOrb', 'ElvenRune', 'Glowstone'],
        amounts: [
          [1, 1, 5],
          [1, 2, 10],
          [2, 3, 20],
          [3, 5, 50],
          [7, 10, 100],
          [10, 15, 200],
        ],
      },
      Duelist: {
        resources: ['BlackOrb', 'WaterEssence', 'Pearl'],
        amounts: [
          [1, 1, 5],
          [1, 2, 10],
          [2, 3, 20],
          [3, 5, 50],
          [7, 10, 100],
          [10, 15, 200],
        ],
      },
    },
  },
  belt: {
    name: 'Belt',
    uniqueResource: 'ChainLink',
    variants: {
      Sorcerer: {
        resources: ['ChainLink', 'WaterEssence', 'Pearl'],
        amounts: [
          [1, 1, 5],
          [1, 2, 5],
          [2, 4, 10],
          [3, 5, 25],
          [7, 15, 50],
          [10, 25, 100],
        ],
      },
      Archer: {
        resources: ['ChainLink', 'WaterEssence', 'ManaBark'],
        amounts: [
          [1, 1, 5],
          [1, 2, 5],
          [2, 4, 10],
          [3, 5, 25],
          [7, 15, 50],
          [10, 25, 100],
        ],
      },
      Duelist: {
        resources: ['ChainLink', 'ElvenRune', 'Glowstone'],
        amounts: [
          [1, 1, 5],
          [1, 2, 5],
          [2, 4, 10],
          [3, 5, 25],
          [7, 15, 50],
          [10, 25, 100],
        ],
      },
    },
  },
  necklace: {
    name: 'Amulet',
    uniqueResource: 'ShardofIllusion',
    variants: {
      Sorcerer: {
        resources: ['ShardofIllusion', 'InfusedCrystal', 'Frostdust'],
        amounts: [
          [1, 1, 5],
          [1, 2, 10],
          [2, 3, 20],
          [3, 5, 50],
          [7, 10, 100],
          [10, 15, 200],
        ],
      },
      Archer: {
        resources: ['ShardofIllusion', 'PhoenixEmber', 'Amber'],
        amounts: [
          [1, 1, 5],
          [1, 2, 10],
          [2, 3, 20],
          [3, 5, 50],
          [7, 10, 100],
          [10, 15, 200],
        ],
      },
      Duelist: {
        resources: ['ShardofIllusion', 'InfusedCrystal', 'Shell'],
        amounts: [
          [1, 1, 5],
          [1, 2, 10],
          [2, 3, 20],
          [3, 5, 50],
          [7, 10, 100],
          [10, 15, 200],
        ],
      },
    },
  },
  ring: {
    name: 'Ring',
    uniqueResource: 'SilverThread',
    variants: {
      Sorcerer: {
        resources: ['SilverThread', 'PhoenixEmber', 'Shell'],
        amounts: [
          [1, 1, 5],
          [1, 2, 5],
          [2, 4, 10],
          [3, 5, 25],
          [7, 15, 50],
          [10, 25, 100],
        ],
      },
      Archer: {
        resources: ['SilverThread', 'InfusedCrystal', 'Frostdust'],
        amounts: [
          [1, 1, 5],
          [1, 2, 5],
          [2, 4, 10],
          [3, 5, 25],
          [7, 15, 50],
          [10, 25, 100],
        ],
      },
      Duelist: {
        resources: ['SilverThread', 'PhoenixEmber', 'Amber'],
        amounts: [
          [1, 1, 5],
          [1, 2, 5],
          [2, 4, 10],
          [3, 5, 25],
          [7, 15, 50],
          [10, 25, 100],
        ],
      },
    },
  },
  arms: {
    name: 'Gloves',
    uniqueResource: 'ReinforcedPadding',
    variants: {
      Sorcerer: {
        resources: ['ReinforcedPadding', 'AstralAlloy', 'ReedSilk'],
        amounts: [
          [1, 1, 5],
          [1, 2, 10],
          [2, 3, 20],
          [3, 5, 50],
          [7, 10, 100],
          [10, 15, 200],
        ],
      },
      Archer: {
        resources: ['ReinforcedPadding', 'SerpentScale', 'Resin'],
        amounts: [
          [1, 1, 5],
          [1, 2, 10],
          [2, 3, 20],
          [3, 5, 50],
          [7, 10, 100],
          [10, 15, 200],
        ],
      },
      Duelist: {
        resources: ['ReinforcedPadding', 'SerpentScale', 'WerewolfFang'],
        amounts: [
          [1, 1, 5],
          [1, 2, 10],
          [2, 3, 20],
          [3, 5, 50],
          [7, 10, 100],
          [10, 15, 200],
        ],
      },
    },
  },
  legs: {
    name: 'Boots',
    uniqueResource: 'ShadowstepLeather',
    variants: {
      Sorcerer: {
        resources: ['ShadowstepLeather', 'SerpentScale', 'Resin'],
        amounts: [
          [1, 1, 5],
          [1, 2, 5],
          [2, 4, 10],
          [3, 5, 25],
          [7, 15, 50],
          [10, 25, 100],
        ],
      },
      Archer: {
        resources: ['ShadowstepLeather', 'AstralAlloy', 'WerewolfFang'],
        amounts: [
          [1, 1, 5],
          [1, 2, 5],
          [2, 4, 10],
          [3, 5, 25],
          [7, 15, 50],
          [10, 25, 100],
        ],
      },
      Duelist: {
        resources: ['ShadowstepLeather', 'AstralAlloy', 'ReedSilk'],
        amounts: [
          [1, 1, 5],
          [1, 2, 5],
          [2, 4, 10],
          [3, 5, 25],
          [7, 15, 50],
          [10, 25, 100],
        ],
      },
    },
  },
};

// Generate all recipes
function generateRecipes() {
  const recipes = [];

  for (const [category, data] of Object.entries(RECIPE_DATA)) {
    const { name, variants } = data;

    for (const [className, variantData] of Object.entries(variants)) {
      const { resources, amounts } = variantData;

      for (let level = 0; level < 6; level++) {
        const recipeId = `${category}-${className.toLowerCase()}-lv${level}`;
        const resultItemId = `${className}${name}Lv${level}`;

        // Build ingredients array
        const ingredients = resources.map((resourceId, idx) => ({
          itemId: resourceId,
          requiredAmount: amounts[level][idx],
        }));

        const recipe = {
          id: recipeId,
          title: `${className}'s ${name} Lv. ${level}`,
          description: `A ${name.toLowerCase()} crafted for ${className} class, level ${level}.`,
          image: `${resultItemId}.png`,
          craftingType: 'crafting',
          category: category,
          resultItemId: resultItemId,
          ingredients: ingredients,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        recipes.push(recipe);
      }
    }
  }

  return recipes;
}

// ============================================================================
// MONGODB CONNECTION
// ============================================================================

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'wizardbattle';

async function seedCraftRecipes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DB,
    });
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const recipesCollection = db.collection('craftrecipes');

    // Generate all recipes
    const recipes = generateRecipes();
    console.log(`\n📋 Generated ${recipes.length} craft recipes`);

    // Check if recipes already exist
    const existingCount = await recipesCollection.countDocuments();

    if (existingCount > 0) {
      console.log(
        `Found ${existingCount} existing recipes. Clearing and re-seeding...`
      );
      await recipesCollection.deleteMany({});
    }

    // Insert all recipes
    const result = await recipesCollection.insertMany(recipes);
    console.log(`✅ Successfully seeded ${result.insertedCount} craft recipes`);

    // Summary by category
    console.log('\n📦 Recipes by category:');
    for (const [category, data] of Object.entries(RECIPE_DATA)) {
      const categoryRecipes = recipes.filter((r) => r.category === category);
      console.log(
        `   ${data.name} (${category}): ${categoryRecipes.length} recipes`
      );
    }

    // Summary by class
    console.log('\n👥 Recipes by class:');
    const classes = ['Sorcerer', 'Archer', 'Duelist'];
    for (const className of classes) {
      const classRecipes = recipes.filter((r) => r.title.startsWith(className));
      console.log(`   ${className}: ${classRecipes.length} recipes`);
    }

    // Summary by level
    console.log('\n📊 Recipes by level:');
    for (let level = 0; level < 6; level++) {
      const levelRecipes = recipes.filter((r) =>
        r.title.includes(`Lv. ${level}`)
      );
      console.log(`   Level ${level}: ${levelRecipes.length} recipes`);
    }
  } catch (error) {
    console.error('Error seeding craft recipes:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
seedCraftRecipes();
