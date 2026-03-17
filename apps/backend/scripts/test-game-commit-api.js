#!/usr/bin/env node

/**
 * Test script for Game Commit API endpoints
 * Usage: node test-game-commit-api.js
 * 
 * Make sure the backend server is running before executing this script:
 * cd apps/backend && pnpm dev
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3030';

// Helper function to make API calls
async function callApi(endpoint, method = 'GET', body = null) {
  const url = `${BASE_URL}${endpoint}`;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    console.log(`\n📡 ${method} ${url}`);
    if (body) {
      console.log('📦 Request body:', JSON.stringify(body, null, 2));
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Response:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Test functions for each endpoint type
async function testResourceCommit() {
  console.log('\n' + '='.repeat(60));
  console.log('TESTING RESOURCE ENDPOINTS');
  console.log('='.repeat(60));

  // Test mint resource
  await callApi('/game-commit/resources/Iron Ore/mint', 'POST', {
    amount: 10,
    userId: 'user123',
    source: 'mining'
  });

  // Test burn resource
  await callApi('/game-commit/resources/Gold Ore/burn', 'POST', {
    amount: 5,
    userId: 'user456',
    reason: 'crafting'
  });

  // Test modify resource
  await callApi('/game-commit/resources/Diamond/modify', 'POST', {
    quality: 'enhanced',
    userId: 'user789'
  });
}

async function testCoinCommit() {
  console.log('\n' + '='.repeat(60));
  console.log('TESTING COIN ENDPOINTS');
  console.log('='.repeat(60));

  // Test mint coin
  await callApi('/game-commit/coins/Gold/mint', 'POST', {
    amount: 100,
    userId: 'user123',
    source: 'quest_reward'
  });

  // Test burn coin
  await callApi('/game-commit/coins/Silver/burn', 'POST', {
    amount: 50,
    userId: 'user456',
    reason: 'shop_purchase'
  });

  // Test modify coin
  await callApi('/game-commit/coins/Copper/modify', 'POST', {
    bonus: 1.5,
    userId: 'user789'
  });
}

async function testItemCommit() {
  console.log('\n' + '='.repeat(60));
  console.log('TESTING ITEM ENDPOINTS');
  console.log('='.repeat(60));

  // Test mint item
  await callApi('/game-commit/items/Iron Sword/mint', 'POST', {
    quantity: 1,
    userId: 'user123',
    source: 'crafting'
  });

  // Test burn item
  await callApi('/game-commit/items/Wooden Shield/burn', 'POST', {
    quantity: 1,
    userId: 'user456',
    reason: 'salvage'
  });

  // Test modify item
  await callApi('/game-commit/items/Steel Helmet/modify', 'POST', {
    durability: 85,
    userId: 'user789',
    enchantment: 'protection'
  });
}

async function testCharacterCommit() {
  console.log('\n' + '='.repeat(60));
  console.log('TESTING CHARACTER ENDPOINTS');
  console.log('='.repeat(60));

  // Test mint character
  await callApi('/game-commit/characters/Wizard/mint', 'POST', {
    level: 1,
    userId: 'user123',
    class: 'mage'
  });

  // Test burn character
  await callApi('/game-commit/characters/Warrior/burn', 'POST', {
    userId: 'user456',
    reason: 'character_reset'
  });

  // Test modify character
  await callApi('/game-commit/characters/Archer/modify', 'POST', {
    level: 10,
    userId: 'user789',
    experience: 5000
  });
}

// Custom test with specific parameters
async function customTest(resourceType, name, action, payload) {
  console.log('\n' + '='.repeat(60));
  console.log('CUSTOM TEST');
  console.log('='.repeat(60));

  const endpoint = `/game-commit/${resourceType}/${encodeURIComponent(name)}/${action}`;
  await callApi(endpoint, 'POST', payload);
}

// Main execution
async function main() {
  console.log('🚀 Starting Game Commit API Test Suite');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log('⏳ Waiting for server to be ready...\n');

  // Wait a moment for the server to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));

  try {
    // Run all tests
    await testResourceCommit();
    await testCoinCommit();
    await testItemCommit();
    await testCharacterCommit();

    // Example custom test
    console.log('\n' + '='.repeat(60));
    console.log('CUSTOM TEST EXAMPLE');
    console.log('='.repeat(60));
    await customTest('resources', 'Mythril Ore', 'mint', {
      amount: 25,
      userId: 'custom_user_001',
      rarity: 'legendary',
      location: 'deep_mines'
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
