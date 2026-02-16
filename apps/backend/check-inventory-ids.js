const mongoose = require('mongoose');

const MONGODB_URI =
  'mongodb://wizardbattle:3usARIkMfjpczaH@db-wizard.zknoid.io:27017/wizardbattle?authSource=wizardbattle';
const userId = 'B62qncsQudgoB7PuNtU9DgGaA4cCGjZF6ukJ37Wx6DamMGpYpJ9o8H2';

async function checkInventory() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const UserInventory = mongoose.model(
      'UserInventory',
      new mongoose.Schema({
        userId: String,
        itemId: String,
        quantity: Number,
      }),
      'userinventory'
    );

    const items = await UserInventory.find({ userId }).lean();

    console.log(`\n=== User Inventory Items (${items.length} total) ===`);
    items.forEach((item) => {
      console.log(
        `itemId: "${item.itemId}" | quantity: ${item.quantity} | type: ${typeof item.itemId}`
      );
    });

    // Check if the specific items exist
    console.log('\n=== Checking Required Items ===');
    const requiredItems = ['BlackOrb', 'ElvenRune', 'ManaBark'];
    for (const itemId of requiredItems) {
      const found = items.find((i) => i.itemId === itemId);
      console.log(
        `${itemId}: ${found ? `FOUND (qty: ${found.quantity})` : 'NOT FOUND'}`
      );
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkInventory();
