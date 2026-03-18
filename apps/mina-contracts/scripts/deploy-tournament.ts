/**
 * Tournament Manager Deployment Script
 *
 * Deploy TournamentManager contract to Mina testnet.
 *
 * Usage:
 *   pnpm --filter mina-contracts run deploy:testnet
 *
 * Environment variables:
 *   MINA_NETWORK_URL - Mina GraphQL endpoint (default: devnet)
 *   DEPLOYER_PRIVATE_KEY - Private key for deployment account (must have MINA)
 */

import {
  Mina,
  PrivateKey,
  AccountUpdate,
  fetchAccount,
} from 'o1js';
import { TournamentManager } from '../src/TournamentManager.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEYS_DIR = path.join(__dirname, '..', 'keys', 'tournament');
const KEYS_ALL_DIR = path.join(KEYS_DIR, 'all');

const MINA_NETWORK_URL =
  process.env.MINA_NETWORK_URL ||
  'https://api.minascan.io/node/devnet/v1/graphql';

const MINA_ARCHIVE_URL =
  process.env.MINA_ARCHIVE_URL ||
  'https://api.minascan.io/archive/devnet/v1/graphql';

async function main() {
  console.log('='.repeat(60));
  console.log('TournamentManager Deployment Script');
  console.log('='.repeat(60));

  // Check for deployer key
  const deployerKeyBase58 = process.env.DEPLOYER_PRIVATE_KEY;
  if (!deployerKeyBase58) {
    console.error('ERROR: DEPLOYER_PRIVATE_KEY environment variable not set');
    console.error(
      'Please set it to a base58-encoded private key with MINA balance'
    );
    process.exit(1);
  }

  // Connect to network
  console.log(`\nConnecting to: ${MINA_NETWORK_URL}`);
  const network = Mina.Network({
    mina: MINA_NETWORK_URL,
    archive: MINA_ARCHIVE_URL,
  });
  Mina.setActiveInstance(network);

  // Setup deployer account
  const deployerKey = PrivateKey.fromBase58(deployerKeyBase58);
  const deployer = deployerKey.toPublicKey();
  console.log(`Deployer address: ${deployer.toBase58()}`);

  // Fetch deployer account
  console.log('\nFetching deployer account...');
  const deployerAccount = await fetchAccount({ publicKey: deployer });
  if (!deployerAccount.account) {
    console.error('ERROR: Deployer account not found or has no balance');
    process.exit(1);
  }
  console.log(
    `Deployer balance: ${
      Number(deployerAccount.account.balance.toBigInt()) / 1e9
    } MINA`
  );

  // Generate contract keypair
  const contractKey = PrivateKey.random();
  const contractAddress = contractKey.toPublicKey();
  console.log(`\nContract address: ${contractAddress.toBase58()}`);

  // Compile contract
  console.log('Compiling TournamentManager...');
  const startCompile = Date.now();
  await TournamentManager.compile();
  console.log(`Compilation completed in ${Date.now() - startCompile}ms`);

  // Create contract instance
  const contract = new TournamentManager(contractAddress);

  // Deploy contract
  console.log('\nDeploying contract...');
  const deployTx = await Mina.transaction(
    { sender: deployer, fee: 0.1e9 },
    async () => {
      AccountUpdate.fundNewAccount(deployer);
      await contract.deploy();
    }
  );
  await deployTx.prove();
  const deployResult = await deployTx.sign([deployerKey, contractKey]).send();
  console.log(`Deploy transaction hash: ${deployResult.hash}`);

  // Wait for deployment
  console.log('Waiting for deployment confirmation...');
  await deployResult.wait();
  console.log('Contract deployed successfully!');

  // Save keys to files
  const keyData = {
    contractPrivateKey: contractKey.toBase58(),
    contractAddress: contractAddress.toBase58(),
    deployedAt: new Date().toISOString(),
    deployTxHash: deployResult.hash,
    network: MINA_NETWORK_URL,
  };

  saveKeys(keyData);

  // Output summary
  console.log('\n' + '='.repeat(60));
  console.log('DEPLOYMENT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Contract Address: ${contractAddress.toBase58()}`);
  console.log(`Keys saved to: ${KEYS_DIR}/current.json`);
  console.log('\nAdd to .env:');
  console.log(`TOURNAMENT_CONTRACT_ADDRESS=${contractAddress.toBase58()}`);
  console.log(`TOURNAMENT_CONTRACT_PRIVATE_KEY=${contractKey.toBase58()}`);
  console.log('='.repeat(60));
}

interface KeyData {
  contractPrivateKey: string;
  contractAddress: string;
  deployedAt: string;
  deployTxHash: string;
  network: string;
}

function saveKeys(keyData: KeyData): void {
  // Ensure directories exist
  if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true });
  }
  if (!fs.existsSync(KEYS_ALL_DIR)) {
    fs.mkdirSync(KEYS_ALL_DIR, { recursive: true });
  }

  // Save current.json
  const currentPath = path.join(KEYS_DIR, 'current.json');
  fs.writeFileSync(currentPath, JSON.stringify(keyData, null, 2));
  console.log(`\nKeys saved to: ${currentPath}`);

  // Find next incremental number for all directory
  const existingFiles = fs.readdirSync(KEYS_ALL_DIR).filter((f) => f.endsWith('.json'));
  const numbers = existingFiles
    .map((f) => parseInt(f.replace('.json', ''), 10))
    .filter((n) => !isNaN(n));
  const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;

  // Save to all directory with incremental name
  const allPath = path.join(KEYS_ALL_DIR, `${nextNumber}.json`);
  fs.writeFileSync(allPath, JSON.stringify(keyData, null, 2));
  console.log(`Keys duplicated to: ${allPath}`);
}

main().catch((err) => {
  console.error('Deployment failed:', err);
  process.exit(1);
});
