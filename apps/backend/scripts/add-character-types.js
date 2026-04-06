/**
 * Script to add character types to the game-character database
 * Run with: node add-character-types.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Define the GameCharacter schema
const gameCharacterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    level: { type: Number, required: true, min: 1, default: 1 },
    userId: { type: String, required: true },
  },
  { timestamps: true }
);

// Index for efficient user queries
gameCharacterSchema.index({ userId: 1 });

async function addCharacter(characterData) {
  const GameCharacter =
    mongoose.models.GameCharacter ||
    mongoose.model('GameCharacter', gameCharacterSchema);

  // Check if character already exists for this user
  const existingCharacter = await GameCharacter.findOne({
    name: characterData.name,
    userId: characterData.userId,
  });

  let savedCharacter;
  if (existingCharacter) {
    console.log(
      `⚠️  ${characterData.name} character already exists, updating...`
    );
    savedCharacter = await GameCharacter.findOneAndUpdate(
      { name: characterData.name, userId: characterData.userId },
      characterData,
      { new: true }
    );
    console.log(`✅ ${characterData.name} character updated successfully!`);
  } else {
    // Create character
    const character = new GameCharacter(characterData);
    savedCharacter = await character.save();
    console.log(`✅ ${characterData.name} character added successfully!`);
  }

  console.log('   ID:', savedCharacter._id);
  console.log('   Name:', savedCharacter.name);
  console.log('   Level:', savedCharacter.level);
  console.log('   User ID:', savedCharacter.userId);

  return savedCharacter;
}

async function addWizardCharacter() {
  try {
    const userAddress = process.env.USER_PUBLIC_KEY;

    if (!userAddress) {
      console.error('❌ Error: User address is required');
      console.log('Set USER_PUBLIC_KEY in .env file');
      process.exit(1);
    }

    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/wizardbattle';
    const dbName = process.env.MONGODB_DB || 'wizardbattle';
    console.log('🔌 Connecting to MongoDB...');
    console.log('   URI:', mongoUri);
    console.log('   Database:', dbName);
    await mongoose.connect(mongoUri, { dbName });
    console.log('✅ Connected to MongoDB');

    const wizardData = {
      name: 'Wizard',
      level: 1,
      userId: userAddress,
    };

    await addCharacter(wizardData);

    // Close connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error adding Wizard character:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

async function addArcherCharacter() {
  try {
    const userAddress = process.env.USER_PUBLIC_KEY;

    if (!userAddress) {
      console.error('❌ Error: User address is required');
      console.log('Set USER_PUBLIC_KEY in .env file');
      process.exit(1);
    }

    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/wizardbattle';
    const dbName = process.env.MONGODB_DB || 'wizardbattle';
    console.log('🔌 Connecting to MongoDB...');
    console.log('   URI:', mongoUri);
    console.log('   Database:', dbName);
    await mongoose.connect(mongoUri, { dbName });
    console.log('✅ Connected to MongoDB');

    const archerData = {
      name: 'Archer',
      level: 1,
      userId: userAddress,
    };

    await addCharacter(archerData);

    // Close connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error adding Archer character:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

async function addDuelistCharacter() {
  try {
    const userAddress = process.env.USER_PUBLIC_KEY;

    if (!userAddress) {
      console.error('❌ Error: User address is required');
      console.log('Set USER_PUBLIC_KEY in .env file');
      process.exit(1);
    }

    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/wizardbattle';
    const dbName = process.env.MONGODB_DB || 'wizardbattle';
    console.log('🔌 Connecting to MongoDB...');
    console.log('   URI:', mongoUri);
    console.log('   Database:', dbName);
    await mongoose.connect(mongoUri, { dbName });
    console.log('✅ Connected to MongoDB');

    const duelistData = {
      name: 'Duelist',
      level: 1,
      userId: userAddress,
    };

    await addCharacter(duelistData);

    // Close connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error adding Duelist character:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

// Run the script sequentially to avoid connection issues
(async () => {
  await addWizardCharacter();
  await addArcherCharacter();
  await addDuelistCharacter();
})();
