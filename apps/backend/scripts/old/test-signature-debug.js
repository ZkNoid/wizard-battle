const { ethers } = require('ethers');
require('dotenv').config();

async function testSignature() {
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  const signer = new ethers.Wallet(
    process.env.GAME_SIGNER_PRIVATE_KEY,
    provider
  );
  const gameRegistryAddress = process.env.GAME_REGISTRY_ADDRESS;

  console.log('🔍 Testing Signature Generation and Recovery\n');
  console.log('Signer address:', await signer.getAddress());
  console.log('GameRegistry:', gameRegistryAddress);

  // Test data
  const target = '0xc6e7DF5E7b4f2A278906862b61205850344D4e7d'; // WBResources
  const account = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'; // Player
  const signerAddress = await signer.getAddress();
  const nonce = 0;
  const callData =
    '0x731133e900000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000003e800000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000';

  const chainId = (await provider.getNetwork()).chainId;

  // Create EIP-712 domain
  const domain = {
    name: 'GameRegistry',
    version: '1',
    chainId: Number(chainId),
    verifyingContract: gameRegistryAddress,
  };

  // Define EIP-712 types
  const types = {
    CommitStruct: [
      { name: 'target', type: 'address' },
      { name: 'account', type: 'address' },
      { name: 'signer', type: 'address' },
      { name: 'nonce', type: 'uint256' },
      { name: 'callData', type: 'bytes' },
    ],
  };

  // Create value object
  const value = {
    target,
    account,
    signer: signerAddress,
    nonce,
    callData,
  };

  console.log('\n📋 Domain:');
  console.log(JSON.stringify(domain, null, 2));

  console.log('\n📋 Value:');
  console.log(JSON.stringify(value, null, 2));

  // Sign typed data
  const signature = await signer.signTypedData(domain, types, value);
  console.log('\n✍️  Signature:', signature);

  // Try to recover the signer
  const digest = ethers.TypedDataEncoder.hash(domain, types, value);
  console.log('\n🔐 Message digest:', digest);

  const recovered = ethers.recoverAddress(digest, signature);
  console.log('\n👤 Recovered signer:', recovered);
  console.log('   Expected signer:', signerAddress);
  console.log(
    '   Match:',
    recovered.toLowerCase() === signerAddress.toLowerCase()
  );

  // Also try on-chain verification
  console.log('\n📡 Testing on-chain...');
  const gameRegistry = new ethers.Contract(
    gameRegistryAddress,
    [
      'function MESSAGE_TYPEHASH() view returns (bytes32)',
      'function eip712Domain() view returns (bytes1 fields, string name, string version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] extensions)',
    ],
    provider
  );

  try {
    const messageTypehash = await gameRegistry.MESSAGE_TYPEHASH();
    console.log('   MESSAGE_TYPEHASH:', messageTypehash);

    const domainData = await gameRegistry.eip712Domain();
    console.log('   EIP-712 Domain from contract:');
    console.log('     Name:', domainData.name);
    console.log('     Version:', domainData.version);
    console.log('     ChainId:', domainData.chainId.toString());
    console.log('     VerifyingContract:', domainData.verifyingContract);
  } catch (e) {
    console.log('   Could not query domain:', e.message);
  }
}

testSignature().catch(console.error);
