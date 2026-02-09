/**
 * Script to check user inventory
 * Run with: node check-inventory.js <userAddress>
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function checkInventory() {
  try {
    const args = process.argv.slice(2);
    const userAddress = args[0] || '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

    const mongoUri =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/wizardbattle';
    const dbName = process.env.MONGODB_DB || 'wizardbattle';

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, { dbName });
    console.log('✅ Connected to MongoDB\n');

    // Get the collection directly
    const db = mongoose.connection.db;
    const inventoryCollection = db.collection('userinventory');
    const gameItemsCollection = db.collection('gameitems');

    // Find user's inventory
    console.log(`👤 Checking inventory for user: ${userAddress}\n`);
    const userInventory = await inventoryCollection
      .find({ userId: userAddress })
      .toArray();

    console.log(`📊 Found ${userInventory.length} items in inventory:\n`);

    for (const item of userInventory) {
      console.log('---');
      console.log('Inventory Entry:');
      console.log('  _id:', item._id);
      console.log('  userId:', item.userId);
      console.log('  itemId:', item.itemId);
      console.log('  quantity:', item.quantity);
      console.log('  acquiredFrom:', item.acquiredFrom);
      console.log('  acquiredAt:', item.acquiredAt);

      // Find the actual game item
      const gameItem = await gameItemsCollection.findOne({ _id: item.itemId });
      if (gameItem) {
        console.log('  Item Details:');
        console.log('    name:', gameItem.name);
        console.log('    rarity:', gameItem.rarity);
        console.log('    origin:', gameItem.origin);
      }
      console.log('');
    }

    // Also check all Wood items
    console.log('\n🪵 Checking all Wood resources in database:');
    const woodItems = await gameItemsCollection
      .find({ name: 'Wood' })
      .toArray();
    console.log(`Found ${woodItems.length} Wood resource(s):\n`);

    for (const wood of woodItems) {
      console.log('Wood Resource:');
      console.log('  _id:', wood._id);
      console.log('  name:', wood.name);
      console.log('  rarity:', wood.rarity);
      console.log('  origin:', wood.origin);
      console.log('');
    }

    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

checkInventory();
