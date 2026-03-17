/**
 * Tournament Manager Deployment Script
 *
 * Deploy TournamentManager contract to Mina testnet and create initial tournament.
 *
 * Usage:
 *   pnpm --filter mina-contracts run deploy:testnet
 *
 * Environment variables:
 *   MINA_NETWORK_URL - Mina GraphQL endpoint (default: devnet)
 *   DEPLOYER_PRIVATE_KEY - Private key for deployment account (must have MINA)
 *   TICKET_PRICE - Tournament ticket price in nanoMINA (default: 1000000000 = 1 MINA)
 */

import {
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate,
  Field,
  UInt32,
  UInt64,
  MerkleMap,
  fetchAccount,
  Poseidon,
} from 'o1js';
import {
  TournamentManager,
  TournamentConfig,
} from '../src/TournamentManager.js';

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
  console.log(`Contract private key: ${contractKey.toBase58()}`);
  console.log(
    '\n⚠️  SAVE THE PRIVATE KEY ABOVE - you will need it for admin operations\n'
  );

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
  await waitForTransaction(deployResult.hash);
  console.log('Contract deployed successfully!');

  // Fetch contract state
  await fetchAccount({ publicKey: contractAddress });

  // Create initial tournament
  console.log('\nCreating initial tournament...');

  const tournamentId = Field(1);
  const ticketPrice = BigInt(process.env.TICKET_PRICE || '1000000000'); // 1 MINA default

  // Calculate slot timings (roughly)
  // Mina slots are ~3 minutes each
  const networkState = await Mina.getNetworkState();
  const currentSlot = Number(networkState.globalSlotSinceGenesis.toBigint());

  const registrationStartSlot = currentSlot + 10; // Start in ~30 minutes
  const battleStartSlot = registrationStartSlot + 200; // Registration for ~10 hours
  const battleEndSlot = battleStartSlot + 400; // Battle for ~20 hours

  console.log(`Current slot: ${currentSlot}`);
  console.log(`Registration starts: slot ${registrationStartSlot}`);
  console.log(`Battle starts: slot ${battleStartSlot}`);
  console.log(`Battle ends: slot ${battleEndSlot}`);

  const config = new TournamentConfig({
    ticketPrice: UInt64.from(ticketPrice),
    prize1Percent: UInt32.from(5000), // 50%
    prize2Percent: UInt32.from(3000), // 30%
    prize3Percent: UInt32.from(2000), // 20%
  });

  const emptyMap = new MerkleMap();
  const tournamentWitness = emptyMap.getWitness(
    (TournamentManager.prototype['constructor'] as any).keyFor
      ? Field(0) // Fallback
      : hashTournamentKey(tournamentId)
  );

  const createTx = await Mina.transaction(
    { sender: deployer, fee: 0.1e9 },
    async () => {
      await contract.createTournament(
        tournamentId,
        config,
        UInt32.from(registrationStartSlot),
        UInt32.from(battleStartSlot),
        UInt32.from(battleEndSlot),
        tournamentWitness
      );
    }
  );
  await createTx.prove();
  const createResult = await createTx.sign([deployerKey]).send();
  console.log(`Create tournament transaction hash: ${createResult.hash}`);

  // Wait for confirmation
  console.log('Waiting for tournament creation confirmation...');
  await waitForTransaction(createResult.hash);

  // Output summary
  console.log('\n' + '='.repeat(60));
  console.log('DEPLOYMENT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Contract Address: ${contractAddress.toBase58()}`);
  console.log(`Tournament ID: ${tournamentId.toString()}`);
  console.log(`Ticket Price: ${Number(ticketPrice) / 1e9} MINA`);
  console.log(`Registration Start Slot: ${registrationStartSlot}`);
  console.log(`Battle Start Slot: ${battleStartSlot}`);
  console.log(`Battle End Slot: ${battleEndSlot}`);
  console.log('\nAdd to .env:');
  console.log(`TOURNAMENT_CONTRACT_ADDRESS=${contractAddress.toBase58()}`);
  console.log('='.repeat(60));
}

function hashTournamentKey(tournamentId: Field): Field {
  return Poseidon.hash([tournamentId]);
}

async function waitForTransaction(
  hash: string,
  timeoutMs = 120000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(MINA_NETWORK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query GetTransactionStatus($hash: String!) {
              transactionStatus(zkappTransaction: $hash)
            }
          `,
          variables: { hash },
        }),
      });

      const data = await response.json();
      const status = data?.data?.transactionStatus;

      if (status === 'INCLUDED') {
        return;
      }
      if (status === 'FAILED') {
        throw new Error(`Transaction ${hash} failed`);
      }
    } catch (e) {
      // Continue waiting
    }

    await new Promise((resolve) => setTimeout(resolve, 10000));
    process.stdout.write('.');
  }

  console.log(
    '\nWarning: Transaction confirmation timed out, may still be pending'
  );
}

main().catch((err) => {
  console.error('Deployment failed:', err);
  process.exit(1);
});
