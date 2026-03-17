#!/usr/bin/env node

/**
 * Test script for blockchain integration
 * Tests minting Wood via the GameRegistry contract
 *
 * Usage:
 * 1. Make sure your .env file has the required variables:
 *    - RPC_URL
 *    - GAME_SIGNER_PRIVATE_KEY
 *    - GAME_REGISTRY_ADDRESS
 *    - WB_RESOURCES_ADDRESS
 *
 * 2. Make sure the backend server is running:
 *    cd apps/backend && pnpm dev
 *
 * 3. Run this script:
 *    node test-blockchain-integration.js
 */

require('dotenv').config();
const { ethers } = require('ethers');

const BASE_URL = process.env.API_URL || 'http://localhost:3030';

// Helper function for sleep
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function testMintWood() {
  console.log('\n🧪 Testing Wood Minting via Blockchain\n');
  console.log('='.repeat(60));

  // Use proper checksummed address
  const playerAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
  const amount = 1000;
  const resourceName = 'Wood';

  const payload = {
    playerAddress,
    amount,
  };

  try {
    console.log('\n📡 Calling API endpoint...');
    // URL encode the resource name (space becomes %20)
    const encodedName = encodeURIComponent(resourceName);
    const url = `${BASE_URL}/game-commit/resources/${encodedName}/mint`;
    console.log(`Endpoint: POST ${url}`);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    console.log('\n✅ Success!');
    console.log('Response:', JSON.stringify(result, null, 2));

    // Step 3: Submit the signed commit to blockchain
    if (result.success && result.commit) {
      console.log('\n🔗 Submitting transaction to blockchain...');

      // Setup provider and signer
      const provider = new ethers.JsonRpcProvider(
        process.env.RPC_URL || 'http://127.0.0.1:8545'
      );
      const signer = new ethers.Wallet(process.env.USER_PRIVATE_KEY, provider);
      const gameRegistryAddress = process.env.GAME_REGISTRY_ADDRESS;

      const gameRegistryContract = new ethers.Contract(
        gameRegistryAddress,
        [
          'function commitSingle(bytes32 resourceHash, bytes memory commit, bytes memory signature)',
          'event CommitConfirmed(bytes indexed commit)',
        ],
        signer
      );

      console.log('📡 Calling gameRegistry.commitSingle...');
      console.log('   Game Registry:', gameRegistryAddress);
      console.log('   Resource Hash:', result.commit.resourceHash);

      const tx = await gameRegistryContract.commitSingle(
        result.commit.resourceHash,
        result.commit.commit,
        result.commit.signature
      );

      console.log('⏳ Waiting for transaction confirmation...');
      console.log('   Transaction hash:', tx.hash);

      const receipt = await tx.wait();

      console.log('✅ Transaction confirmed!');
      console.log('   Block number:', receipt.blockNumber);
      console.log('   Gas used:', receipt.gasUsed.toString());
    }

    if (result.blockchain) {
      console.log('\n🔗 Blockchain Details:');
      console.log(`  Transaction Hash: ${result.blockchain.transactionHash}`);
      console.log(`  Block Number: ${result.blockchain.blockNumber}`);
      console.log(`  Gas Used: ${result.blockchain.gasUsed}`);
      console.log(`  New Balance: ${result.blockchain.balance} Wood`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Test failed!');
    console.error('Error:', error.message);
    console.error('\n' + '='.repeat(60));

    console.error('\nTroubleshooting:');
    console.error(
      '1. Make sure the backend is running: cd apps/backend && pnpm dev'
    );
    console.error('2. Check your .env file has all required variables');
    console.error('3. Verify the game signer has GAME_SIGNER_ROLE');
    console.error('4. Ensure you have test ETH/AVAX for gas');

    process.exit(1);
  }
}

async function testBurnWood() {
  console.log('\n🧪 Testing Wood Burning via Blockchain\n');
  console.log('='.repeat(60));

  // Use proper checksummed address
  const playerAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
  const amount = 1000;
  const resourceName = 'Wood';

  const payload = {
    playerAddress,
    amount,
  };

  try {
    console.log('\n📡 Calling API endpoint...');
    // URL encode the resource name (space becomes %20)
    const encodedName = encodeURIComponent(resourceName);
    const url = `${BASE_URL}/game-commit/resources/${encodedName}/burn`;
    console.log(`Endpoint: POST ${url}`);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    console.log('\n✅ Success!');
    console.log('Response:', JSON.stringify(result, null, 2));

    // Step 3: Submit the signed commit to blockchain
    if (result.success && result.commit) {
      console.log('\n🔗 Submitting transaction to blockchain...');

      // Setup provider and signer
      const provider = new ethers.JsonRpcProvider(
        process.env.RPC_URL || 'http://127.0.0.1:8545'
      );
      const signer = new ethers.Wallet(process.env.USER_PRIVATE_KEY, provider);
      const gameRegistryAddress = process.env.GAME_REGISTRY_ADDRESS;

      const gameRegistryContract = new ethers.Contract(
        gameRegistryAddress,
        [
          'function commitSingle(bytes32 resourceHash, bytes memory commit, bytes memory signature)',
          'event CommitConfirmed(bytes indexed commit)',
        ],
        signer
      );

      console.log('📡 Calling gameRegistry.commitSingle...');
      console.log('   Game Registry:', gameRegistryAddress);
      console.log('   Resource Hash:', result.commit.resourceHash);

      const tx = await gameRegistryContract.commitSingle(
        result.commit.resourceHash,
        result.commit.commit,
        result.commit.signature
      );

      console.log('⏳ Waiting for transaction confirmation...');
      console.log('   Transaction hash:', tx.hash);

      const receipt = await tx.wait();

      console.log('✅ Transaction confirmed!');
      console.log('   Block number:', receipt.blockNumber);
      console.log('   Gas used:', receipt.gasUsed.toString());
    }

    // if (result.blockchain) {
    console.log('\n🔗 Blockchain Details:');
    console.log(`  Transaction Hash: ${result.transactionHash}`);
    console.log(`  Block Number: ${result.blockNumber}`);
    console.log(`  Gas Used: ${result.gasUsed}`);
    console.log(`  New Balance: ${result.balance} Wood`);
    // }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Test failed!');
    console.error('Error:', error.message);
    console.error('\n' + '='.repeat(60));

    console.error('\nTroubleshooting:');
    console.error(
      '1. Make sure the backend is running: cd apps/backend && pnpm dev'
    );
    console.error('2. Check your .env file has all required variables');
    console.error('3. Verify the game signer has GAME_SIGNER_ROLE');
    console.error('4. Ensure you have test ETH/AVAX for gas');

    process.exit(1);
  }
}

async function testMintLegendarySword() {
  console.log('\n🧪 Testing LegendarySword Minting via Blockchain\n');
  console.log('='.repeat(60));

  // Use proper checksummed address
  const playerAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
  const amount = 1;
  const resourceName = 'LegendarySword';

  const payload = {
    playerAddress,
    amount,
  };

  try {
    console.log('\n📡 Calling API endpoint...');
    // URL encode the resource name (space becomes %20)
    const encodedName = encodeURIComponent(resourceName);
    const url = `${BASE_URL}/game-commit/items/${encodedName}/mint`;
    console.log(`Endpoint: POST ${url}`);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    console.log('\n✅ Success!');
    console.log('Response:', JSON.stringify(result, null, 2));

    // Step 3: Submit the signed commit to blockchain
    if (result.success && result.commit) {
      console.log('\n🔗 Submitting transaction to blockchain...');

      // Setup provider and signer
      const provider = new ethers.JsonRpcProvider(
        process.env.RPC_URL || 'http://127.0.0.1:8545'
      );
      const signer = new ethers.Wallet(process.env.USER_PRIVATE_KEY, provider);
      const gameRegistryAddress = process.env.GAME_REGISTRY_ADDRESS;

      const gameRegistryContract = new ethers.Contract(
        gameRegistryAddress,
        [
          'function commitSingle(bytes32 resourceHash, bytes memory commit, bytes memory signature)',
          'event CommitConfirmed(bytes indexed commit)',
        ],
        signer
      );

      console.log('📡 Calling gameRegistry.commitSingle...');
      console.log('   Game Registry:', gameRegistryAddress);
      console.log('   Item Hash:', result.commit.itemHash);

      const tx = await gameRegistryContract.commitSingle(
        result.commit.itemHash,
        result.commit.commit,
        result.commit.signature
      );

      console.log('⏳ Waiting for transaction confirmation...');
      console.log('   Transaction hash:', tx.hash);

      const receipt = await tx.wait();

      console.log('✅ Transaction confirmed!');
      console.log('   Block number:', receipt.blockNumber);
      console.log('   Gas used:', receipt.gasUsed.toString());
    }

    if (result.blockchain) {
      console.log('\n🔗 Blockchain Details:');
      console.log(`  Transaction Hash: ${result.blockchain.transactionHash}`);
      console.log(`  Block Number: ${result.blockchain.blockNumber}`);
      console.log(`  Gas Used: ${result.blockchain.gasUsed}`);
      console.log(`  New Balance: ${result.blockchain.balance} LegendarySword`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Test failed!');
    console.error('Error:', error.message);
    console.error('\n' + '='.repeat(60));

    console.error('\nTroubleshooting:');
    console.error(
      '1. Make sure the backend is running: cd apps/backend && pnpm dev'
    );
    console.error('2. Check your .env file has all required variables');
    console.error('3. Verify the game signer has GAME_SIGNER_ROLE');
    console.error('4. Ensure you have test ETH/AVAX for gas');

    process.exit(1);
  }
}

async function testBurnLegendarySword() {
  console.log('\n🧪 Testing LegendarySword Burning via Blockchain\n');
  console.log('='.repeat(60));

  // Use proper checksummed address
  const playerAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
  const amount = 1;
  const resourceName = 'LegendarySword';

  const payload = {
    playerAddress,
    amount,
  };

  try {
    console.log('\n📡 Calling API endpoint...');
    // URL encode the resource name (space becomes %20)
    const encodedName = encodeURIComponent(resourceName);
    const url = `${BASE_URL}/game-commit/items/${encodedName}/burn`;
    console.log(`Endpoint: POST ${url}`);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    console.log('\n✅ Success!');
    console.log('Response:', JSON.stringify(result, null, 2));

    // Step 3: Submit the signed commit to blockchain
    if (result.success && result.commit) {
      console.log('\n🔗 Submitting transaction to blockchain...');

      // Setup provider and signer
      const provider = new ethers.JsonRpcProvider(
        process.env.RPC_URL || 'http://127.0.0.1:8545'
      );
      const signer = new ethers.Wallet(process.env.USER_PRIVATE_KEY, provider);
      const gameRegistryAddress = process.env.GAME_REGISTRY_ADDRESS;

      const gameRegistryContract = new ethers.Contract(
        gameRegistryAddress,
        [
          'function commitSingle(bytes32 resourceHash, bytes memory commit, bytes memory signature)',
          'event CommitConfirmed(bytes indexed commit)',
        ],
        signer
      );

      console.log('📡 Calling gameRegistry.commitSingle...');
      console.log('   Game Registry:', gameRegistryAddress);
      console.log('   Item Hash:', result.commit.itemHash);

      const tx = await gameRegistryContract.commitSingle(
        result.commit.itemHash,
        result.commit.commit,
        result.commit.signature
      );

      console.log('⏳ Waiting for transaction confirmation...');
      console.log('   Transaction hash:', tx.hash);

      const receipt = await tx.wait();

      console.log('✅ Transaction confirmed!');
      console.log('   Block number:', receipt.blockNumber);
      console.log('   Gas used:', receipt.gasUsed.toString());
    }

    console.log('\n🔗 Blockchain Details:');
    console.log(`  Transaction Hash: ${result.transactionHash}`);
    console.log(`  Block Number: ${result.blockNumber}`);
    console.log(`  Gas Used: ${result.gasUsed}`);
    console.log(`  New Balance: ${result.balance} LegendarySword`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Test failed!');
    console.error('Error:', error.message);
    console.error('\n' + '='.repeat(60));

    console.error('\nTroubleshooting:');
    console.error(
      '1. Make sure the backend is running: cd apps/backend && pnpm dev'
    );
    console.error('2. Check your .env file has all required variables');
    console.error('3. Verify the game signer has GAME_SIGNER_ROLE');
    console.error('4. Ensure you have test ETH/AVAX for gas');

    process.exit(1);
  }
}

async function testMintWizard() {
  console.log('\n🧪 Testing Wizard Minting via Blockchain\n');
  console.log('='.repeat(60));

  // Use proper checksummed address
  const playerAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
  const amount = 1;
  const resourceName = 'Wizard';

  const payload = {
    playerAddress,
    amount,
  };

  try {
    console.log('\n📡 Calling API endpoint...');
    // URL encode the resource name (space becomes %20)
    const encodedName = encodeURIComponent(resourceName);
    const url = `${BASE_URL}/game-commit/characters/${encodedName}/mint`;
    console.log(`Endpoint: POST ${url}`);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    console.log('\n✅ Success!');
    console.log('Response:', JSON.stringify(result, null, 2));

    // Step 3: Submit the signed commit to blockchain
    if (result.success && result.commit) {
      console.log('\n🔗 Submitting transaction to blockchain...');

      // Setup provider and signer
      const provider = new ethers.JsonRpcProvider(
        process.env.RPC_URL || 'http://127.0.0.1:8545'
      );
      const signer = new ethers.Wallet(process.env.USER_PRIVATE_KEY, provider);
      const gameRegistryAddress = process.env.GAME_REGISTRY_ADDRESS;

      const gameRegistryContract = new ethers.Contract(
        gameRegistryAddress,
        [
          'function commitSingle(bytes32 resourceHash, bytes memory commit, bytes memory signature)',
          'event CommitConfirmed(bytes indexed commit)',
        ],
        signer
      );

      console.log('📡 Calling gameRegistry.commitSingle...');
      console.log('   Game Registry:', gameRegistryAddress);
      console.log('   Character Hash:', result.commit.characterHash);

      const tx = await gameRegistryContract.commitSingle(
        result.commit.characterHash,
        result.commit.commit,
        result.commit.signature
      );

      console.log('⏳ Waiting for transaction confirmation...');
      console.log('   Transaction hash:', tx.hash);

      const receipt = await tx.wait();

      console.log('✅ Transaction confirmed!');
      console.log('   Block number:', receipt.blockNumber);
      console.log('   Gas used:', receipt.gasUsed.toString());
    }

    if (result.blockchain) {
      console.log('\n🔗 Blockchain Details:');
      console.log(`  Transaction Hash: ${result.blockchain.transactionHash}`);
      console.log(`  Block Number: ${result.blockchain.blockNumber}`);
      console.log(`  Gas Used: ${result.blockchain.gasUsed}`);
      console.log(`  New Balance: ${result.blockchain.balance} LegendarySword`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Test failed!');
    console.error('Error:', error.message);
    console.error('\n' + '='.repeat(60));

    console.error('\nTroubleshooting:');
    console.error(
      '1. Make sure the backend is running: cd apps/backend && pnpm dev'
    );
    console.error('2. Check your .env file has all required variables');
    console.error('3. Verify the game signer has GAME_SIGNER_ROLE');
    console.error('4. Ensure you have test ETH/AVAX for gas');

    process.exit(1);
  }
}

async function testBurnWizard() {
  console.log('\n🧪 Testing Wizard Burning via Blockchain\n');
  console.log('='.repeat(60));

  // Use proper checksummed address
  const playerAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
  const amount = 1;
  const resourceName = 'Wizard';

  const payload = {
    playerAddress,
    amount,
  };

  try {
    console.log('\n📡 Calling API endpoint...');
    // URL encode the resource name (space becomes %20)
    const encodedName = encodeURIComponent(resourceName);
    const url = `${BASE_URL}/game-commit/characters/${encodedName}/burn`;
    console.log(`Endpoint: POST ${url}`);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    console.log('\n✅ Success!');
    console.log('Response:', JSON.stringify(result, null, 2));

    // Step 3: Submit the signed commit to blockchain
    if (result.success && result.commit) {
      console.log('\n🔗 Submitting transaction to blockchain...');

      // Setup provider and signer
      const provider = new ethers.JsonRpcProvider(
        process.env.RPC_URL || 'http://127.0.0.1:8545'
      );
      const signer = new ethers.Wallet(process.env.USER_PRIVATE_KEY, provider);
      const gameRegistryAddress = process.env.GAME_REGISTRY_ADDRESS;

      const gameRegistryContract = new ethers.Contract(
        gameRegistryAddress,
        [
          'function commitSingle(bytes32 resourceHash, bytes memory commit, bytes memory signature)',
          'event CommitConfirmed(bytes indexed commit)',
        ],
        signer
      );

      console.log('📡 Calling gameRegistry.commitSingle...');
      console.log('   Game Registry:', gameRegistryAddress);
      console.log('   Character Hash:', result.commit.characterHash);

      const tx = await gameRegistryContract.commitSingle(
        result.commit.characterHash,
        result.commit.commit,
        result.commit.signature
      );

      console.log('⏳ Waiting for transaction confirmation...');
      console.log('   Transaction hash:', tx.hash);

      const receipt = await tx.wait();

      console.log('✅ Transaction confirmed!');
      console.log('   Block number:', receipt.blockNumber);
      console.log('   Gas used:', receipt.gasUsed.toString());
    }

    console.log('\n🔗 Blockchain Details:');
    console.log(`  Transaction Hash: ${result.transactionHash}`);
    console.log(`  Block Number: ${result.blockNumber}`);
    console.log(`  Gas Used: ${result.gasUsed}`);
    console.log(`  New Balance: ${result.balance} LegendarySword`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Test failed!');
    console.error('Error:', error.message);
    console.error('\n' + '='.repeat(60));

    console.error('\nTroubleshooting:');
    console.error(
      '1. Make sure the backend is running: cd apps/backend && pnpm dev'
    );
    console.error('2. Check your .env file has all required variables');
    console.error('3. Verify the game signer has GAME_SIGNER_ROLE');
    console.error('4. Ensure you have test ETH/AVAX for gas');

    process.exit(1);
  }
}
// Run the test
(async () => {
  await testMintWood();
  // sleep 5 seconds
  await sleep(5000);
  await testBurnWood();

  await sleep(5000);
  await testMintLegendarySword();
  // sleep 5 seconds
  await sleep(5000);
  await testBurnLegendarySword();

  await sleep(5000);
  await testMintWizard();
  // // sleep 5 seconds
  await sleep(5000);
  await testBurnWizard();
})();
