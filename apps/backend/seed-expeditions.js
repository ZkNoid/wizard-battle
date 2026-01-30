/**
 * Script to seed expedition locations in MongoDB
 * 
 * This script seeds the `locations` collection with all location definitions
 * 
 * Run with: node seed-expeditions.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// ============================================================================
// LOCATION DEFINITIONS
// ============================================================================

const LOCATIONS = [
  {
    id: 'loc-serpentwater-basin',
    name: 'Serpentwater Basin',
    image: '/locations/river.png',
    possibleRewards: [
      { itemId: 'Amber', amount: 1 },
      { itemId: 'AstralAlloy', amount: 1 },
      { itemId: 'BlackOrb', amount: 1 },
      { itemId: 'ChainLink', amount: 1 },
      { itemId: 'Crystall', amount: 1 },
      { itemId: 'Frostdust', amount: 1 },
      { itemId: 'Glowstone', amount: 1 },
      { itemId: 'ManaBark', amount: 1 },
    ],
    minRewards: 3,
    maxRewards: 5,
  },
  {
    id: 'loc-mount-avalon',
    name: 'Mount Avalon',
    image: '/locations/mountain.png',
    possibleRewards: [
      { itemId: 'PhoenixEmber', amount: 1 },
      { itemId: 'Rune', amount: 1 },
      { itemId: 'Resin', amount: 1 },
      { itemId: 'ChainLink', amount: 1 },
      { itemId: 'BlackOrb', amount: 1 },
      { itemId: 'AstralAlloy', amount: 1 },
      { itemId: 'Crystall', amount: 1 },
      { itemId: 'Glowstone', amount: 1 },
    ],
    minRewards: 3,
    maxRewards: 5,
  },
  {
    id: 'loc-whisperwood-grove',
    name: 'Whisperwood Grove',
    image: '/locations/forest.png',
    possibleRewards: [
      { itemId: 'ShadowstepLeather', amount: 1 },
      { itemId: 'ReedSilk', amount: 1 },
      { itemId: 'SerpentScale', amount: 1 },
      { itemId: 'ManaBark', amount: 1 },
      { itemId: 'WerewolfFang', amount: 1 },
      { itemId: 'Frostdust', amount: 1 },
      { itemId: 'Amber', amount: 1 },
      { itemId: 'Glowstone', amount: 1 },
    ],
    minRewards: 3,
    maxRewards: 5,
  },
  {
    id: 'loc-blackfin-hollow',
    name: 'Blackfin Hollow',
    image: '/locations/hills.png',
    possibleRewards: [
      { itemId: 'Pearl', amount: 1 },
      { itemId: 'Shell', amount: 1 },
      { itemId: 'BlackOrb', amount: 1 },
      { itemId: 'ChainLink', amount: 1 },
      { itemId: 'AstralAlloy', amount: 1 },
      { itemId: 'SilverThread', amount: 1 },
      { itemId: 'ShardofIllusion', amount: 1 },
      { itemId: 'Crystall', amount: 1 },
    ],
    minRewards: 3,
    maxRewards: 5,
  },
];

// ============================================================================
// MONGODB CONNECTION
// ============================================================================

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'wizardbattle';

async function seedLocations() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DB,
    });
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const locationsCollection = db.collection('locations');

    // Check if locations already exist
    const existingCount = await locationsCollection.countDocuments();
    
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing locations. Clearing and re-seeding...`);
      await locationsCollection.deleteMany({});
    }

    // Insert all locations
    const result = await locationsCollection.insertMany(LOCATIONS);
    console.log(`✅ Successfully seeded ${result.insertedCount} locations`);

    // List seeded locations
    console.log('\nSeeded locations:');
    LOCATIONS.forEach((loc, index) => {
      console.log(`  ${index + 1}. ${loc.name} (${loc.id})`);
      console.log(`     - Possible rewards: ${loc.possibleRewards.length} items`);
      console.log(`     - Rewards range: ${loc.minRewards}-${loc.maxRewards}`);
    });

  } catch (error) {
    console.error('Error seeding locations:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
seedLocations();

