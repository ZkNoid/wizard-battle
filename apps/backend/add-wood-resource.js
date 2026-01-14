/**
 * Script to add Wood resource to the game-item database
 * Run with: node add-wood-resource.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Define the GameItem schema
const gameItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    rarity: { type: String, required: true },
    origin: { type: String, required: true },
    desc: { type: String, required: true },
    isCraftable: { type: Boolean, required: true, default: false },
  },
  { timestamps: true }
);

async function addWoodResource() {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/wizardbattle';
    const dbName = process.env.MONGODB_DB || 'wizardbattle';
    console.log('🔌 Connecting to MongoDB...');
    console.log('   URI:', mongoUri);
    console.log('   Database:', dbName);
    await mongoose.connect(mongoUri, { dbName });
    console.log('✅ Connected to MongoDB');

    // Get or create the GameItem model
    const GameItem =
      mongoose.models.GameItem || mongoose.model('GameItem', gameItemSchema);

    // Check if Wood already exists
    const existingWood = await GameItem.findOne({ name: 'Wood' });
    if (existingWood) {
      console.log('⚠️  Wood resource already exists in database:');
      console.log('   ID:', existingWood._id);
      console.log('   Name:', existingWood.name);
      console.log('   Rarity:', existingWood.rarity);
      console.log('   Origin:', existingWood.origin);
      console.log('   Description:', existingWood.desc);
      console.log('   Is Craftable:', existingWood.isCraftable);
      await mongoose.connection.close();
      return;
    }

    // Create Wood resource
    const woodResource = new GameItem({
      name: 'Wood',
      rarity: 'common',
      origin: 'nature',
      desc: 'Basic crafting material harvested from trees. Used in various recipes and constructions.',
      isCraftable: false, // Wood is a basic resource, not craftable
    });

    // Save to database
    const savedWood = await woodResource.save();
    console.log('✅ Wood resource added successfully!');
    console.log('   ID:', savedWood._id);
    console.log('   Name:', savedWood.name);
    console.log('   Rarity:', savedWood.rarity);
    console.log('   Origin:', savedWood.origin);
    console.log('   Description:', savedWood.desc);
    console.log('   Is Craftable:', savedWood.isCraftable);

    // Close connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error adding Wood resource:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

// Run the script
addWoodResource();
