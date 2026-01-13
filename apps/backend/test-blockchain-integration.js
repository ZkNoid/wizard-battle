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

const BASE_URL = process.env.API_URL || 'http://localhost:3030';

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
    console.error('1. Make sure the backend is running: cd apps/backend && pnpm dev');
    console.error('2. Check your .env file has all required variables');
    console.error('3. Verify the game signer has GAME_SIGNER_ROLE');
    console.error('4. Ensure you have test ETH/AVAX for gas');
    
    process.exit(1);
  }
}

// Run the test
testMintWood();
