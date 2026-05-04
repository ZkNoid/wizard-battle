/**
 * Seed expedition locations, per-location drop tables (gameitemdrops), and
 * GameItem rarity pools used by DropService.generateLoot.
 *
 * Run from apps/backend:
 *   pnpm run seed:location-db
 *   pnpm run seed:location-db -- --dry-run
 *
 * Before any write, all item ids used in ITEMS and in location reward lists are
 * checked against the `inventoryitems` collection (`id` field). Import items
 * first (e.g. import:inventory-xlsx) if the script aborts with missing ids.
 *
 * Env: MONGODB_URI, MONGODB_DB (defaults: mongodb://localhost:27017, wizardbattle)
 */

import 'dotenv/config';
import mongoose from 'mongoose';

// ─── Item catalog (GameItem + reference for locations) ───────────────────────

type ItemBiome = 'forest' | 'water' | 'mountains';
type ItemOrigin = ItemBiome | 'arcane';

type ItemRow = {
  /** Matches InventoryItem.id / location reward strings */
  id: string;
  rarity: 'unique' | 'uncommon' | 'common';
  origin: ItemOrigin;
  description: string;
  isCraftable: boolean;
  isResource: boolean;
};

const ITEMS: ItemRow[] = [
  {
    id: 'BlackOrb',
    rarity: 'unique',
    origin: 'arcane',
    description:
      'A dense sphere of condensed arcane energy. Pulses with unstable power used to craft the rarest and most dangerous artifacts.',
    isCraftable: true,
    isResource: false,
  },
  {
    id: 'ShardofIllusion',
    rarity: 'unique',
    origin: 'arcane',
    description:
      'A fractured piece of reality. Light bends unnaturally around it, making truth difficult to distinguish from deception.',
    isCraftable: true,
    isResource: false,
  },
  {
    id: 'SilverThread',
    rarity: 'unique',
    origin: 'arcane',
    description:
      'An enchanted filament woven by master spell-smiths. Exceptionally strong and highly receptive to magic.',
    isCraftable: true,
    isResource: false,
  },
  {
    id: 'ChainLink',
    rarity: 'unique',
    origin: 'arcane',
    description:
      'A reinforced metal link forged to withstand immense force. Often used in advanced armor and binding enchantments.',
    isCraftable: true,
    isResource: false,
  },
  {
    id: 'ReinforcedPadding',
    rarity: 'unique',
    origin: 'arcane',
    description:
      'Layered protective material treated with alchemical resins. Absorbs impact while remaining light and flexible.',
    isCraftable: true,
    isResource: false,
  },
  {
    id: 'ShadowstepLeather',
    rarity: 'unique',
    origin: 'arcane',
    description:
      'Leather cured in perpetual darkness. Grants unnatural silence and agility to those who wear it.',
    isCraftable: true,
    isResource: false,
  },
  {
    id: 'Amber',
    rarity: 'common',
    origin: 'forest',
    description: 'Hardened tree resin. Commonly used in enchantments.',
    isCraftable: false,
    isResource: true,
  },
  {
    id: 'Resin',
    rarity: 'common',
    origin: 'forest',
    description:
      'Sticky alchemical substance used to bind components together during crafting.',
    isCraftable: false,
    isResource: true,
  },
  {
    id: 'ManaBark',
    rarity: 'common',
    origin: 'forest',
    description: 'Bark harvested from mana-trees. A basic magical reagent.',
    isCraftable: false,
    isResource: true,
  },
  {
    id: 'ElvenRune',
    rarity: 'uncommon',
    origin: 'forest',
    description:
      'A living symbol carved by ancient elves. Enhances magical stability and precision in crafted items.',
    isCraftable: false,
    isResource: true,
  },
  {
    id: 'PhoenixEmber',
    rarity: 'uncommon',
    origin: 'forest',
    description:
      'A smoldering fragment from a reborn phoenix. Carries residual heat and regenerative properties.',
    isCraftable: false,
    isResource: true,
  },
  {
    id: 'Pearl',
    rarity: 'common',
    origin: 'water',
    description: 'Naturally occurring gemstone. Enhances enchantment clarity.',
    isCraftable: false,
    isResource: true,
  },
  {
    id: 'ReedSilk',
    rarity: 'common',
    origin: 'water',
    description: 'Fine fabric spun from reeds. Lightweight and durable.',
    isCraftable: false,
    isResource: true,
  },
  {
    id: 'Shell',
    rarity: 'common',
    origin: 'water',
    description: 'Hardened natural armor from creatures of the sea.',
    isCraftable: false,
    isResource: true,
  },
  {
    id: 'SerpentScale',
    rarity: 'uncommon',
    origin: 'water',
    description:
      'A hardened scale from a great serpent. Naturally resistant to magic and physical damage.',
    isCraftable: false,
    isResource: true,
  },
  {
    id: 'WaterEssence',
    rarity: 'uncommon',
    origin: 'water',
    description:
      'A vial of purified elemental water. Used to stabilize volatile enchantments.',
    isCraftable: false,
    isResource: true,
  },
  {
    id: 'WerewolfFang',
    rarity: 'common',
    origin: 'mountains',
    description:
      'A sharp fang imbued with feral energy. Often used in crafting.',
    isCraftable: false,
    isResource: true,
  },
  {
    id: 'Frostdust',
    rarity: 'common',
    origin: 'mountains',
    description:
      'Crystallized ice essence that radiates cold. Used in enchantments.',
    isCraftable: false,
    isResource: true,
  },
  {
    id: 'Glowstone',
    rarity: 'common',
    origin: 'mountains',
    description:
      'A softly luminescent stone used as a basic magical power source.',
    isCraftable: false,
    isResource: true,
  },
  {
    id: 'InfusedCrystal',
    rarity: 'uncommon',
    origin: 'mountains',
    description:
      'A crystal saturated with arcane energy. Acts as a catalyst in advanced spellcraft.',
    isCraftable: false,
    isResource: true,
  },
  {
    id: 'AstralAlloy',
    rarity: 'uncommon',
    origin: 'mountains',
    description:
      'A rare metal forged under celestial alignment. Highly conductive to cosmic and arcane forces.',
    isCraftable: false,
    isResource: true,
  },
];

// ─── Locations (expedition `locations` collection) ───────────────────────────

type LocationDoc = {
  id: string;
  name: string;
  image: string;
  biome: ItemBiome;
  commonRewards: string[];
  uncommonRewards: string[];
};

const LOCATIONS: LocationDoc[] = [
  {
    id: 'loc-mount-avalon',
    name: 'Mount Avalon',
    image: '/locations/mountain.png',
    biome: 'mountains',
    commonRewards: ['WerewolfFang', 'Frostdust', 'Glowstone'],
    uncommonRewards: ['InfusedCrystal', 'AstralAlloy'],
  },
  {
    id: 'loc-whisperwood-grove',
    name: 'Whisperwood Grove',
    image: '/locations/forest.png',
    biome: 'forest',
    commonRewards: ['Amber', 'Resin', 'ManaBark'],
    uncommonRewards: ['ElvenRune', 'PhoenixEmber'],
  },
  {
    id: 'loc-serpentwater-basin',
    name: 'Serpentwater Basin',
    image: '/locations/river.png',
    biome: 'water',
    commonRewards: ['Pearl', 'ReedSilk', 'Shell'],
    uncommonRewards: ['SerpentScale', 'WaterEssence'],
  },
];

/**
 * Labels used by game-item drop API / loot (see game-item-drop.schema example).
 * Same drop math for all three; biome-specific outcomes rely on GameItem.origin
 * if you extend DropService to filter by expedition biome.
 */
const LOCATION_DROP_LABELS = [
  'Mount Avalon',
  'Whisperwood Grove',
  'Serpentwater Basin',
] as const;

/** 1h / 3h / 8h — unique 10% rolls + uncommon count + common count */
const DROP_DURATION_PRESETS: Array<{
  durationHours: number;
  uniqueRolls: number;
  uniqueChance: number;
  uncommonRolls: number;
  uncommonChance: number;
  commonRolls: number;
  commonChance: number;
}> = [
  {
    durationHours: 1,
    uniqueRolls: 5,
    uniqueChance: 10,
    uncommonRolls: 1,
    uncommonChance: 100,
    commonRolls: 5,
    commonChance: 100,
  },
  {
    durationHours: 3,
    uniqueRolls: 10,
    uniqueChance: 10,
    uncommonRolls: 2,
    uncommonChance: 100,
    commonRolls: 10,
    commonChance: 100,
  },
  {
    durationHours: 8,
    uniqueRolls: 20,
    uniqueChance: 10,
    uncommonRolls: 4,
    uncommonChance: 100,
    commonRolls: 20,
    commonChance: 100,
  },
];

function buildDropDoc(locationName: string) {
  return {
    locationName,
    durations: DROP_DURATION_PRESETS.map((p) => ({
      durationHours: p.durationHours,
      dropGroups: [
        {
          type: 'chance-rolls',
          rollsCount: p.uniqueRolls,
          chancePercent: p.uniqueChance,
          rarity: 'unique',
        },
        {
          type: 'chance-rolls',
          rollsCount: p.uncommonRolls,
          chancePercent: p.uncommonChance,
          rarity: 'uncommon',
        },
        {
          type: 'chance-rolls',
          rollsCount: p.commonRolls,
          chancePercent: p.commonChance,
          rarity: 'common',
        },
      ],
    })),
  };
}

/** Every `id` that must exist in `inventoryitems` before we seed. */
function collectRequiredInventoryIds(): string[] {
  const set = new Set<string>();
  for (const row of ITEMS) set.add(row.id);
  for (const loc of LOCATIONS) {
    for (const id of loc.commonRewards) set.add(id);
    for (const id of loc.uncommonRewards) set.add(id);
  }
  return [...set].sort();
}

/**
 * Ensures each required id exists in MongoDB `inventoryitems` (Nest InventoryItem model).
 */
async function assertInventoryItemsExist(
  db: mongoose.mongo.Db,
  requiredIds: string[]
): Promise<void> {
  if (requiredIds.length === 0) return;

  const coll = db.collection('iteminventory');
  const found = await coll
    .find({ id: { $in: requiredIds } }, { projection: { _id: 0, id: 1 } })
    .toArray();
  const foundSet = new Set(found.map((d) => d.id as string));
  const missing = requiredIds.filter((id) => !foundSet.has(id));

  if (missing.length > 0) {
    throw new Error(
      `Missing inventoryitems for id(s): ${missing.join(', ')}\n` +
        `Found ${foundSet.size} / ${requiredIds.length} required definitions. ` +
        `Run inventory import (e.g. pnpm run import:inventory-xlsx) or add rows, then retry.`
    );
  }
  console.log(
    `✅ inventoryitems: verified ${requiredIds.length} id(s) exist in catalog`
  );
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function parseArgs(argv: string[]): { dryRun: boolean } {
  let dryRun = false;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--dry-run') dryRun = true;
    if (argv[i] === '--help') {
      console.log(
        'Usage: pnpm run seed:location-db [-- --dry-run]\n\n' +
          '  --dry-run  Connect, verify inventoryitems ids, print plan; no writes\n'
      );
      process.exit(0);
    }
  }
  return { dryRun };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { dryRun } = parseArgs(process.argv);

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB || 'wizardbattle';
  const requiredIds = collectRequiredInventoryIds();

  console.log(`Database: ${dbName}`);
  console.log(`Dry run: ${dryRun}`);

  await mongoose.connect(uri, { dbName });
  const db = mongoose.connection.db!;

  try {
    await assertInventoryItemsExist(db, requiredIds);

    if (dryRun) {
      console.log('\nWould upsert', ITEMS.length, 'gameitems');
      console.log('Would replace', LOCATIONS.length, 'locations (by id)');
      console.log(
        'Would replace',
        LOCATION_DROP_LABELS.length,
        'gameitemdrops (by locationName)'
      );
      return;
    }

    const locIds = LOCATIONS.map((l) => l.id);
    await db.collection('locations').deleteMany({ id: { $in: locIds } });
    await db.collection('locations').insertMany(LOCATIONS);
    console.log(`✅ locations: inserted ${LOCATIONS.length} docs`);

    const dropLabels = [...LOCATION_DROP_LABELS];
    await db.collection('gameitemdrops').deleteMany({
      locationName: { $in: dropLabels },
    });
    await db
      .collection('gameitemdrops')
      .insertMany(dropLabels.map((n) => buildDropDoc(n)));
    console.log(`✅ gameitemdrops: inserted ${dropLabels.length} docs`);

    const gameItems = db.collection('gameitems');
    let upserted = 0;
    for (const item of ITEMS) {
      const res = await gameItems.updateOne(
        { name: item.id },
        {
          $set: {
            name: item.id,
            rarity: item.rarity,
            origin: item.origin,
            desc: item.description,
            isCraftable: item.isCraftable,
            isResource: item.isResource,
          },
        },
        { upsert: true }
      );
      if (res.upsertedCount || res.modifiedCount || res.matchedCount)
        upserted++;
    }
    console.log(`✅ gameitems: touched ${upserted} / ${ITEMS.length} docs`);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
