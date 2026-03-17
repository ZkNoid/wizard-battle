/**
 * Direct test of hasItem method
 */

const mongoose = require('mongoose');
require('dotenv').config();

const userInventorySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GameItem',
      required: true,
    },
    quantity: { type: Number, required: true, default: 1, min: 1 },
    isEquipped: { type: Boolean, default: false },
    acquiredAt: { type: Date },
    acquiredFrom: { type: String },
  },
  { timestamps: true }
);

async function testHasItem() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB;

    await mongoose.connect(mongoUri, { dbName });
    console.log('✅ Connected to MongoDB\n');

    const UserInventory =
      mongoose.models.UserInventory ||
      mongoose.model('UserInventory', userInventorySchema);

    const userId = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
    const itemId = '69676576528d7c081db716ff'; // The Wood resource ID as string

    console.log('Testing hasItem method:');
    console.log('  userId:', userId);
    console.log('  itemId:', itemId);
    console.log('  itemId type:', typeof itemId);
    console.log('');

    // Try finding with string ID
    console.log('🔍 Finding with string ID...');
    const item1 = await UserInventory.findOne({ userId, itemId });
    console.log('Result:', item1 ? 'FOUND ✅' : 'NOT FOUND ❌');
    if (item1) {
      console.log('  item1.itemId:', item1.itemId);
      console.log('  item1.itemId type:', typeof item1.itemId);
    }
    console.log('');

    // Try finding with ObjectId
    console.log('🔍 Finding with ObjectId...');
    const item2 = await UserInventory.findOne({
      userId,
      itemId: new mongoose.Types.ObjectId(itemId),
    });
    console.log('Result:', item2 ? 'FOUND ✅' : 'NOT FOUND ❌');
    console.log('');

    // Check what's actually in the database
    console.log('🔍 Finding any entry for this user...');
    const allItems = await UserInventory.find({ userId });
    console.log(`Found ${allItems.length} items for this user`);
    for (const item of allItems) {
      console.log('  itemId in DB:', item.itemId);
      console.log('  itemId toString():', item.itemId.toString());
      console.log(
        '  Match with our string?:',
        item.itemId.toString() === itemId
      );
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

testHasItem();
