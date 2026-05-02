import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';
import 'dotenv/config';

const { EJSON } = mongoose.mongo.BSON;

const COLLECTION = 'craftrecipes';
const ITEM_INVENTORY_COLLECTION = 'iteminventory';

const BUSINESS_FIELDS = [
  'title',
  'description',
  'image',
  'craftingType',
  'category',
  'resultItemId',
  'ingredients',
] as const;

interface CraftRecipeIngredientRow {
  itemId: string;
  requiredAmount: number;
}

interface CraftRecipeImportDoc {
  id: string;
  title: string;
  description: string;
  image: string;
  craftingType: string;
  category: string;
  resultItemId: string;
  ingredients: CraftRecipeIngredientRow[];
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'wizardbattle';

interface CliArgs {
  file: string;
  dryRun: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    file: '',
    dryRun: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--file' && argv[i + 1]) {
      args.file = argv[++i]!;
    }
  }
  if (!args.file) {
    args.file = path.join(
      __dirname,
      '../../data/wizardbattle.craftrecipes1.json'
    );
  }
  if (!path.isAbsolute(args.file)) {
    args.file = path.resolve(process.cwd(), args.file);
  }
  return args;
}

function pickBusinessFields(
  raw: Record<string, unknown>
): CraftRecipeImportDoc {
  if (!raw || typeof raw.id !== 'string' || !raw.id.length) {
    throw new Error('Recipe missing string `id`');
  }
  const out: Partial<CraftRecipeImportDoc> & { id: string } = { id: raw.id };
  for (const key of BUSINESS_FIELDS) {
    if (raw[key as string] !== undefined) {
      (out as Record<string, unknown>)[key] = raw[key as string];
    }
  }
  return out as CraftRecipeImportDoc;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

/**
 * One row per business `id`: later rows in the file win. Removes redundant
 * bulk ops so duplicate ids in an export cannot cause confusion.
 */
function dedupeRecipesById(
  recipes: CraftRecipeImportDoc[]
): CraftRecipeImportDoc[] {
  const byId = new Map<string, CraftRecipeImportDoc>();
  let dupCount = 0;
  for (const r of recipes) {
    if (byId.has(r.id)) dupCount += 1;
    byId.set(r.id, r);
  }
  if (dupCount > 0) {
    console.warn(
      `⚠️  Source had ${dupCount} duplicate id row(s); kept last occurrence per id.`
    );
  }
  return [...byId.values()];
}

function collectReferencedItemIds(
  recipes: CraftRecipeImportDoc[]
): Set<string> {
  const ids = new Set<string>();
  for (const r of recipes) {
    if (typeof r.resultItemId === 'string' && r.resultItemId.length) {
      ids.add(r.resultItemId);
    }
    const ingredients = Array.isArray(r.ingredients) ? r.ingredients : [];
    for (const ing of ingredients) {
      if (ing && typeof ing.itemId === 'string' && ing.itemId.length) {
        ids.add(ing.itemId);
      }
    }
  }
  return ids;
}

/**
 * Ensures every `resultItemId` and ingredient `itemId` exists in `iteminventory`
 * (field `id`). Throws with missing ids and example recipe ids if not.
 */
async function assertRecipeItemsExistInInventory(
  db: mongoose.mongo.Db,
  recipes: CraftRecipeImportDoc[]
): Promise<void> {
  const referenced = collectReferencedItemIds(recipes);
  if (referenced.size === 0) {
    throw new Error(
      'No item ids referenced (empty resultItemId / ingredients across recipes)'
    );
  }

  const itemColl = db.collection(ITEM_INVENTORY_COLLECTION);
  const existing = new Set<string>();
  const refList = [...referenced];

  for (const batch of chunk(refList, 1000)) {
    const rows = await itemColl
      .find({ id: { $in: batch } })
      .project({ id: 1 })
      .toArray();
    for (const row of rows) {
      if (row && typeof row.id === 'string') {
        existing.add(row.id);
      }
    }
  }

  const missing = refList.filter((id) => !existing.has(id));
  if (missing.length === 0) {
    return;
  }

  const recipeUsing = new Map<string, string[]>();
  for (const mid of missing) {
    recipeUsing.set(mid, []);
  }
  for (const r of recipes) {
    if (r.resultItemId && recipeUsing.has(r.resultItemId)) {
      recipeUsing.get(r.resultItemId)!.push(`${r.id} (result)`);
    }
    for (const ing of r.ingredients || []) {
      if (ing?.itemId && recipeUsing.has(ing.itemId)) {
        recipeUsing.get(ing.itemId)!.push(`${r.id} (ingredient)`);
      }
    }
  }

  const lines = missing.slice(0, 40).map((id) => {
    const refs = recipeUsing.get(id)?.slice(0, 5).join(', ') ?? '';
    const more = (recipeUsing.get(id)?.length ?? 0) > 5 ? '…' : '';
    return `  - "${id}" ← ${refs}${more}`;
  });
  const tail =
    missing.length > 40
      ? `\n  … and ${missing.length - 40} more missing id(s)`
      : '';

  throw new Error(
    `${missing.length} item id(s) from recipes are not in iteminventory:\n${lines.join('\n')}${tail}\n` +
      'Seed or import items first (e.g. import-inventory-items-from-xlsx).'
  );
}

/**
 * Import craft recipes from a MongoDB export JSON file into `craftrecipes`.
 *
 * **Idempotent:** each recipe is `updateOne` + `upsert` on unique business key
 * `id` (same as schema `@Prop({ unique: true })`). Re-running the script updates
 * existing documents and does not insert a second row for the same `id`.
 * `_id` is never copied from the file.
 *
 * - Parses Extended JSON ($oid, $date, etc.) via mongoose.mongo.BSON.EJSON
 * - Omits system fields from the file: _id, createdAt, updatedAt, __v
 * - Upserts by business key `id`; preserves createdAt on existing docs
 * - Validates `resultItemId` and every ingredient `itemId` against
 *   `iteminventory.id`; aborts with an error if any are missing (no writes)
 *
 * Run from `apps/backend`:
 *   npx ts-node src/scripts/import-craft-recipes-from-json.ts
 *   npx ts-node src/scripts/import-craft-recipes-from-json.ts --file data/wizardbattle.craftrecipes1.json
 *   npx ts-node src/scripts/import-craft-recipes-from-json.ts --dry-run
 *
 * Env: MONGODB_URI, MONGODB_DB
 */
async function main(): Promise<void> {
  const { file, dryRun } = parseArgs(process.argv);

  if (!fs.existsSync(file)) {
    console.error(`File not found: ${file}`);
    process.exit(1);
  }

  const text = fs.readFileSync(file, 'utf8');
  const parsed = EJSON.parse(text) as unknown;
  if (!Array.isArray(parsed)) {
    console.error('Expected JSON root to be an array of recipes');
    process.exit(1);
  }

  const recipes: CraftRecipeImportDoc[] = [];
  for (let i = 0; i < parsed.length; i++) {
    try {
      const row = parsed[i] as Record<string, unknown>;
      recipes.push(pickBusinessFields(row));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`Row ${i}: ${msg}`);
      process.exit(1);
    }
  }

  const uniqueRecipes = dedupeRecipesById(recipes);

  console.log(`📄 ${file}`);
  console.log(
    `   Recipes: ${recipes.length} (${uniqueRecipes.length} unique id)`
  );

  console.log('🔌 Connecting to MongoDB...');
  console.log(`   URI: ${MONGODB_URI}`);
  console.log(`   Database: ${MONGODB_DB}`);

  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB });
  const db = mongoose.connection.db!;

  try {
    const referenced = collectReferencedItemIds(uniqueRecipes);
    console.log(
      `   Referenced item ids (result + ingredients): ${referenced.size}`
    );
    await assertRecipeItemsExistInInventory(db, uniqueRecipes);
    console.log(
      `   ✓ All referenced ids exist in ${ITEM_INVENTORY_COLLECTION}`
    );

    if (dryRun) {
      console.log('🔸 Dry run — no craft recipe writes.');
      return;
    }

    const coll = db.collection(COLLECTION);

    const now = new Date();
    const bulkOps = uniqueRecipes.map((doc) => {
      const { id, ...rest } = doc;
      return {
        updateOne: {
          filter: { id },
          update: {
            // Include `id` in $set so upsert inserts always materialize `id`
            // explicitly (idempotent re-runs only touch this document).
            $set: { id, ...rest, updatedAt: now },
            $setOnInsert: { createdAt: now },
          },
          upsert: true,
        },
      };
    });

    let matched = 0;
    let modified = 0;
    let upserted = 0;

    for (const batch of chunk(bulkOps, 500)) {
      const res = await coll.bulkWrite(batch, { ordered: false });
      matched += res.matchedCount;
      modified += res.modifiedCount;
      upserted += res.upsertedCount;
    }

    console.log('✅ Import finished');
    console.log(
      `   matched: ${matched}, modified: ${modified}, upserted: ${upserted}`
    );
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  }
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
