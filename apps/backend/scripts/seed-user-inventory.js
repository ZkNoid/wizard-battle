/**
 * Script to populate a user's inventory with default items from ALL_ITEMS
 *
 * This script does two things:
 * 1. Seeds the `iteminventory` collection with all item definitions (if not already present)
 * 2. Adds all items to the specified user's inventory in `userinventory` collection
 *
 * Run with: node seed-user-inventory.js <userId>
 * Example: node seed-user-inventory.js 1234
 */

const mongoose = require('mongoose');
require('dotenv').config();

// ============================================================================
// ITEM DEFINITIONS (from apps/frontend/src/lib/constants/items.ts)
// ============================================================================

const ALL_ITEMS = [
  {
    id: 'Amber',
    image: 'Amber.png',
    title: 'Amber',
    type: 'craft',
    amount: 1,
    price: 100,
    description: 'Some description',
    rarity: 'common',
  },
  {
    id: 'AstralAlloy',
    image: 'AstralAlloy.png',
    title: 'Astral Alloy',
    type: 'craft',
    amount: 1,
    price: 100,
    description: 'Some description',
    rarity: 'common',
  },
  {
    id: 'BlackOrb',
    image: 'BlackOrb.png',
    title: 'Black Orb',
    type: 'craft',
    amount: 1,
    price: 100,
    description: 'Some description',
    rarity: 'common',
  },
  {
    id: 'ChainLink',
    image: 'ChainLink.png',
    title: 'Chain Link',
    type: 'craft',
    amount: 1,
    price: 100,
    description: 'Some description',
    rarity: 'common',
  },
  {
    id: 'Crystall',
    image: 'Crystall.png',
    title: 'Crystall',
    type: 'craft',
    amount: 1,
    price: 100,
    description: 'Some description',
    rarity: 'common',
  },
  {
    id: 'Frostdust',
    image: 'Frostdust.png',
    title: 'Frostdust',
    type: 'craft',
    amount: 1,
    price: 100,
    description: 'Some description',
    rarity: 'common',
  },
  {
    id: 'Glowstone',
    image: 'Glowstone.png',
    title: 'Glowstone',
    type: 'craft',
    amount: 1,
    price: 100,
    description: 'Some description',
    rarity: 'common',
  },
  {
    id: 'ManaBark',
    image: 'ManaBark.png',
    title: 'Mana Bark',
    type: 'craft',
    amount: 1,
    price: 100,
    description: 'Some description',
    rarity: 'common',
  },
  {
    id: 'Pearl',
    image: 'Pearl.png',
    title: 'Pearl',
    type: 'craft',
    amount: 1,
    price: 100,
    description: 'Some description',
    rarity: 'common',
  },
  {
    id: 'PhoenixEmber',
    image: 'PhoenixEmber.png',
    title: 'Phoenix Ember',
    type: 'craft',
    amount: 1,
    price: 100,
    description: 'Some description',
    rarity: 'common',
  },
  {
    id: 'ReedSilk',
    image: 'ReedSilk.png',
    title: 'Reed Silk',
    type: 'craft',
    amount: 1,
    price: 100,
    description: 'Some description',
    rarity: 'common',
  },
  {
    id: 'ReinforcedPadding',
    image: 'ReinforcedPadding.png',
    title: 'Reinforced Padding',
    type: 'craft',
    amount: 1,
    price: 100,
    description: 'Some description',
    rarity: 'common',
  },
  {
    id: 'Resin',
    image: 'Resin.png',
    title: 'Resin',
    type: 'craft',
    amount: 1,
    price: 100,
    description: 'Some description',
    rarity: 'common',
  },
  {
    id: 'Rune',
    image: 'Rune.png',
    title: 'Rune',
    type: 'craft',
    amount: 1,
    price: 100,
    description: 'Some description',
    rarity: 'common',
  },
  {
    id: 'SerpentScale',
    image: 'SerpentScale.png',
    title: 'Serpent Scale',
    type: 'craft',
    amount: 1,
    price: 100,
    description: 'Some description',
    rarity: 'common',
  },
  {
    id: 'ShadowstepLeather',
    image: 'ShadowstepLeather.png',
    title: 'Shadowstep Leather',
    type: 'craft',
    amount: 1,
    price: 100,
    description: 'Some description',
    rarity: 'common',
  },
  {
    id: 'ShardofIllusion',
    image: 'ShardofIllusion.png',
    title: 'Shard of Illusion',
    type: 'craft',
    amount: 1,
    price: 100,
    description: 'Some description',
    rarity: 'common',
  },
  {
    id: 'Shell',
    image: 'Shell.png',
    title: 'Shell',
    type: 'craft',
    amount: 1,
    price: 100,
    description: 'Some description',
    rarity: 'common',
  },
  {
    id: 'SilverThread',
    image: 'SilverThread.png',
    title: 'Silver Thread',
    type: 'craft',
    amount: 1,
    price: 100,
    description: 'Some description',
    rarity: 'common',
  },
  {
    id: 'SoulStone1',
    image: 'SoulStone1.png',
    title: 'Soul Stone 1',
    type: 'craft',
    amount: 1,
    price: 100,
    description: 'Some description',
    rarity: 'common',
  },
  {
    id: 'SoulStone2',
    image: 'SoulStone2.png',
    title: 'Soul Stone 2',
    type: 'craft',
    amount: 1,
    price: 100,
    description: 'Some description',
    rarity: 'common',
  },
  {
    id: 'SoulStone3',
    image: 'SoulStone3.png',
    title: 'Soul Stone 3',
    type: 'craft',
    amount: 1,
    price: 100,
    description: 'Some description',
    rarity: 'common',
  },
  {
    id: 'SoulStone4',
    image: 'SoulStone4.png',
    title: 'Soul Stone 4',
    type: 'craft',
    amount: 1,
    price: 100,
    description: 'Some description',
    rarity: 'common',
  },
  {
    id: 'SoulStone5',
    image: 'SoulStone5.png',
    title: 'Soul Stone 5',
    type: 'craft',
    amount: 1,
    price: 100,
    description: 'Some description',
    rarity: 'common',
  },
  {
    id: 'WaterEssence',
    image: 'WaterEssence.png',
    title: 'Water Essence',
    type: 'craft',
    amount: 1,
    price: 100,
    description: 'Some description',
    rarity: 'common',
  },
  {
    id: 'WerewolfFang',
    image: 'WerewolfFang.png',
    title: 'Werewolf Fang',
    type: 'craft',
    amount: 1,
    price: 100,
    description: 'Some description',
    rarity: 'common',
  },
];

const ALL_ARMOR_ITEMS = [
  {
    id: 'MysticRobe',
    image: 'MysticRobe.png',
    title: 'Mystic Robe',
    type: 'armor',
    wearableSlot: 'arms',
    amount: 1,
    price: 500,
    description: 'A powerful robe imbued with ancient magic',
    rarity: 'uncommon',
    level: 5,
    buff: [
      { effect: 'atk', value: 15 },
      { effect: 'hp', value: 50 },
    ],
    improvementRequirements: [
      { itemId: 'Amber', amount: 3 },
      { itemId: 'Glowstone', amount: 2 },
    ],
    wearRequirements: [
      { requirement: 'Level', value: 5 },
      { requirement: 'Intelligence', value: 20 },
    ],
  },
  {
    id: 'ShadowLeggings',
    image: 'ShadowLeggings.png',
    title: 'Shadow Leggings',
    type: 'armor',
    wearableSlot: 'legs',
    amount: 1,
    price: 450,
    description: 'Leggings woven from shadows themselves',
    rarity: 'uncommon',
    level: 4,
    buff: [
      { effect: 'dodge', value: 12 },
      { effect: 'accuracy', value: 8 },
    ],
    improvementRequirements: [
      { itemId: 'ShadowstepLeather', amount: 2 },
      { itemId: 'SilverThread', amount: 4 },
    ],
    wearRequirements: [
      { requirement: 'Level', value: 4 },
      { requirement: 'Dexterity', value: 18 },
    ],
  },
  {
    id: 'AstralBelt',
    image: 'AstralBelt.png',
    title: 'Astral Belt',
    type: 'armor',
    wearableSlot: 'belt',
    amount: 1,
    price: 350,
    description: 'A belt infused with astral energy',
    rarity: 'common',
    level: 3,
    buff: [
      { effect: 'hp', value: 50 },
      { effect: 'accuracy', value: 5 },
    ],
    improvementRequirements: [
      { itemId: 'AstralAlloy', amount: 2 },
      { itemId: 'Crystall', amount: 3 },
    ],
    wearRequirements: [
      { requirement: 'Level', value: 3 },
      { requirement: 'Intelligence', value: 15 },
    ],
  },
];

const ALL_ACCESSORIES = [
  {
    id: 'MoonlightGem',
    image: 'MoonlightGem.png',
    title: 'Moonlight Gem',
    type: 'armor',
    wearableSlot: 'gem',
    amount: 1,
    price: 600,
    description: 'A radiant gem infused with lunar energy',
    rarity: 'uncommon',
    level: 6,
    buff: [
      { effect: 'atk', value: 18 },
      { effect: 'hp', value: 80 },
    ],
    improvementRequirements: [
      { itemId: 'Crystall', amount: 5 },
      { itemId: 'Glowstone', amount: 3 },
    ],
    wearRequirements: [
      { requirement: 'Level', value: 6 },
      { requirement: 'Intelligence', value: 25 },
    ],
  },
  {
    id: 'CrimsonGem',
    image: 'CrimsonGem.png',
    title: 'Crimson Gem',
    type: 'armor',
    wearableSlot: 'gem',
    amount: 1,
    price: 550,
    description: 'A blood-red gem pulsing with raw power',
    rarity: 'uncommon',
    level: 5,
    buff: [
      { effect: 'atk', value: 20 },
      { effect: 'crit', value: 8 },
    ],
    improvementRequirements: [
      { itemId: 'PhoenixEmber', amount: 4 },
      { itemId: 'BlackOrb', amount: 2 },
    ],
    wearRequirements: [
      { requirement: 'Level', value: 5 },
      { requirement: 'Strength', value: 22 },
    ],
  },
  {
    id: 'ShadowRing',
    image: 'ShadowRing.png',
    title: 'Shadow Ring',
    type: 'armor',
    wearableSlot: 'ring',
    amount: 1,
    price: 480,
    description: 'A mysterious ring that bends shadows to your will',
    rarity: 'common',
    level: 4,
    buff: [
      { effect: 'accuracy', value: 15 },
      { effect: 'dodge', value: 12 },
    ],
    improvementRequirements: [
      { itemId: 'ShadowstepLeather', amount: 3 },
      { itemId: 'ShardofIllusion', amount: 2 },
    ],
    wearRequirements: [
      { requirement: 'Level', value: 4 },
      { requirement: 'Dexterity', value: 18 },
    ],
  },
  {
    id: 'RuneRing',
    image: 'RuneRing.png',
    title: 'Rune Ring',
    type: 'armor',
    wearableSlot: 'ring',
    amount: 1,
    price: 520,
    description: 'An ancient ring inscribed with powerful runes',
    rarity: 'uncommon',
    level: 5,
    buff: [
      { effect: 'def', value: 10 },
      { effect: 'hp', value: 40 },
    ],
    improvementRequirements: [
      { itemId: 'Rune', amount: 4 },
      { itemId: 'Amber', amount: 3 },
    ],
    wearRequirements: [
      { requirement: 'Level', value: 5 },
      { requirement: 'Intelligence', value: 20 },
    ],
  },
  {
    id: 'PhoenixNecklace',
    image: 'PhoenixNecklace.png',
    title: 'Phoenix Necklace',
    type: 'armor',
    wearableSlot: 'necklace',
    amount: 1,
    price: 650,
    description: 'A necklace bearing the eternal flame of the phoenix',
    rarity: 'unique',
    level: 7,
    buff: [
      { effect: 'hp', value: 80 },
      { effect: 'def', value: 15 },
      { effect: 'atk', value: 10 },
    ],
    improvementRequirements: [
      { itemId: 'PhoenixEmber', amount: 6 },
      { itemId: 'ReedSilk', amount: 4 },
    ],
    wearRequirements: [
      { requirement: 'Level', value: 7 },
      { requirement: 'Vitality', value: 28 },
    ],
  },
  {
    id: 'FrostNecklace',
    image: 'FrostNecklace.png',
    title: 'Frost Necklace',
    type: 'armor',
    wearableSlot: 'necklace',
    amount: 1,
    price: 580,
    description: 'A chilling necklace forged from eternal ice',
    rarity: 'uncommon',
    level: 6,
    buff: [
      { effect: 'atk', value: 22 },
      { effect: 'accuracy', value: 10 },
    ],
    improvementRequirements: [
      { itemId: 'Frostdust', amount: 5 },
      { itemId: 'WaterEssence', amount: 3 },
    ],
    wearRequirements: [
      { requirement: 'Level', value: 6 },
      { requirement: 'Intelligence', value: 24 },
    ],
  },
  {
    id: 'SerpentNecklace',
    image: 'SerpentNecklace.png',
    title: 'Serpent Necklace',
    type: 'armor',
    wearableSlot: 'necklace',
    amount: 1,
    price: 530,
    description: 'A sinister necklace crafted from serpent scales',
    rarity: 'uncommon',
    level: 5,
    buff: [
      { effect: 'atk', value: 18 },
      { effect: 'def', value: 10 },
    ],
    improvementRequirements: [
      { itemId: 'SerpentScale', amount: 4 },
      { itemId: 'Shell', amount: 3 },
    ],
    wearRequirements: [
      { requirement: 'Level', value: 5 },
      { requirement: 'Dexterity', value: 20 },
    ],
  },
];

// Combine all items
const ALL_ITEM_DEFINITIONS = [
  ...ALL_ITEMS,
  ...ALL_ARMOR_ITEMS,
  ...ALL_ACCESSORIES,
];

// ============================================================================
// MONGOOSE SCHEMAS
// ============================================================================

// Schema for item definitions (iteminventory collection)
const iteminventorychema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // e.g., 'Amber', 'MysticRobe'
    image: { type: String, required: true },
    title: { type: String, required: true },
    type: { type: String, required: true, enum: ['craft', 'armor'] },
    amount: { type: Number, required: true, default: 1 },
    price: { type: Number, required: true },
    description: { type: String },
    rarity: {
      type: String,
      required: true,
      enum: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'unique'],
    },
    // Armor-specific fields (optional)
    wearableSlot: {
      type: String,
      enum: ['gem', 'ring', 'necklace', 'arms', 'legs', 'belt'],
    },
    level: { type: Number },
    buff: [{ effect: String, value: Number }],
    improvementRequirements: [{ itemId: String, amount: Number }],
    wearRequirements: [{ requirement: String, value: Number }],
  },
  { timestamps: true, collection: 'iteminventory' }
);

// Schema for user inventory (userinventory collection)
const userInventorySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    itemId: { type: String, required: true }, // Reference to iteminventory.id
    quantity: { type: Number, required: true, default: 1, min: 1 },
    isEquipped: { type: Boolean, default: false },
    equippedToWizardId: { type: String },
    acquiredAt: { type: Date },
    acquiredFrom: {
      type: String,
      enum: [
        'crafted',
        'loot',
        'drop',
        'trade',
        'reward',
        'purchase',
        'admin-script',
      ],
    },
  },
  { timestamps: true, collection: 'userinventory' }
);

// Compound index for uniqueness
userInventorySchema.index({ userId: 1, itemId: 1 }, { unique: true });

// ============================================================================
// MAIN SCRIPT
// ============================================================================

async function seedItemDefinitions(InventoryItem) {
  console.log(
    '\n📦 STEP 1: Seeding item definitions to iteminventory collection...\n'
  );

  let created = 0;
  let skipped = 0;

  for (const itemDef of ALL_ITEM_DEFINITIONS) {
    try {
      const existing = await InventoryItem.findOne({ id: itemDef.id });
      if (existing) {
        console.log(`   ⏭️  Skipped: ${itemDef.title} (already exists)`);
        skipped++;
      } else {
        await InventoryItem.create(itemDef);
        console.log(`   ✅ Created: ${itemDef.title} (${itemDef.type})`);
        created++;
      }
    } catch (error) {
      console.error(`   ❌ Error creating ${itemDef.title}:`, error.message);
    }
  }

  console.log(`\n   📊 Summary: ${created} created, ${skipped} skipped\n`);
  return created + skipped === ALL_ITEM_DEFINITIONS.length;
}

async function seedUserInventory(UserInventory, userId, itemsToAdd) {
  console.log(
    `\n👤 STEP 2: Adding items to user inventory for userId: ${userId}\n`
  );

  let created = 0;
  let updated = 0;

  for (const itemDef of itemsToAdd) {
    try {
      const existing = await UserInventory.findOne({
        userId,
        itemId: itemDef.id,
      });

      if (existing) {
        // Update quantity
        existing.quantity += itemDef.amount;
        await existing.save();
        console.log(
          `   🔄 Updated: ${itemDef.title} (qty: ${existing.quantity})`
        );
        updated++;
      } else {
        // Create new inventory entry
        await UserInventory.create({
          userId,
          itemId: itemDef.id,
          quantity: itemDef.amount,
          isEquipped: false,
          acquiredAt: new Date(),
          acquiredFrom: 'admin-script',
        });
        console.log(`   ✅ Added: ${itemDef.title} (qty: ${itemDef.amount})`);
        created++;
      }
    } catch (error) {
      console.error(`   ❌ Error adding ${itemDef.title}:`, error.message);
    }
  }

  console.log(`\n   📊 Summary: ${created} added, ${updated} updated\n`);
}

async function main() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    const userId = args[0];

    if (!userId) {
      console.error('❌ Error: userId is required');
      console.log('\nUsage: node seed-user-inventory.js <userId>');
      console.log('Example: node seed-user-inventory.js 1234');
      console.log('\nThis will:');
      console.log('  1. Seed all item definitions to iteminventory collection');
      console.log(
        "  2. Add all items to the user's inventory in userinventory collection"
      );
      process.exit(1);
    }

    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/wizardbattle';
    const dbName = process.env.MONGODB_DB || 'wizardbattle';

    console.log('🔌 Connecting to MongoDB...');
    console.log(`   URI: ${mongoUri}`);
    console.log(`   Database: ${dbName}`);

    await mongoose.connect(mongoUri, { dbName });
    console.log('✅ Connected to MongoDB\n');

    // Get or create models
    const InventoryItem =
      mongoose.models.InventoryItem ||
      mongoose.model('InventoryItem', iteminventorychema);

    const UserInventory =
      mongoose.models.UserInventory ||
      mongoose.model('UserInventory', userInventorySchema);

    // Step 1: Seed item definitions
    await seedItemDefinitions(InventoryItem);

    // Step 2: Add items to user inventory
    await seedUserInventory(UserInventory, userId, ALL_ITEM_DEFINITIONS);

    // Summary
    console.log(
      '═══════════════════════════════════════════════════════════════'
    );
    console.log('✅ DONE!');
    console.log(
      `   User "${userId}" now has ${ALL_ITEM_DEFINITIONS.length} items in inventory`
    );
    console.log('   - Craft items:', ALL_ITEMS.length);
    console.log('   - Armor items:', ALL_ARMOR_ITEMS.length);
    console.log('   - Accessories:', ALL_ACCESSORIES.length);
    console.log(
      '═══════════════════════════════════════════════════════════════'
    );

    // Close connection
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

// Run the script
main();
