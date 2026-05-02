/**
 * For a given user, upsert one `userinventory` row per document in `iteminventory`,
 * each with the same stack size (`quantity`, default 100).
 *
 * Shape (matches UserInventory schema / IUserInventoryRecord):
 *   - userId: string (required)
 *   - itemId: string (required) — same as InventoryItem.id in iteminventory
 *   - quantity: number (required, min 1) — owned stack count; NOT the catalog `amount` field
 *   - isEquipped?: boolean
 *   - equippedToWizardId?: string
 *   - acquiredAt?: Date
 *   - acquiredFrom?: 'crafted' | 'loot' | 'trade' | 'drop' | 'reward' | 'purchase'
 *   - createdAt / updatedAt from { timestamps: true }
 *
 * Run from apps/backend:
 *   pnpm run seed:user-inventory-catalog -- --user-id <walletOrUserId>
 *   pnpm run seed:user-inventory-catalog -- --user-id <id> --quantity 50 --dry-run
 *
 * Env: MONGODB_URI, MONGODB_DB (defaults: mongodb://localhost:27017, wizardbattle)
 *
 * Idempotency: upserts by (userId, itemId). Existing rows get `quantity` set to the
 * requested value; `isEquipped` / `equippedToWizardId` are left unchanged on update.
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const ITEM_INVENTORY = 'iteminventory';
const USER_INVENTORY = 'userinventory';

const DEFAULT_QUANTITY = 100;

type ItemInventoryRow = { id?: unknown };

function parseArgs(argv: string[]): {
  userId: string;
  quantity: number;
  dryRun: boolean;
} {
  let userId = '';
  let quantity = DEFAULT_QUANTITY;
  let dryRun = false;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') dryRun = true;
    else if (a === '--user-id' && argv[i + 1]) userId = argv[++i]!;
    else if (a === '--quantity' && argv[i + 1]) {
      const n = Number(argv[++i]);
      if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) {
        console.error('--quantity must be a positive integer');
        process.exit(1);
      }
      quantity = n;
    } else if (a === '--help') {
      console.log(
        'Usage: pnpm run seed:user-inventory-catalog -- --user-id <id> [options]\n\n' +
          '  --user-id <id>   Required. userId stored on userinventory docs.\n' +
          `  --quantity <n>   Stack per item (default ${DEFAULT_QUANTITY}).\n` +
          '  --dry-run        List item ids only; no writes.\n'
      );
      process.exit(0);
    }
  }
  return { userId, quantity, dryRun };
}

async function main() {
  const { userId, quantity, dryRun } = parseArgs(process.argv);
  if (!userId) {
    console.error('Missing --user-id');
    console.error(
      'Example: pnpm run seed:user-inventory-catalog -- --user-id 0xabc...'
    );
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB || 'wizardbattle';

  await mongoose.connect(uri, { dbName });
  const db = mongoose.connection.db!;

  try {
    const itemsColl = db.collection(ITEM_INVENTORY);
    const rows = (await itemsColl
      .find({})
      .project({ id: 1, _id: 0 })
      .toArray()) as ItemInventoryRow[];

    const itemIds = rows
      .map((r) => r.id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);

    if (itemIds.length === 0) {
      console.error(
        `No items with string "id" found in ${ITEM_INVENTORY}. Import catalog first.`
      );
      process.exit(1);
    }

    console.log(`Database: ${dbName}`);
    console.log(`userId: ${userId}`);
    console.log(`quantity per item: ${quantity}`);
    console.log(`catalog items: ${itemIds.length}`);
    if (dryRun) {
      console.log('\n[dry-run] first 20 ids:', itemIds.slice(0, 20).join(', '));
      return;
    }

    const userColl = db.collection(USER_INVENTORY);
    const now = new Date();
    let upserted = 0;
    let modified = 0;
    let matched = 0;

    for (const itemId of itemIds) {
      const res = await userColl.updateOne(
        { userId, itemId },
        {
          $set: { quantity },
          $setOnInsert: {
            userId,
            itemId,
            acquiredAt: now,
            acquiredFrom: 'reward',
          },
        },
        { upsert: true }
      );
      if (res.upsertedCount) upserted++;
      else if (res.modifiedCount) modified++;
      else matched++;
    }

    console.log(
      `\nDone. upserted: ${upserted}, quantity updated: ${modified}, unchanged: ${matched}`
    );
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
