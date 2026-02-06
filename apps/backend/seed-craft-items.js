/**
 * Script to seed craft items from CSV in MongoDB
 *
 * This script seeds the `inventoryitems` collection with craft item definitions
 *
 * Run with: node seed-craft-items.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// ============================================================================
// CRAFT ITEM DEFINITIONS (from Wizard_Battle_items.csv)
// ============================================================================

const CRAFT_ITEMS = [
  // Whisperwood Grove items
  {
    id: 'Amber',
    title: 'Amber',
    type: 'craft',
    price: 100,
    description: 'Hardened tree resin. Commonly used in enchantments.',
    rarity: 'common',
    image: 'Amber.png',
    amount: 1,
  },
  {
    id: 'Resin',
    title: 'Resin',
    type: 'craft',
    price: 100,
    description:
      'Sticky alchemical substance used to bind components together during crafting.',
    rarity: 'common',
    image: 'Resin.png',
    amount: 1,
  },
  {
    id: 'ManaBark',
    title: 'Mana Bark',
    type: 'craft',
    price: 100,
    description: 'Bark harvested from mana-trees. A basic magical reagent.',
    rarity: 'common',
    image: 'ManaBark.png',
    amount: 1,
  },
  {
    id: 'ElvenRune',
    title: 'Elven Rune',
    type: 'craft',
    price: 100,
    description:
      'A living symbol carved by ancient elves. Enhances magical stability and precision in crafted items.',
    rarity: 'uncommon',
    image: 'ElvenRune.png',
    amount: 1,
  },
  {
    id: 'PhoenixEmber',
    title: 'Phoenix Ember',
    type: 'craft',
    price: 100,
    description:
      'A smoldering fragment from a reborn phoenix. Carries residual heat and regenerative properties.',
    rarity: 'uncommon',
    image: 'PhoenixEmber.png',
    amount: 1,
  },

  // Serpentwater Basin items
  {
    id: 'Pearl',
    title: 'Pearl',
    type: 'craft',
    price: 100,
    description: 'Naturally occurring gemstone. Enhances enchantment clarity.',
    rarity: 'common',
    image: 'Pearl.png',
    amount: 1,
  },
  {
    id: 'ReedSilk',
    title: 'Reed Silk',
    type: 'craft',
    price: 100,
    description: 'Fine fabric spun from reeds. Lightweight and durable.',
    rarity: 'common',
    image: 'ReedSilk.png',
    amount: 1,
  },
  {
    id: 'Shell',
    title: 'Shell',
    type: 'craft',
    price: 100,
    description: 'Hardened natural armor from creatures of the sea.',
    rarity: 'common',
    image: 'Shell.png',
    amount: 1,
  },
  {
    id: 'SerpentScale',
    title: 'Serpent Scale',
    type: 'craft',
    price: 100,
    description:
      'A hardened scale from a great serpent. Naturally resistant to magic and physical damage.',
    rarity: 'uncommon',
    image: 'SerpentScale.png',
    amount: 1,
  },
  {
    id: 'WaterEssence',
    title: 'Water Essence',
    type: 'craft',
    price: 100,
    description:
      'A vial of purified elemental water. Used to stabilize volatile enchantments.',
    rarity: 'uncommon',
    image: 'WaterEssence.png',
    amount: 1,
  },

  // Mount Avalon items
  {
    id: 'WerewolfFang',
    title: 'Werewolf Fang',
    type: 'craft',
    price: 100,
    description:
      'A sharp fang imbued with feral energy. Often used in crafting.',
    rarity: 'common',
    image: 'WerewolfFang.png',
    amount: 1,
  },
  {
    id: 'Frostdust',
    title: 'Frostdust',
    type: 'craft',
    price: 100,
    description:
      'Crystallized ice essence that radiates cold. Used in enchantments.',
    rarity: 'common',
    image: 'Frostdust.png',
    amount: 1,
  },
  {
    id: 'Glowstone',
    title: 'Glowstone',
    type: 'craft',
    price: 100,
    description:
      'A softly luminescent stone used as a basic magical power source.',
    rarity: 'common',
    image: 'Glowstone.png',
    amount: 1,
  },
  {
    id: 'InfusedCrystal',
    title: 'Infused Crystal',
    type: 'craft',
    price: 100,
    description:
      'A crystal saturated with arcane energy. Acts as a catalyst in advanced spellcraft.',
    rarity: 'uncommon',
    image: 'InfusedCrystal.png',
    amount: 1,
  },
  {
    id: 'AstralAlloy',
    title: 'Astral Alloy',
    type: 'craft',
    price: 100,
    description:
      'A rare metal forged under celestial alignment. Highly conductive to cosmic and arcane forces.',
    rarity: 'uncommon',
    image: 'AstralAlloy.png',
    amount: 1,
  },
  // Unique crafting resources
  {
    id: 'BlackOrb',
    title: 'Black Orb',
    type: 'craft',
    price: 100,
    description:
      'A mysterious orb pulsing with dark energy, used to craft powerful gems',
    rarity: 'unique',
    image: 'black-orb.png',
    amount: 1,
  },
  {
    id: 'ChainLink',
    title: 'Chain Link',
    type: 'craft',
    price: 100,
    description: 'A sturdy metal link, essential for crafting durable belts',
    rarity: 'unique',
    image: 'chain-link.png',
    amount: 1,
  },
  {
    id: 'ShardofIllusion',
    title: 'Shard of Illusion',
    type: 'craft',
    price: 100,
    description:
      'A crystalline fragment that bends light and perception, used for crafting amulets',
    rarity: 'unique',
    image: 'shard-of-illusion.png',
    amount: 1,
  },
  {
    id: 'SilverThread',
    title: 'Silver Thread',
    type: 'craft',
    price: 100,
    description:
      'Fine enchanted thread spun from pure silver, required for ring crafting',
    rarity: 'unique',
    image: 'silver-thread.png',
    amount: 1,
  },
  {
    id: 'ReinforcedPadding',
    title: 'Reinforced Padding',
    type: 'craft',
    price: 100,
    description: 'Durable protective material used to craft sturdy gloves',
    rarity: 'unique',
    image: 'reinforced-padding.png',
    amount: 1,
  },
  {
    id: 'ShadowstepLeather',
    title: 'Shadowstep Leather',
    type: 'craft',
    price: 100,
    description:
      'Supple leather that seems to shift in shadows, ideal for crafting swift boots',
    rarity: 'unique',
    image: 'shadowstep-leather.png',
    amount: 1,
  },
];

// ============================================================================
// MONGODB CONNECTION
// ============================================================================

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'wizardbattle';

async function seedCraftItems() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DB,
    });
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const itemsCollection = db.collection('inventoryitems');

    // Get IDs of items to update/insert
    const itemIds = CRAFT_ITEMS.map((item) => item.id);

    // Check which items already exist
    const existingItems = await itemsCollection
      .find({ id: { $in: itemIds } })
      .toArray();

    const existingIds = new Set(existingItems.map((item) => item.id));

    console.log(`\nFound ${existingItems.length} existing craft items`);
    console.log(
      `Will update ${existingItems.length} and insert ${CRAFT_ITEMS.length - existingItems.length} new items`
    );

    // Use bulkWrite for efficient upsert operations
    const bulkOps = CRAFT_ITEMS.map((item) => ({
      updateOne: {
        filter: { id: item.id },
        update: { $set: item },
        upsert: true,
      },
    }));

    const result = await itemsCollection.bulkWrite(bulkOps);

    console.log(
      `\n✅ Successfully processed ${CRAFT_ITEMS.length} craft items`
    );
    console.log(`   - Inserted: ${result.upsertedCount}`);
    console.log(`   - Updated: ${result.modifiedCount}`);
    console.log(`   - Matched: ${result.matchedCount}`);

    // List all craft items by location
    console.log('\n📦 Craft items by location:');
    console.log('\n🌳 Whisperwood Grove:');
    CRAFT_ITEMS.slice(0, 5).forEach((item) => {
      console.log(`   - ${item.title} (${item.rarity})`);
    });

    console.log('\n🌊 Serpentwater Basin:');
    CRAFT_ITEMS.slice(5, 10).forEach((item) => {
      console.log(`   - ${item.title} (${item.rarity})`);
    });

    console.log('\n⛰️  Mount Avalon:');
    CRAFT_ITEMS.slice(10, 15).forEach((item) => {
      console.log(`   - ${item.title} (${item.rarity})`);
    });
  } catch (error) {
    console.error('Error seeding craft items:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✨ Disconnected from MongoDB');
  }
}

// Run the script
seedCraftItems();
