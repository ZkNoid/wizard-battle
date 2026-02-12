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
    id: 'loc-whisperwood-grove',
    name: 'Whisperwood Grove',
    image: '/locations/forest.png',
    biome: 'forest',
    // Common forest items
    commonRewards: ['Amber', 'Resin', 'ManaBark'],
    // Uncommon forest items
    uncommonRewards: ['ElvenRune', 'PhoenixEmber'],
  },
  {
    id: 'loc-serpentwater-basin',
    name: 'Serpentwater Basin',
    image: '/locations/river.png',
    biome: 'water',
    // Common water items
    commonRewards: ['Pearl', 'ReedSilk', 'Shell'],
    // Uncommon water items
    uncommonRewards: ['SerpentScale', 'WaterEssence'],
  },
  {
    id: 'loc-mount-avalon',
    name: 'Mount Avalon',
    image: '/locations/mountain.png',
    biome: 'mountains',
    // Common mountain items
    commonRewards: ['WerewolfFang', 'Frostdust', 'Glowstone'],
    // Uncommon mountain items
    uncommonRewards: ['InfusedCrystal', 'AstralAlloy'],
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
      console.log(
        `Found ${existingCount} existing locations. Clearing and re-seeding...`
      );
      await locationsCollection.deleteMany({});
    }

    // Insert all locations
    const result = await locationsCollection.insertMany(LOCATIONS);
    console.log(`✅ Successfully seeded ${result.insertedCount} locations`);

    // List seeded locations
    console.log('\nSeeded locations:');
    LOCATIONS.forEach((loc, index) => {
      console.log(`  ${index + 1}. ${loc.name} (${loc.id})`);
      console.log(`     - Biome: ${loc.biome}`);
      console.log(`     - Common rewards: ${loc.commonRewards.join(', ')}`);
      console.log(`     - Uncommon rewards: ${loc.uncommonRewards.join(', ')}`);
    });
    
    console.log('\n📋 Reward rules by expedition duration:');
    console.log('  1 hour:  5 x 10% unique + 1 uncommon + 5 common');
    console.log('  3 hours: 10 x 10% unique + 2 uncommon + 10 common');
    console.log('  24 hours: 20 x 10% unique + 4 uncommon + 20 common');
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
