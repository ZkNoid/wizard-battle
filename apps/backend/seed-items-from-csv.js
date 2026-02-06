const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const MONGODB_URI =
  'mongodb://wizardbattle:3usARIkMfjpczaH@db-wizard.zknoid.io:27017/wizardbattle?authSource=wizardbattle';

// Define schema matching the existing structure
const ItemInventorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    image: String,
    title: String,
    type: String,
    amount: Number,
    price: Number,
    description: String,
    rarity: String,
    wearableSlot: String,
    buff: [String],
    improvementRequirements: [String],
    wearRequirements: [String],
  },
  { timestamps: true }
);

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim());

  // Skip header
  const dataLines = lines.slice(1);

  const items = [];

  for (const line of dataLines) {
    const parts = line.split(';');

    // Skip empty lines or lines with empty title
    if (parts.length < 6 || !parts[0].trim()) continue;

    const title = parts[0].trim();
    const type = parts[1]?.trim().toLowerCase() || 'craft';
    const price = parseInt(parts[2]?.trim()) || 100;
    const description = parts[3]?.trim() || 'Some description';
    const rarity = parts[4]?.trim().toLowerCase() || 'common';
    const wearableSlot = parts[5]?.trim() || '';
    const buff = parts[6]?.trim() || '';
    const improvementRequirements = parts[7]?.trim() || '';
    const wearRequirements = parts[8]?.trim() || '';

    // Generate ID from title (remove spaces and special chars)
    const id = title
      .replace(/\s+lvl\s+/gi, 'Lv')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '');

    // Generate image name
    const image = `${id}.png`;

    // Parse arrays
    const buffArray = buff ? [buff] : [];
    const improvementReqArray = improvementRequirements
      ? [improvementRequirements]
      : [];
    const wearReqArray = wearRequirements ? [wearRequirements] : [];

    items.push({
      id,
      image,
      title,
      type,
      amount: 1,
      price,
      description,
      rarity,
      wearableSlot: wearableSlot || undefined,
      buff: buffArray,
      improvementRequirements: improvementReqArray,
      wearRequirements: wearReqArray,
    });
  }

  return items;
}

async function seedItems() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const ItemInventory = mongoose.model(
      'ItemInventory',
      ItemInventorySchema,
      'inventoryitems'
    );

    // Parse CSV
    const csvPath = 'files/Wizard_Battle_items_all.csv';
    console.log(`\nParsing CSV from: ${csvPath}`);

    const items = parseCSV(csvPath);
    console.log(`Parsed ${items.length} items from CSV\n`);

    // Insert items
    let addedCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    console.log('=== Processing Items ===');
    for (const item of items) {
      try {
        const existing = await ItemInventory.findOne({ id: item.id });

        if (existing) {
          // Update existing item
          await ItemInventory.updateOne({ id: item.id }, { $set: item });
          console.log(`✓ Updated: ${item.title} (${item.id})`);
          updatedCount++;
        } else {
          // Insert new item
          await ItemInventory.create(item);
          console.log(`+ Added: ${item.title} (${item.id})`);
          addedCount++;
        }
      } catch (error) {
        console.error(`✗ Error processing ${item.title}:`, error.message);
        skippedCount++;
      }
    }

    console.log('\n=== Summary ===');
    console.log(`Added: ${addedCount}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Skipped/Errors: ${skippedCount}`);
    console.log(`Total in CSV: ${items.length}`);

    // Verify total count in database
    const totalInDb = await ItemInventory.countDocuments();
    console.log(`Total in database: ${totalInDb}`);

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

seedItems();
