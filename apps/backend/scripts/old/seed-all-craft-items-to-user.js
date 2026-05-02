/**
 * Script to add ALL crafting items from iteminventory to a user's inventory
 *
 * This script fetches all items with type='craft' from the iteminventory collection
 * and adds 100 of each to the specified user's inventory in the userinventory collection.
 *
 * Run with: node seed-all-craft-items-to-user.js <userId>
 * Example: node seed-all-craft-items-to-user.js B62qoAbHx4QsGXrzy1mbEDzbwi87zKKPRdVxLmm3UnMHX8huJtxrEC8
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'wizardbattle';

async function seedAllCraftItemsToUser() {
  const userId = process.argv[2];

  if (!userId) {
    console.error('❌ Error: userId is required');
    console.log('\nUsage: node seed-all-craft-items-to-user.js <userId>');
    console.log(
      'Example: node seed-all-craft-items-to-user.js B62qoAbHx4QsGXrzy1mbEDzbwi87zKKPRdVxLmm3UnMHX8huJtxrEC8'
    );
    console.log('\nThis script will:');
    console.log(
      "  1. Fetch all items with type='craft' from iteminventory collection"
    );
    console.log("  2. Add 100 of each craft item to the user's inventory");
    process.exit(1);
  }

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
    const userInventoryCollection = db.collection('userinventory');

    // Step 1: Fetch all craft items from iteminventory
    console.log("📦 Fetching all craft items from iteminventory (type='craft')...\n");
    const craftItems = await itemInventoryCollection
      .find({ type: 'craft' })
      .toArray();

    if (craftItems.length === 0) {
      console.log('⚠️  No craft items found in iteminventory collection');
      console.log('   Make sure to run seed-craft-items.js first');
      process.exit(0);
    }

    console.log(`   Found ${craftItems.length} craft items\n`);

    // Step 2: Add each craft item to the user's inventory
    console.log(`👤 Adding craft items to user: ${userId}\n`);

    let created = 0;
    let updated = 0;

    const QUANTITY_TO_ADD = 100;

    for (const craftItem of craftItems) {
      const { id: itemId, title } = craftItem;
      const amount = QUANTITY_TO_ADD;

      // Check if user already has this item
      const existingItem = await userInventoryCollection.findOne({
        userId,
        itemId,
      });

      if (existingItem) {
        // Update existing item quantity
        const newQuantity = existingItem.quantity + amount;
        await userInventoryCollection.updateOne(
          { userId, itemId },
          {
            $set: { quantity: newQuantity },
            $currentDate: { updatedAt: true },
          }
        );
        console.log(
          `   🔄 Updated: ${title} (${existingItem.quantity} → ${newQuantity})`
        );
        updated++;
      } else {
        // Add new item to user inventory
        await userInventoryCollection.insertOne({
          userId,
          itemId,
          quantity: amount,
          isEquipped: false,
          acquiredAt: new Date(),
          acquiredFrom: 'admin-script',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`   ✅ Added: ${title} (qty: ${amount})`);
        created++;
      }
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ DONE!');
    console.log(`   📊 Summary: ${created} added, ${updated} updated`);
    console.log(`   👤 User "${userId}" now has ${craftItems.length} craft items`);
    console.log('═══════════════════════════════════════════════════════════════');

    // Display final craft inventory
    console.log('\n📦 Final craft items in user inventory:');
    const finalInventory = await userInventoryCollection
      .find({ userId })
      .toArray();

    // Filter to show only craft items by checking against our craftItems list
    const craftItemIds = new Set(craftItems.map((item) => item.id));
    const craftInventory = finalInventory.filter((item) =>
      craftItemIds.has(item.itemId)
    );

    craftInventory.forEach((item) => {
      console.log(`   - ${item.itemId}: ${item.quantity}`);
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
seedAllCraftItemsToUser();

