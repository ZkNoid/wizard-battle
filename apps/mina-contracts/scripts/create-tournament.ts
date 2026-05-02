/**
 * Create Tournament Script
 *
 * Fetches events from deployed TournamentManager contract, rebuilds merkle map state,
 * and creates the next available tournament.
 *
 * Usage:
 *   pnpm --filter mina-contracts run create-tournament -- --title "Spring Cup" --image-url /tournaments/custom.png
 *
 * Required CLI flags (after `--` when using pnpm):
 *   --title, -t       — Display title (backend + UI)
 *   --image-url, -i   — Image URL (absolute or site-relative)
 *
 * Optional CLI flags:
 *   --description, -d — Tournament description text
 *   --sponsors, -s    — JSON array of sponsor objects: '[{"name":"Foo","url":"https://foo.com"}]'
 *   --config, -c      — Path to a JSON config file with any of the above fields
 *
 * Environment variables:
 *   MINA_NETWORK_URL - Mina GraphQL endpoint (default: devnet)
 *   MINA_ARCHIVE_URL - Mina Archive GraphQL endpoint
 *   DEPLOYER_PRIVATE_KEY - Private key for admin account
 *   TOURNAMENT_CONTRACT_ADDRESS - Deployed contract address
 *   TICKET_PRICE - Tournament ticket price in nanoMINA (default: 1000000000 = 1 MINA)
 *   BATTLE_START_DELAY - Slots until battle opens for joining (default: 10 = ~30 min)
 *   BATTLE_SLOTS - Number of slots for battle phase / join window (default: 400 = ~20 hours)
 *   BACKEND_URL - Backend API base URL (default: http://localhost:3001)
 *
 * If `createResult.wait()` throws or backend registration fails after the tx is sent, the
 * POST body is written under keys/tournament/pending-backend/ (wait failures set
 * confirmationUncertain on the saved file). Retry with:
 * pnpm --filter mina-contracts run retry-pending-backend-tournaments
 */
import dotenv from 'dotenv';
dotenv.config();
import { savePendingBackendPayload } from './pending-backend-tournament-store.js';
import {
  Mina,
  PrivateKey,
  PublicKey,
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
  TournamentLeaf,
  TournamentStatus,
  TournamentCreatedEvent,
  TicketPurchasedEvent,
  TournamentFinalizedEvent,
  PrizeClaimedEvent,
} from '../src/TournamentManager.js';
import { parseRequiredTournamentDisplayArgs } from './tournament-display-cli.js';

const MINA_NETWORK_URL =
  process.env.MINA_NETWORK_URL ||
  'https://api.minascan.io/node/devnet/v1/graphql';

const MINA_ARCHIVE_URL =
  process.env.MINA_ARCHIVE_URL ||
  'https://api.minascan.io/archive/devnet/v1/graphql';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

async function fetchCurrentSlot(): Promise<number> {
  const query = `
    query {
      bestChain(maxLength: 1) {
        protocolState {
          consensusState {
            slotSinceGenesis
          }
        }
      }
    }
  `;

  const response = await fetch(MINA_NETWORK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  const result = await response.json();

  if (result.errors) {
    throw new Error(
      `Failed to fetch current slot: ${JSON.stringify(result.errors)}`
    );
  }

  const slot =
    result.data?.bestChain?.[0]?.protocolState?.consensusState
      ?.slotSinceGenesis;
  if (slot === undefined) {
    throw new Error('Could not parse slot from GraphQL response');
  }

  return Number(slot);
}

// Tournament timing configuration (~3 minutes per slot on typical networks)
const BATTLE_START_DELAY = Number(process.env.BATTLE_START_DELAY || '10');
const BATTLE_SLOTS = Number(process.env.BATTLE_SLOTS || '400');

interface TournamentState {
  leaf: TournamentLeaf;
  participantsMap: MerkleMap;
  winnersMap: MerkleMap;
}

function hashTournamentKey(tournamentId: Field): Field {
  return Poseidon.hash([tournamentId]);
}

async function fetchContractEvents(contractAddress: PublicKey): Promise<{
  tournamentCreated: TournamentCreatedEvent[];
  ticketPurchased: TicketPurchasedEvent[];
  tournamentFinalized: TournamentFinalizedEvent[];
  prizeClaimed: PrizeClaimedEvent[];
}> {
  console.log('Fetching contract events from archive...');
  const tournament = new TournamentManager(contractAddress);

  const events = await tournament.fetchEvents();
  console.log(`Found ${events.length} events`);

  const tournamentCreated: TournamentCreatedEvent[] = [];
  const ticketPurchased: TicketPurchasedEvent[] = [];
  const tournamentFinalized: TournamentFinalizedEvent[] = [];
  const prizeClaimed: PrizeClaimedEvent[] = [];

  for (const eventRecord of events) {
    const eventData = eventRecord.event.data;

    switch (eventRecord.type) {
      case 'TournamentCreated':
        tournamentCreated.push(eventData as unknown as TournamentCreatedEvent);
        break;
      case 'TicketPurchased':
        ticketPurchased.push(eventData as unknown as TicketPurchasedEvent);
        break;
      case 'TournamentFinalized':
        tournamentFinalized.push(
          eventData as unknown as TournamentFinalizedEvent
        );
        break;
      case 'PrizeClaimed':
        prizeClaimed.push(eventData as unknown as PrizeClaimedEvent);
        break;
      default:
        console.warn(`Unknown event type: ${eventRecord.type}`);
    }
  }

  console.log(`Parsed events:`);
  console.log(`  - TournamentCreated: ${tournamentCreated.length}`);
  console.log(`  - TicketPurchased: ${ticketPurchased.length}`);
  console.log(`  - TournamentFinalized: ${tournamentFinalized.length}`);
  console.log(`  - PrizeClaimed: ${prizeClaimed.length}`);

  return {
    tournamentCreated,
    ticketPurchased,
    tournamentFinalized,
    prizeClaimed,
  };
}

function rebuildTournamentsMap(events: {
  tournamentCreated: TournamentCreatedEvent[];
  ticketPurchased: TicketPurchasedEvent[];
  tournamentFinalized: TournamentFinalizedEvent[];
  prizeClaimed: PrizeClaimedEvent[];
}): {
  tournamentsMap: MerkleMap;
  tournaments: Map<string, TournamentState>;
  maxTournamentId: number;
} {
  console.log('\nRebuilding tournaments merkle map from events...');

  const tournamentsMap = new MerkleMap();
  const tournaments = new Map<string, TournamentState>();
  let maxTournamentId = 0;

  for (const event of events.tournamentCreated) {
    const tournamentIdNum = Number(event.tournamentId.toBigInt());
    maxTournamentId = Math.max(maxTournamentId, tournamentIdNum);

    const leaf = new TournamentLeaf({
      status: TournamentStatus.Battle,
      battleStartSlot: event.battleStartSlot,
      battleEndSlot: event.battleEndSlot,
      ticketPrice: event.ticketPrice,
      prize1Percent: event.prize1Percent,
      prize2Percent: event.prize2Percent,
      prize3Percent: event.prize3Percent,
      participantsRoot: new MerkleMap().getRoot(),
      winnersRoot: new MerkleMap().getRoot(),
      prizePool: UInt64.from(0),
      participantCount: UInt32.from(0),
    });

    const key = hashTournamentKey(event.tournamentId);
    tournamentsMap.set(key, leaf.hash());

    tournaments.set(event.tournamentId.toString(), {
      leaf,
      participantsMap: new MerkleMap(),
      winnersMap: new MerkleMap(),
    });

    console.log(`  Created tournament ${tournamentIdNum}`);
  }

  for (const event of events.ticketPurchased) {
    const tournamentId = event.tournamentId.toString();
    const state = tournaments.get(tournamentId);

    if (state) {
      state.leaf = new TournamentLeaf({
        status: state.leaf.status,
        battleStartSlot: state.leaf.battleStartSlot,
        battleEndSlot: state.leaf.battleEndSlot,
        ticketPrice: state.leaf.ticketPrice,
        prize1Percent: state.leaf.prize1Percent,
        prize2Percent: state.leaf.prize2Percent,
        prize3Percent: state.leaf.prize3Percent,
        participantsRoot: event.newParticipantsRoot,
        winnersRoot: state.leaf.winnersRoot,
        prizePool: event.newPrizePool,
        participantCount: event.newParticipantCount,
      });

      const playerKey = Poseidon.hash(event.player.toFields());
      state.participantsMap.set(playerKey, Field(1));

      const key = hashTournamentKey(event.tournamentId);
      tournamentsMap.set(key, state.leaf.hash());
    }
  }

  for (const event of events.tournamentFinalized) {
    const tournamentId = event.tournamentId.toString();
    const state = tournaments.get(tournamentId);

    if (state) {
      state.leaf = new TournamentLeaf({
        status: TournamentStatus.Claiming,
        battleStartSlot: state.leaf.battleStartSlot,
        battleEndSlot: state.leaf.battleEndSlot,
        ticketPrice: state.leaf.ticketPrice,
        prize1Percent: state.leaf.prize1Percent,
        prize2Percent: state.leaf.prize2Percent,
        prize3Percent: state.leaf.prize3Percent,
        participantsRoot: state.leaf.participantsRoot,
        winnersRoot: event.newWinnersRoot,
        prizePool: state.leaf.prizePool,
        participantCount: state.leaf.participantCount,
      });

      const key = hashTournamentKey(event.tournamentId);
      tournamentsMap.set(key, state.leaf.hash());
    }
  }

  for (const event of events.prizeClaimed) {
    const tournamentId = event.tournamentId.toString();
    const state = tournaments.get(tournamentId);

    if (state) {
      state.leaf = new TournamentLeaf({
        status: state.leaf.status,
        battleStartSlot: state.leaf.battleStartSlot,
        battleEndSlot: state.leaf.battleEndSlot,
        ticketPrice: state.leaf.ticketPrice,
        prize1Percent: state.leaf.prize1Percent,
        prize2Percent: state.leaf.prize2Percent,
        prize3Percent: state.leaf.prize3Percent,
        participantsRoot: state.leaf.participantsRoot,
        winnersRoot: event.newWinnersRoot,
        prizePool: state.leaf.prizePool,
        participantCount: state.leaf.participantCount,
      });

      const key = hashTournamentKey(event.tournamentId);
      tournamentsMap.set(key, state.leaf.hash());
    }
  }

  console.log(`Rebuilt map with ${tournaments.size} tournaments`);
  console.log(`Max tournament ID: ${maxTournamentId}`);

  return { tournamentsMap, tournaments, maxTournamentId };
}

async function main() {
  console.log('='.repeat(60));
  console.log('Create Tournament Script');
  console.log('='.repeat(60));

  const {
    title: tournamentTitle,
    imageUrl: tournamentImageUrl,
    description: tournamentDescription,
    sponsors: tournamentSponsors,
  } = parseRequiredTournamentDisplayArgs(process.argv);

  // Check required environment variables
  const deployerKeyBase58 = process.env.DEPLOYER_PRIVATE_KEY;
  if (!deployerKeyBase58) {
    console.error('ERROR: DEPLOYER_PRIVATE_KEY environment variable not set');
    process.exit(1);
  }

  const contractAddressBase58 = process.env.TOURNAMENT_CONTRACT_ADDRESS;
  if (!contractAddressBase58) {
    console.error(
      'ERROR: TOURNAMENT_CONTRACT_ADDRESS environment variable not set'
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

  // Setup accounts
  const deployerKey = PrivateKey.fromBase58(deployerKeyBase58);
  const deployer = deployerKey.toPublicKey();
  const contractAddress = PublicKey.fromBase58(contractAddressBase58);

  console.log(`Admin address: ${deployer.toBase58()}`);
  console.log(`Contract address: ${contractAddress.toBase58()}`);

  // Fetch accounts
  console.log('\nFetching accounts...');
  const [deployerAccount, contractAccount] = await Promise.all([
    fetchAccount({ publicKey: deployer }),
    fetchAccount({ publicKey: contractAddress }),
  ]);

  if (!deployerAccount.account) {
    console.error('ERROR: Deployer account not found');
    process.exit(1);
  }
  console.log(
    `Admin balance: ${
      Number(deployerAccount.account.balance.toBigInt()) / 1e9
    } MINA`
  );

  if (!contractAccount.account) {
    console.error('ERROR: Contract account not found. Has it been deployed?');
    process.exit(1);
  }

  // Fetch and process events
  const events = await fetchContractEvents(contractAddress);

  console.log('Events:', events);

  // Rebuild merkle map state
  const { tournamentsMap, maxTournamentId } = rebuildTournamentsMap(events);

  // Verify rebuilt root matches on-chain root
  const contract = new TournamentManager(contractAddress);
  const onChainRoot = contract.tournamentsRoot.get();
  const rebuiltRoot = tournamentsMap.getRoot();

  console.log(`\nOn-chain tournaments root: ${onChainRoot.toString()}`);
  console.log(`Rebuilt tournaments root:  ${rebuiltRoot.toString()}`);

  if (!onChainRoot.equals(rebuiltRoot).toBoolean()) {
    console.error('ERROR: Rebuilt root does not match on-chain root!');
    console.error('This may indicate missing events or state corruption.');
    process.exit(1);
  }
  console.log('✓ Root verification passed');

  // Compile contract
  console.log('\nCompiling TournamentManager...');
  const startCompile = Date.now();
  await TournamentManager.compile();
  console.log(`Compilation completed in ${Date.now() - startCompile}ms`);

  // Determine next tournament ID
  const nextTournamentId = Field(maxTournamentId + 1);
  console.log(`\nNext tournament ID: ${nextTournamentId.toString()}`);

  // Get tournament configuration from env
  const ticketPrice = BigInt(process.env.TICKET_PRICE || '1000000000'); // 1 MINA default

  // Calculate slot timings
  console.log('\nFetching current slot from GraphQL...');
  const currentSlot = await fetchCurrentSlot();

  const battleStartSlot = currentSlot + BATTLE_START_DELAY;
  const battleEndSlot = battleStartSlot + BATTLE_SLOTS;

  console.log(`\nTournament timing:`);
  console.log(`  Current slot: ${currentSlot}`);
  console.log(
    `  Battle window (join anytime): slots ${battleStartSlot} → ${battleEndSlot} (~${
      BATTLE_START_DELAY * 3
    } min until open, then ~${BATTLE_SLOTS * 3} min window)`
  );

  const config = new TournamentConfig({
    ticketPrice: UInt64.from(ticketPrice),
    prize1Percent: UInt32.from(5000), // 50%
    prize2Percent: UInt32.from(3000), // 30%
    prize3Percent: UInt32.from(2000), // 20%
  });

  // Get witness for new tournament (should be empty slot)
  const tournamentKey = hashTournamentKey(nextTournamentId);
  const tournamentWitness = tournamentsMap.getWitness(tournamentKey);

  console.log('\nCreating tournament transaction...');
  const createTx = await Mina.transaction(
    { sender: deployer, fee: 0.1e9 },
    async () => {
      await contract.createTournament(
        nextTournamentId,
        config,
        UInt32.from(battleStartSlot),
        UInt32.from(battleEndSlot),
        tournamentWitness
      );
    }
  );

  console.log('Proving transaction...');
  await createTx.prove();

  console.log('Sending transaction...');
  const createResult = await createTx.sign([deployerKey]).send();
  console.log(`Transaction hash: ${createResult.hash}`);

  // Optimistic root for backend POST — matches chain iff create tx succeeds
  const newLeaf = new TournamentLeaf({
    status: TournamentStatus.Battle,
    battleStartSlot: UInt32.from(battleStartSlot),
    battleEndSlot: UInt32.from(battleEndSlot),
    ticketPrice: UInt64.from(ticketPrice),
    prize1Percent: UInt32.from(5000),
    prize2Percent: UInt32.from(3000),
    prize3Percent: UInt32.from(2000),
    participantsRoot: new MerkleMap().getRoot(),
    winnersRoot: new MerkleMap().getRoot(),
    prizePool: UInt64.from(0),
    participantCount: UInt32.from(0),
  });
  tournamentsMap.set(tournamentKey, newLeaf.hash());
  const newTournamentsRoot = tournamentsMap.getRoot().toString();

  const backendPayloadObject = {
    tournamentId: nextTournamentId.toString(),
    ticketPrice: ticketPrice.toString(),
    prize1Percent: 5000,
    prize2Percent: 3000,
    prize3Percent: 2000,
    battleStartSlot,
    battleEndSlot,
    tournamentsRoot: newTournamentsRoot,
    txHash: createResult.hash,
    title: tournamentTitle,
    imageUrl: tournamentImageUrl,
    ...(tournamentDescription ? { description: tournamentDescription } : {}),
    ...(tournamentSponsors && tournamentSponsors.length > 0
      ? { sponsors: tournamentSponsors }
      : {}),
  };
  const backendPayload = JSON.stringify(backendPayloadObject);

  console.log('Waiting for confirmation...');
  try {
    await createResult.wait();
  } catch (waitErr) {
    const savedPath = savePendingBackendPayload(backendPayloadObject, {
      confirmationUncertain: true,
    });
    console.error(
      'Transaction was sent but confirmation failed (timeout or network error).',
      waitErr
    );
    console.error(
      `State may be out of sync until you verify tx ${createResult.hash} on-chain.\n` +
        `Payload saved: ${savedPath}\n` +
        'After the tx confirms, run: pnpm --filter mina-contracts run retry-pending-backend-tournaments\n' +
        'If tournamentsRoot does not match chain, use sync-tournaments instead.'
    );
    process.exit(1);
  }

  // Register tournament in the backend (with retries for pending tx)
  console.log('\nRegistering tournament in backend...');

  const MAX_RETRIES = 12;
  const INITIAL_DELAY_MS = 30_000; // 30 s — Mina blocks take ~3 min
  const BACKOFF_MULTIPLIER = 1.5;
  const MAX_DELAY_MS = 5 * 60_000; // 5 min cap

  let attempt = 0;
  let delayMs = INITIAL_DELAY_MS;
  let backendRegistered = false;

  while (attempt <= MAX_RETRIES) {
    try {
      const backendResponse = await fetch(`${BACKEND_URL}/tournament`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: backendPayload,
      });

      if (backendResponse.ok) {
        const result = await backendResponse.json();
        console.log(`Backend registration successful: ${result.message}`);
        backendRegistered = true;
        break;
      }

      const errorBody = await backendResponse.text();

      // 409 = transaction still pending — wait and retry
      if (backendResponse.status === 409) {
        if (attempt >= MAX_RETRIES) {
          console.error(
            `Backend registration failed after ${MAX_RETRIES} retries: transaction never confirmed. Last error: ${errorBody}`
          );
          break;
        }
        console.log(
          `Attempt ${attempt + 1}/${MAX_RETRIES}: tx still pending. ` +
            `Waiting ${Math.round(delayMs / 1000)}s before next retry...`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs = Math.min(delayMs * BACKOFF_MULTIPLIER, MAX_DELAY_MS);
        attempt++;
        continue;
      }

      // Any other non-OK status is a hard failure — don't retry
      console.error(
        `Backend registration failed (${backendResponse.status}): ${errorBody}`
      );
      break;
    } catch (err) {
      console.error('Failed to reach backend:', err);
      if (attempt >= MAX_RETRIES) {
        console.error('Tournament was created on-chain but not in the backend DB.');
        console.error(
          'You may need to register it manually or wait for chain sync.'
        );
        break;
      }
      console.log(
        `Network error on attempt ${attempt + 1}/${MAX_RETRIES}. ` +
          `Waiting ${Math.round(delayMs / 1000)}s before next retry...`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs = Math.min(delayMs * BACKOFF_MULTIPLIER, MAX_DELAY_MS);
      attempt++;
    }
  }

  if (!backendRegistered) {
    const savedPath = savePendingBackendPayload(backendPayloadObject);
    console.warn(
      'Tournament was created on-chain but backend registration did not complete. ' +
        `Payload saved for retry: ${savedPath}\n` +
        'Run: pnpm --filter mina-contracts run retry-pending-backend-tournaments\n' +
        'Or POST manually to /tournament with txHash: ' +
        createResult.hash
    );
  }

  // Output summary
  console.log('\n' + '='.repeat(60));
  console.log('TOURNAMENT CREATED');
  console.log('='.repeat(60));
  console.log(`Tournament ID: ${nextTournamentId.toString()}`);
  console.log(`Ticket Price: ${Number(ticketPrice) / 1e9} MINA`);
  console.log(`Battle Start Slot: ${battleStartSlot}`);
  console.log(`Battle End Slot: ${battleEndSlot}`);
  console.log(`Tournaments Root: ${newTournamentsRoot}`);
  console.log(`Display title: ${tournamentTitle}`);
  console.log(`Image URL: ${tournamentImageUrl}`);
  if (tournamentDescription) {
    console.log(`Description: ${tournamentDescription}`);
  }
  if (tournamentSponsors && tournamentSponsors.length > 0) {
    console.log(`Sponsors: ${tournamentSponsors.map((s) => s.name).join(', ')}`);
  }
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('Failed to create tournament:', err);
  process.exit(1);
});
