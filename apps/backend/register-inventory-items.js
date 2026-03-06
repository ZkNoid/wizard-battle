/**
 * Register InventoryItems in the GameRegistry contract.
 * Skips items already registered (tokenAddress != ZeroAddress).
 *
 * Run from apps/backend/:
 *   node register-inventory-items.js
 */
require('dotenv/config');
const mongoose = require('mongoose');
const { ethers } = require('ethers');

const GAME_REGISTRY_ABI = [
  'function getGameElementHash(bytes32 resourceHash) external view returns (tuple(address tokenAddress, uint256 tokenId, bool requiresTokenId))',
  'function addGameElement(uint8 elementType, string name, address elementTokenAddress, uint256 elementTokenId, bool elementHasTokenId) external',
];

// GameRegistry.sol GameElementType enum
const GameElementType = { COIN: 0, RESOURCE: 1, CHARACTER: 2, UNIQUE_ITEM: 3 };

const InventoryItemSchema = new mongoose.Schema({}, { strict: false });
const InventoryItem = mongoose.model(
  'InventoryItem',
  InventoryItemSchema,
  'iteminventory'
);

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  const privateKey = process.env.GAME_SIGNER_PRIVATE_KEY;
  const gameRegistryAddress = process.env.GAME_REGISTRY_ADDRESS;
  const wbResourcesAddress = process.env.WB_RESOURCES_ADDRESS;
  const rpcUrl = process.env.RPC_URL ?? 'http://localhost:8545';

  if (!mongoUri) throw new Error('MONGODB_URI is not set');
  if (!privateKey) throw new Error('GAME_SIGNER_PRIVATE_KEY is not set');
  if (!gameRegistryAddress) throw new Error('GAME_REGISTRY_ADDRESS is not set');
  if (!wbResourcesAddress) throw new Error('WB_RESOURCES_ADDRESS is not set');

  await mongoose.connect(mongoUri, { dbName: process.env.MONGODB_DB });
  console.log('Connected to MongoDB\n');

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);
  const gameRegistry = new ethers.Contract(
    gameRegistryAddress,
    GAME_REGISTRY_ABI,
    signer
  );

  const items = await InventoryItem.find().lean();
  console.log(`Found ${items.length} inventory items\n`);

  let registered = 1;
  let skipped = 0;
  let failed = 0;

  for (const item of items) {
    const resourceHash = ethers.keccak256(ethers.toUtf8Bytes(item.id));
    const metaData = await gameRegistry.getGameElementHash(resourceHash);

    if (metaData.tokenAddress !== ethers.ZeroAddress) {
      console.log(`⏭  Skip   "${item.id}" — already registered`);
      skipped++;
      continue;
    }

    try {
      console.log(`⏳ Register "${item.id}" (type: ${item.type})...`);
      const tx = await gameRegistry.addGameElement(
        GameElementType.UNIQUE_ITEM,
        item.id,
        wbResourcesAddress,
        registered, // 0 is reserved start from 1
        true // requiresTokenId — false for ERC721
      );
      const receipt = await tx.wait();
      console.log(`✅ Registered "${item.id}" — tx: ${receipt.hash}`);
      registered++;
    } catch (err) {
      console.error(`❌ Failed   "${item.id}" — ${err.message}`);
      failed++;
    }
  }

  console.log(
    `\nDone: ${registered} registered, ${skipped} skipped, ${failed} failed`
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
