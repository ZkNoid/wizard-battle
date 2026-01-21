/**
 * Script to add Wood resource to a user's inventory
 * Run with: node add-wood-to-inventory.js <userAddress> [quantity]
 * Example: node add-wood-to-inventory.js 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 1000
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Define schemas
const gameItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    rarity: { type: String, required: true },
    origin: { type: String, required: true },
    desc: { type: String, required: true },
    isCraftable: { type: Boolean, required: true, default: false },
    isResource: { type: Boolean, required: true, default: false },
  },
  { timestamps: true }
);

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

// Compound index
userInventorySchema.index({ userId: 1, itemId: 1 }, { unique: true });

async function addWoodToInventory() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    const userAddress = args[0];
    const quantity = parseInt(args[1]) || 1000;

    if (!userAddress) {
      console.error('❌ Error: User address is required');
      console.log(
        'Usage: node add-wood-to-inventory.js <userAddress> [quantity]'
      );
      console.log(
        'Example: node add-wood-to-inventory.js 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 1000'
      );
      process.exit(1);
    }

    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/wizardbattle';
    const dbName = process.env.MONGODB_DB || 'wizardbattle';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, { dbName });
    console.log('✅ Connected to MongoDB\n');

    // Get or create models
    const GameItem =
      mongoose.models.GameItem || mongoose.model('GameItem', gameItemSchema);
    const UserInventory =
      mongoose.models.UserInventory ||
      mongoose.model('UserInventory', userInventorySchema);

    // Find Wood resource
    const woodResource = await GameItem.findOne({ name: 'Wood' });
    if (!woodResource) {
      console.error('❌ Error: Wood resource not found in database');
      console.log(
        '💡 Tip: Run "node add-wood-resource.js" first to add Wood resource'
      );
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log('📦 Found Wood resource:');
    console.log('   ID:', woodResource._id);
    console.log('   Name:', woodResource.name);
    console.log('   Rarity:', woodResource.rarity);
    console.log('\n👤 User Address:', userAddress);
    console.log('📊 Quantity to add:', quantity, '\n');

    // Check if user already has Wood
    const existingInventory = await UserInventory.findOne({
      userId: userAddress,
      itemId: woodResource._id,
    });

    if (existingInventory) {
      // Update existing inventory
      existingInventory.quantity += quantity;
      await existingInventory.save();
      console.log('✅ Updated existing inventory:');
      console.log(
        '   Previous quantity:',
        existingInventory.quantity - quantity
      );
      console.log('   New quantity:', existingInventory.quantity);
      console.log('   Inventory ID:', existingInventory._id);
    } else {
      // Create new inventory entry
      const newInventory = new UserInventory({
        userId: userAddress,
        itemId: woodResource._id,
        quantity: quantity,
        isEquipped: false,
        acquiredAt: new Date(),
        acquiredFrom: 'admin-script',
      });

      const savedInventory = await newInventory.save();
      console.log('✅ Added Wood to user inventory:');
      console.log('   Inventory ID:', savedInventory._id);
      console.log('   Quantity:', savedInventory.quantity);
      console.log('   Acquired From:', savedInventory.acquiredFrom);
    }

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
addWoodToInventory();
