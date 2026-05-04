/**
 * Script to add crafting ingredients to a user's inventory for testing
 *
 * This will add all ingredients needed to craft a Sorcerer's Orb Lv. 0:
 * - 1 Black Orb
 * - 1 Elven Rune
 * - 5 Mana Bark
 *
 * Run with: node add-crafting-test-items.js <userId>
 * Example: node add-crafting-test-items.js user123
 */

const mongoose = require('mongoose');
require('dotenv').config();

const userId = process.argv[2];

if (!userId) {
  console.error('❌ Error: userId is required');
  console.log('Usage: node add-crafting-test-items.js <userId>');
  console.log('Example: node add-crafting-test-items.js user123');
  process.exit(1);
}

// Sample ingredients for testing (Sorcerer's Orb Lv. 0)
const TEST_ITEMS = [
  { itemId: 'BlackOrb', quantity: 1 },
  { itemId: 'ElvenRune', quantity: 1 },
  { itemId: 'ManaBark', quantity: 5 },
];

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'wizardbattle';

async function addTestItems() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DB,
    });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const userInventoryCollection = db.collection('userinventory');

    console.log(`👤 Adding test items to user: ${userId}\n`);

    for (const testItem of TEST_ITEMS) {
      const { itemId, quantity } = testItem;

      // Check if user already has this item
      const existingItem = await userInventoryCollection.findOne({
        userId,
        itemId,
      });

      if (existingItem) {
        // Update existing item quantity
        const newQuantity = existingItem.quantity + quantity;
        await userInventoryCollection.updateOne(
          { userId, itemId },
          {
            $set: { quantity: newQuantity },
            $currentDate: { updatedAt: true },
          }
        );
        console.log(
          `✅ Updated ${itemId}: ${existingItem.quantity} → ${newQuantity}`
        );
      } else {
        // Add new item
        await userInventoryCollection.insertOne({
          userId,
          itemId,
          quantity,
          acquiredAt: new Date(),
          acquiredFrom: 'test-script',
          isEquipped: false,
        });
        console.log(`✅ Added ${itemId}: ${quantity}`);
      }
    }

    // Display final inventory
    console.log('\n📦 Final inventory:');
    const finalInventory = await userInventoryCollection
      .find({ userId })
      .toArray();

    finalInventory.forEach((item) => {
      console.log(`  - ${item.itemId}: ${item.quantity}`);
    });

    console.log('\n✅ Test items added successfully!');
    console.log('\n💡 You can now test crafting with:');
    console.log(`   node test-crafting.js ${userId} gem-sorcerer-lv0`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

addTestItems();
