/**
 * Import inventory item definitions from WizardBattleItems.xlsx:
 * 1) Resolve ERC1155 tokenId via GameRegistry or register a new one.
 * 2) Upsert MongoDB `iteminventory` (InventoryItem definitions).
 *
 * Minting is NOT done here — players mint their own copies in-game via
 * GameRegistry.commitBatch.  The tokenId is established by addGameElement.
 *
 * Expected columns (header row): Title, id, image, Type, Price, Description, Rarity,
 * wearableSlot, wearRequirements, class, level, buff, CritChance, Accuracy, Attack,
 * Dodge, Movement, Defence
 *
 * Run from apps/backend:
 *   pnpm run import:inventory-xlsx
 *   pnpm run import:inventory-xlsx -- --file data/other.xlsx --dry-run
 *
 * Env:
 *   MONGODB_URI, MONGODB_DB
 *   EVM_RPC_URL (default http://127.0.0.1:8545)
 *   GAME_REGISTRY_ADDRESS, WB_RESOURCES_ADDRESS
 *   GAME_SIGNER_PRIVATE_KEY — must have GAME_SIGNER_ROLE on GameRegistry
 *
 * Role requirements on-chain:
 *   The signer wallet needs GAME_SIGNER_ROLE on GameRegistry (for addGameElement).
 *
 * tokenId allocation:
 *   nextTokenId = max(mongoMax, onChainRegistryMax) + 1, minimum 1 (id 0 is reserved).
 *
 * Idempotency: re-runs skip addGameElement when getGameElementName(id) is already set.
 * If the registry is empty but Mongo still has a tokenId (e.g. partial run), that id is reused.
 *
 * Fails fast: any error aborts the run immediately.
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import mongoose from 'mongoose';
import { ethers } from 'ethers';

// ─── ABIs ─────────────────────────────────────────────────────────────────────

const GAME_REGISTRY_ABI = [
  'function getGameElementName(string calldata name) view returns (tuple(address tokenAddress, uint256 tokenId, bool requiresTokenId))',
  'function getUniqueItemsList() view returns (string[])',
  'function addGameElement(uint8 elementType, string calldata name, address elementTokenAddress, uint256 elementTokenId, bool elementHasTokenId) external',
] as const;

// ─── Domain constants / types ─────────────────────────────────────────────────

/** Must match GameRegistry.sol IGameRegistry.GameElementType enum order. */
const GameElementType = {
  COIN: 0,
  RESOURCE: 1,
  CHARACTER: 2,
  UNIQUE_ITEM: 3,
} as const;

const WEARABLE_SLOTS = new Set([
  'Orb',
  'Belt',
  'Ring',
  'Amulet',
  'Boots',
  'Gloves',
]);
const RARITIES = new Set(['common', 'uncommon', 'rare']);
const TYPES = new Set(['armor', 'craft', 'gems']);

type ItemRarity = 'common' | 'uncommon' | 'rare';
type ItemType = 'armor' | 'craft' | 'gems';
type XlsxRow = Record<string, string | number | undefined | null>;

type GameRegistryContract = ethers.Contract & {
  getGameElementName(name: string): Promise<{
    tokenAddress: string;
    tokenId: bigint;
    requiresTokenId: boolean;
  }>;
  getUniqueItemsList(): Promise<string[]>;
  addGameElement(
    elementType: number,
    name: string,
    elementTokenAddress: string,
    elementTokenId: bigint,
    elementHasTokenId: boolean
  ): Promise<ethers.ContractTransactionResponse>;
};

// ─── CLI args ─────────────────────────────────────────────────────────────────

function parseArgs(argv: string[]): { file: string; dryRun: boolean } {
  let file = '';
  let dryRun = false;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') {
      dryRun = true;
    } else if (a === '--file' && argv[i + 1]) {
      file = argv[++i]!;
    } else if (a === '--help') {
      console.log(
        'Usage: pnpm run import:inventory-xlsx [-- --file <path>] [--dry-run]\n' +
          '\n' +
          '  --file <path>  Path to XLSX file (default: data/WizardBattleItems.xlsx)\n' +
          '  --dry-run      Validate and simulate without writing to chain or MongoDB\n'
      );
      process.exit(0);
    }
  }
  if (!file) file = path.join(__dirname, '../../data/WizardBattleItems.xlsx');
  if (!path.isAbsolute(file)) file = path.resolve(process.cwd(), file);
  return { file, dryRun };
}

// ─── Row parsers / validators ─────────────────────────────────────────────────

function str(v: unknown): string {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function normalizeRarity(raw: string): ItemRarity {
  const s = raw.trim().toLowerCase();
  if (!RARITIES.has(s))
    throw new Error(
      `Invalid rarity "${raw}" (expected common | uncommon | rare)`
    );
  return s as ItemRarity;
}

function normalizeType(raw: string): ItemType {
  const s = raw.trim().toLowerCase();
  if (!TYPES.has(s))
    throw new Error(`Invalid type "${raw}" (expected armor | craft | gems)`);
  return s as ItemType;
}

function parsePrice(raw: string): number {
  if (!raw) return 100;
  const n = Number(raw);
  if (Number.isNaN(n) || n < 0) return 100;
  return Math.floor(n);
}

function buildBuff(row: XlsxRow): Record<string, string> | undefined {
  const map: [string, string][] = [
    ['critChance', 'CritChance'],
    ['Accuracy', 'Accuracy'],
    ['Attack', 'Attack'],
    ['Dodge', 'Dodge'],
    ['Movement', 'Movement'],
    ['Defence', 'Defence'],
  ];
  const buff: Record<string, string> = {};
  for (const [key, col] of map) {
    const v = str(row[col]);
    if (v) buff[key] = v;
  }
  return Object.keys(buff).length ? buff : undefined;
}

function buildWearRequirements(
  row: XlsxRow
): { requirement: string; value: number | string }[] {
  const rawI = str(row['wearRequirements']);
  if (rawI) {
    try {
      const parsed = JSON.parse(rawI) as unknown;
      if (Array.isArray(parsed))
        return parsed as { requirement: string; value: number | string }[];
      if (parsed && typeof parsed === 'object') {
        return Object.entries(parsed as Record<string, string>).map(
          ([k, val]) => ({
            requirement: k,
            value: k === 'level' ? parseInt(String(val), 10) || val : val,
          })
        );
      }
    } catch {
      throw new Error(
        `Invalid JSON in wearRequirements for id "${str(row['id'])}"`
      );
    }
  }
  const cls = str(row['class']);
  const lvl = str(row['level']);
  const out: { requirement: string; value: number | string }[] = [];
  if (cls) out.push({ requirement: 'class', value: cls });
  if (lvl !== '') {
    const n = parseInt(lvl, 10);
    out.push({ requirement: 'level', value: Number.isNaN(n) ? lvl : n });
  }
  return out;
}

function rowToInventoryDoc(row: XlsxRow): Record<string, unknown> {
  const id = str(row['id']);
  const title = str(row['Title']);
  const image = str(row['image']);
  const description = str(row['Description']);
  if (!id) throw new Error('Row missing `id`');
  if (!title) throw new Error(`Row "${id}" missing Title`);
  if (!image) throw new Error(`Row "${id}" missing image`);
  if (!description) throw new Error(`Row "${id}" missing Description`);

  const type = normalizeType(str(row['Type']));
  const rarity = normalizeRarity(str(row['Rarity']));
  const price = parsePrice(str(row['Price']));

  const doc: Record<string, unknown> = {
    id,
    title,
    image,
    description,
    rarity,
    type,
    amount: 1,
    price,
  };

  if (type === 'armor') {
    const slot = str(row['wearableSlot']);
    if (slot && !WEARABLE_SLOTS.has(slot))
      throw new Error(`Invalid wearableSlot "${slot}" for "${id}"`);
    if (slot) doc.wearableSlot = slot;

    const lvl = str(row['level']);
    if (lvl !== '') {
      const n = parseInt(lvl, 10);
      if (!Number.isNaN(n)) doc.level = n;
    }

    const buff = buildBuff(row);
    if (buff) doc.buff = buff;

    doc.wearRequirements = buildWearRequirements(row);
    doc.improvementRequirements = [];
  }

  return doc;
}

// ─── tokenId helpers ──────────────────────────────────────────────────────────

/** Returns highest numeric tokenId stored in MongoDB, or 0 if none. */
async function maxTokenIdInDb(
  model: mongoose.Model<Record<string, unknown>>
): Promise<number> {
  const result = await model.aggregate<{ max: number | null }>([
    { $match: { tokenId: { $exists: true, $nin: [null, ''] } } },
    {
      $group: {
        _id: null,
        max: { $max: { $convert: { input: '$tokenId', to: 'int' } } },
      },
    },
  ]);
  return result[0]?.max ?? 0;
}

/**
 * Returns highest tokenId registered in the on-chain GameRegistry for UNIQUE_ITEMs.
 * Fetches all names in one call then resolves them in parallel.
 */
async function maxTokenIdOnChain(
  registry: GameRegistryContract
): Promise<number> {
  const names = await registry.getUniqueItemsList();
  if (names.length === 0) return 0;

  const elements = await Promise.all(
    names.map((name) => registry.getGameElementName(name))
  );
  let max = 0;
  for (const el of elements) {
    if (el.tokenAddress !== ethers.ZeroAddress) {
      const n = Number(el.tokenId);
      if (n > max) max = n;
    }
  }
  return max;
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { file, dryRun } = parseArgs(process.argv);

  if (!fs.existsSync(file)) {
    console.error(`File not found: ${file}`);
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI;
  const mongoDb = process.env.MONGODB_DB || 'wizardbattle';
  const rpcUrl = process.env.EVM_RPC_URL ?? 'http://127.0.0.1:8545';
  const gameRegistryAddress = process.env.GAME_REGISTRY_ADDRESS;
  const wbResourcesAddress = process.env.WB_RESOURCES_ADDRESS;
  const gameSignerKey = process.env.GAME_SIGNER_PRIVATE_KEY;

  if (!mongoUri) throw new Error('MONGODB_URI is not set');
  if (!gameRegistryAddress) throw new Error('GAME_REGISTRY_ADDRESS is not set');
  if (!wbResourcesAddress) throw new Error('WB_RESOURCES_ADDRESS is not set');
  if (!gameSignerKey) throw new Error('GAME_SIGNER_PRIVATE_KEY is not set');

  // ── parse XLSX ──────────────────────────────────────────────────────────────
  const workbook = XLSX.readFile(file);
  const sheetName = workbook.SheetNames[0]!;
  const sheet = workbook.Sheets[sheetName]!;
  const allRows = XLSX.utils.sheet_to_json<XlsxRow>(sheet, { defval: '' });
  // Filter out blank rows and any accidental duplicate header rows
  const rows = allRows.filter((r) => {
    const id = str(r['id']);
    return id && id !== 'id';
  });
  console.log(
    `Loaded ${rows.length} data rows from sheet "${sheetName}" in ${path.basename(file)}`
  );
  if (dryRun) console.log('[dry-run mode — no chain writes or MongoDB writes]');

  // ── contracts + MongoDB ─────────────────────────────────────────────────────
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const gameSigner = new ethers.Wallet(gameSignerKey, provider);

  const gameRegistry = new ethers.Contract(
    gameRegistryAddress,
    GAME_REGISTRY_ABI,
    gameSigner
  ) as unknown as GameRegistryContract;

  await mongoose.connect(mongoUri, { dbName: mongoDb });

  const InventoryItemSchema = new mongoose.Schema(
    {},
    { strict: false, collection: 'inventoryitems' }
  );
  const InventoryItem =
    (mongoose.models.InventoryItemImport as mongoose.Model<
      Record<string, unknown>
    >) ||
    mongoose.model<Record<string, unknown>>(
      'InventoryItemImport',
      InventoryItemSchema
    );

  // ── compute safe starting tokenId ──────────────────────────────────────────
  // Scan both Mongo and on-chain registry so we never collide with tokenIds
  // registered by other tools or manual ops outside this script.
  console.log(
    'Scanning MongoDB and on-chain GameRegistry for highest tokenId…'
  );
  const [dbMax, chainMax] = await Promise.all([
    maxTokenIdInDb(InventoryItem),
    maxTokenIdOnChain(gameRegistry),
  ]);
  let nextFreeId = Math.max(dbMax, chainMax, 0) + 1;
  console.log(`  MongoDB max  : ${dbMax}`);
  console.log(`  On-chain max : ${chainMax}`);
  console.log(`  nextTokenId  : ${nextFreeId}\n`);

  // ── process rows (fail fast — no try/catch) ─────────────────────────────────
  let createdRegistry = 0;
  let skippedRegistry = 0;
  let upserted = 0;

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx]!;
    const id = str(row['id']);
    const pfx = `[${idx + 1}/${rows.length}] "${id}"`;

    // Throws immediately on invalid row data (fail fast).
    const doc = rowToInventoryDoc(row);

    // ── registry lookup ───────────────────────────────────────────────────────
    const meta = await gameRegistry.getGameElementName(id);
    let tokenId: bigint;

    if (meta.tokenAddress !== ethers.ZeroAddress) {
      // Already registered on-chain — use the existing tokenId.
      tokenId = meta.tokenId;
      skippedRegistry++;
      console.log(`${pfx} already in GameRegistry tokenId=${tokenId}`);
    } else {
      // Not registered — resolve tokenId from Mongo or allocate a fresh one.
      const existingLean = await InventoryItem.findOne({ id })
        .select({ tokenId: 1 })
        .lean();
      let fromDb: bigint | null = null;
      if (existingLean?.tokenId != null && existingLean.tokenId !== '') {
        const n = parseInt(String(existingLean.tokenId), 10);
        if (!Number.isNaN(n) && n >= 1) fromDb = BigInt(n);
      }

      if (fromDb != null) {
        // Previous partial run stored a tokenId in Mongo before the chain write failed.
        tokenId = fromDb;
        console.log(`${pfx} reusing Mongo tokenId=${tokenId}`);
      } else {
        tokenId = BigInt(nextFreeId);
        console.log(`${pfx} allocating new tokenId=${tokenId}`);
      }

      if (dryRun) {
        console.log(
          `${pfx} [dry-run] would addGameElement(UNIQUE_ITEM, tokenId=${tokenId})`
        );
      } else {
        const txR = await gameRegistry.addGameElement(
          GameElementType.UNIQUE_ITEM,
          id,
          wbResourcesAddress,
          tokenId,
          true
        );
        await txR.wait();
        createdRegistry++;
        console.log(`${pfx} registered in GameRegistry tx=${txR.hash}`);
      }

      // Keep nextFreeId strictly ahead of all known tokenIds.
      nextFreeId = Math.max(nextFreeId, Number(tokenId) + 1);
    }

    // ── upsert MongoDB ────────────────────────────────────────────────────────
    doc.tokenId = tokenId.toString();

    if (dryRun) {
      console.log(
        `${pfx} [dry-run] would upsert iteminventory tokenId=${doc.tokenId}`
      );
    } else {
      await InventoryItem.updateOne({ id }, { $set: doc }, { upsert: true });
      upserted++;
      console.log(`${pfx} upserted iteminventory tokenId=${doc.tokenId}`);
    }
  }

  await mongoose.disconnect();

  console.log(
    `\nDone (dryRun=${dryRun})\n` +
      `  Registry : +${createdRegistry} new, ${skippedRegistry} already registered\n` +
      `  Upserts  : ${upserted}\n` +
      `  Total    : ${rows.length}\n`
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
