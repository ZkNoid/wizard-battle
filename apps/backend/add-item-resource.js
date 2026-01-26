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
    isResource: { type: Boolean, required: true, default: false },
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

    const woodData = {
      name: 'Wood',
      rarity: 'common',
      origin: 'nature',
      desc: 'Basic crafting material harvested from trees. Used in various recipes and constructions.',
      isCraftable: false, // Wood is a basic resource, not craftable
      isResource: true, // Wood is a basic resource
    };

    let savedWood;
    if (existingWood) {
      console.log('⚠️  Wood resource already exists, updating...');
      savedWood = await GameItem.findOneAndUpdate({ name: 'Wood' }, woodData, {
        new: true,
      });
      console.log('✅ Wood resource updated successfully!');
    } else {
      // Create Wood resource
      const woodResource = new GameItem(woodData);
      savedWood = await woodResource.save();
      console.log('✅ Wood resource added successfully!');
    }

    console.log('   ID:', savedWood._id);
    console.log('   Name:', savedWood.name);
    console.log('   Rarity:', savedWood.rarity);
    console.log('   Origin:', savedWood.origin);
    console.log('   Description:', savedWood.desc);
    console.log('   Is Craftable:', savedWood.isCraftable);
    console.log('   Is Resource:', savedWood.isResource);

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

// each user always has all characters, by default

async function addLegendarySwordItem() {
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

    // Check if LegendarySword already exists
    const existingLegendarySword = await GameItem.findOne({
      name: 'LegendarySword',
    });

    const legendarySwordData = {
      name: 'LegendarySword',
      rarity: 'rare',
      origin: 'loot drop',
      desc: 'A powerful sword forged from rare materials. Highly sought after by adventurers.',
      isCraftable: false, // LegendarySword is craftable
      isResource: false, // LegendarySword is an item, not a basic resource
    };

    let savedLegendarySword;
    if (existingLegendarySword) {
      console.log('⚠️  LegendarySword item already exists, updating...');
      savedLegendarySword = await GameItem.findOneAndUpdate(
        { name: 'LegendarySword' },
        legendarySwordData,
        { new: true }
      );
      console.log('✅ LegendarySword item updated successfully!');
    } else {
      // Create LegendarySword resource
      const legendarySwordItem = new GameItem(legendarySwordData);
      savedLegendarySword = await legendarySwordItem.save();
      console.log('✅ LegendarySword item added successfully!');
    }

    console.log('   ID:', savedLegendarySword._id);
    console.log('   Name:', savedLegendarySword.name);
    console.log('   Rarity:', savedLegendarySword.rarity);
    console.log('   Origin:', savedLegendarySword.origin);
    console.log('   Description:', savedLegendarySword.desc);
    console.log('   Is Craftable:', savedLegendarySword.isCraftable);
    console.log('   Is Resource:', savedLegendarySword.isResource);

    // Close connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error adding LegendarySword item:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

// Run the script sequentially to avoid connection issues
(async () => {
  await addWoodResource();
  await addLegendarySwordItem();
  await mongoose.connection.close();
})();
