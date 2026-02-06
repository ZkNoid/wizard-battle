const mongoose = require('mongoose');

const MONGODB_URI =
  'mongodb://wizardbattle:3usARIkMfjpczaH@db-wizard.zknoid.io:27017/wizardbattle?authSource=wizardbattle';
const userId = 'B62qncsQudgoB7PuNtU9DgGaA4cCGjZF6ukJ37Wx6DamMGpYpJ9o8H2';

async function seedInventory() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const UserInventorySchema = new mongoose.Schema({
      userId: String,
      itemId: String,
      quantity: Number,
      isEquipped: { type: Boolean, default: false },
      acquiredAt: { type: Date, default: Date.now },
    });

    const UserInventory = mongoose.model(
      'UserInventory',
      UserInventorySchema,
      'userinventories'
    );

    // Items to add
    const items = [
      { userId, itemId: 'BlackOrb', quantity: 1 },
      { userId, itemId: 'ElvenRune', quantity: 6 },
      { userId, itemId: 'ManaBark', quantity: 9 },
      { userId, itemId: 'ChainLink', quantity: 9 },
      { userId, itemId: 'Glowstone', quantity: 1 },
      { userId, itemId: 'Amber', quantity: 2 },
      { userId, itemId: 'Resin', quantity: 3 },
    ];

    console.log('\n=== Adding Items to Inventory ===');
    for (const item of items) {
      // Check if item already exists
      const existing = await UserInventory.findOne({
        userId: item.userId,
        itemId: item.itemId,
      });

      if (existing) {
        console.log(
          `${item.itemId}: Already exists (qty: ${existing.quantity})`
        );
      } else {
        await UserInventory.create(item);
        console.log(`${item.itemId}: Added (qty: ${item.quantity})`);
      }
    }

    // Verify
    console.log('\n=== Verifying Inventory ===');
    const allItems = await UserInventory.find({ userId }).lean();
    console.log(`Total items in inventory: ${allItems.length}`);
    allItems.forEach((item) => {
      console.log(`  ${item.itemId}: ${item.quantity}`);
    });

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

seedInventory();
