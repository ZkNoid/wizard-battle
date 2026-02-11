import dotenv from 'dotenv';
dotenv.config();

import { Mina, PrivateKey, fetchAccount, AccountUpdate, PublicKey } from 'o1js';
import { GameManager } from '../src/GameManager.js';
import { GameRecordProgram } from '../src/Proofs/GameRecordProof.js';
import { FraudProgram } from '../src/Proofs/FraudProoof.js';

import * as fs from 'fs';

const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

/**
 * Configure Mina network instance
 */
function configDefaultInstance() {
  const useCustomLocalNetwork = process.env.USE_CUSTOM_LOCAL_NETWORK === 'true';
  const networkUrl = process.env.MINA_NETWORK_URL || 'https://api.minascan.io/node/devnet/v1/graphql';
  const archiveUrl = process.env.MINA_ARCHIVE_URL || 'https://api.minascan.io/archive/devnet/v1/graphql';
  
  const network = Mina.Network({
    mina: useCustomLocalNetwork
      ? 'http://localhost:8080/graphql'
      : networkUrl,
    lightnetAccountManager: useCustomLocalNetwork ? 'http://localhost:8181' : undefined,
    archive: useCustomLocalNetwork
      ? 'http://localhost:8282'
      : archiveUrl,
  });
  Mina.setActiveInstance(network);

  // Transaction fee in nanoMINA (0.1 MINA = 100_000_000 nanoMINA)
  const transactionFee = Number(process.env.TRANSACTION_FEE) || 100_000_000;

  return { transactionFee };
}

async function main() {
  console.log('🚀 Starting GameManager deployment script...\n');

  // Network configuration
  const { transactionFee } = configDefaultInstance();

  // Load deployer key
  const deployerKeyBase58 = process.env.DEPLOYER_KEY;
  if (!deployerKeyBase58) {
    throw new Error('DEPLOYER_KEY environment variable is not set');
  }

  const deployerKey = PrivateKey.fromBase58(deployerKeyBase58);
  const deployer = deployerKey.toPublicKey();

  console.log('📋 Configuration:');
  console.log(`   Network URL: ${process.env.MINA_NETWORK_URL || 'devnet'}`);
  console.log(`   Transaction fee: ${transactionFee / 1_000_000_000} MINA`);

  // Fetch account info
  console.log(`\n🔑 Fetching the fee payer account information...`);
  const accountDetails = (await fetchAccount({ publicKey: deployer })).account;
  if (!accountDetails) {
    throw new Error(`Could not fetch account for deployer: ${deployer.toBase58()}`);
  }
  console.log(
    `   Using fee payer: ${deployer.toBase58()}`
  );
  console.log(`   Nonce: ${accountDetails.nonce}`);
  console.log(`   Balance: ${Number(accountDetails.balance.toBigInt()) / 1_000_000_000} MINA`);

  // Compile proofs and contract
  console.log('\n⚙️  Compiling ZkPrograms and contract (this may take several minutes)...');

  console.log('   Compiling GameRecordProgram...');
  const grpStart = Date.now();
  await GameRecordProgram.compile();
  console.log(`   ✓ GameRecordProgram compiled in ${((Date.now() - grpStart) / 1000).toFixed(1)}s`);

  console.log('   Compiling FraudProgram...');
  const fpStart = Date.now();
  await FraudProgram.compile();
  console.log(`   ✓ FraudProgram compiled in ${((Date.now() - fpStart) / 1000).toFixed(1)}s`);

  console.log('   Compiling GameManager...');
  const gmStart = Date.now();
  await GameManager.compile();
  console.log(`   ✓ GameManager compiled in ${((Date.now() - gmStart) / 1000).toFixed(1)}s`);

  // Generate new keypair for the contract
  const gameManagerPrivateKey = PrivateKey.random();
  const gameManagerAddress = gameManagerPrivateKey.toPublicKey();

  console.log(`\n📝 Deploying GameManager on address: ${gameManagerAddress.toBase58()}`);

  // Create the contract instance
  const gameManager = new GameManager(gameManagerAddress);

  // Create and send deploy transaction
  const deployTx = await Mina.transaction(
    { sender: deployer, fee: transactionFee },
    async () => {
      AccountUpdate.fundNewAccount(deployer);
      await gameManager.deploy();
    }
  );

  await deployTx.prove();
  const deployTxStatus = await deployTx
    .sign([deployerKey, gameManagerPrivateKey])
    .send();

  console.log(`\n📤 Transaction sent!`);
  console.log(`   Hash: ${deployTxStatus.hash}`);

  // Wait for confirmation
  const waitMinutes = Number(process.env.TX_WAIT_MINUTES) || 10;
  console.log(`\n⏳ Waiting ${waitMinutes} minutes for transaction to be included in a block...`);
  
  // Poll for confirmation or use waitForInclusion if available
  try {
    await deployTxStatus.wait();
    console.log('   ✓ Transaction confirmed!');
  } catch (error) {
    console.log(`   Waiting for ${waitMinutes} minutes as fallback...`);
    await wait(waitMinutes * 60 * 1000);
  }

  // Save deployment information
  console.log('\n💾 Saving deployment information...');

  // Create directories if they don't exist
  if (!fs.existsSync('./deploy')) {
    fs.mkdirSync('./deploy');
  }
  if (!fs.existsSync('./deploy/addresses')) {
    fs.mkdirSync('./deploy/addresses', { recursive: true });
  }
  if (!fs.existsSync('./keys/auto')) {
    fs.mkdirSync('./keys/auto', { recursive: true });
  }

  // Load or initialize deploy params
  let deployParams: { lastDeploy: number };
  if (fs.existsSync('./deploy/params.json')) {
    const deployParamsBuffer = fs.readFileSync('./deploy/params.json');
    deployParams = JSON.parse(deployParamsBuffer.toString());
  } else {
    deployParams = { lastDeploy: 0 };
  }
  deployParams.lastDeploy++;

  // Save private keys (for admin operations - keep secure!)
  const deployedKeys = {
    gameManagerPrivateKey: gameManagerPrivateKey.toBase58(),
    gameManagerAddress: gameManagerAddress.toBase58(),
    deployedAt: new Date().toISOString(),
    deployTxHash: deployTxStatus.hash,
    network: process.env.MINA_NETWORK_URL || 'devnet',
  };

  fs.writeFileSync(
    `./keys/auto/${deployParams.lastDeploy}.json`,
    JSON.stringify(deployedKeys, null, 2),
    { flag: 'wx' }
  );
  console.log(`   ✓ Keys saved to ./keys/auto/${deployParams.lastDeploy}.json`);

  // Save public addresses
  const addresses = {
    gameManagerAddress: gameManagerAddress.toBase58(),
    adminAddress: deployer.toBase58(),
    deployedAt: new Date().toISOString(),
    deployTxHash: deployTxStatus.hash,
    network: process.env.MINA_NETWORK_URL || 'devnet',
  };

  fs.writeFileSync(
    `./deploy/addresses/${deployParams.lastDeploy}.json`,
    JSON.stringify(addresses, null, 2),
    { flag: 'wx' }
  );

  fs.writeFileSync(
    `./deploy/addresses/current.json`,
    JSON.stringify(addresses, null, 2)
  );
  console.log(`   ✓ Addresses saved to ./deploy/addresses/${deployParams.lastDeploy}.json`);
  console.log(`   ✓ Current addresses updated in ./deploy/addresses/current.json`);

  // Update deploy params
  fs.writeFileSync(`./deploy/params.json`, JSON.stringify(deployParams, null, 2));

  // Print summary
  console.log('\n' + '═'.repeat(60));
  console.log('🎉 Deployment Complete!');
  console.log('═'.repeat(60));
  console.log(`\n📋 Summary:`);
  console.log(`   Contract Address: ${gameManagerAddress.toBase58()}`);
  console.log(`   Admin Address:    ${deployer.toBase58()}`);
  console.log(`   Deploy TX Hash:   ${deployTxStatus.hash}`);
  console.log(`   Deploy Number:    ${deployParams.lastDeploy}`);
  console.log('\n📝 Next Steps:');
  console.log('   1. Add to .env: MINA_CONTRACT_ADDRESS=' + gameManagerAddress.toBase58());
  console.log('   2. Keep the private key from ./keys/auto/ secure!');
  console.log('   3. Verify the contract on Minascan (optional)');
  console.log('\n');
}

main().catch((error) => {
  console.error('❌ Deployment failed:', error);
  process.exit(1);
});

