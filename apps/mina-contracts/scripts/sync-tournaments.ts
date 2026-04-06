/**
 * Sync Tournaments Script
 *
 * Fetches all events from the deployed TournamentManager contract,
 * rebuilds merkle state, verifies it matches on-chain root,
 * and creates any tournaments in the backend that are missing.
 *
 * Usage:
 *   pnpm --filter mina-contracts run sync-tournaments
 *
 * Environment variables:
 *   MINA_NETWORK_URL - Mina GraphQL endpoint (default: devnet)
 *   MINA_ARCHIVE_URL - Mina Archive GraphQL endpoint
 *   TOURNAMENT_CONTRACT_ADDRESS - Deployed contract address
 *   BACKEND_URL - Backend API base URL (default: http://localhost:3001)
 */
import dotenv from 'dotenv';
dotenv.config();
import {
  Mina,
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
  TournamentLeaf,
  TournamentStatus,
  TournamentCreatedEvent,
  TicketPurchasedEvent,
  TournamentFinalizedEvent,
  PrizeClaimedEvent,
} from '../src/TournamentManager.js';

const MINA_NETWORK_URL =
  process.env.MINA_NETWORK_URL ||
  'https://api.minascan.io/node/devnet/v1/graphql';

const MINA_ARCHIVE_URL =
  process.env.MINA_ARCHIVE_URL ||
  'https://api.minascan.io/archive/devnet/v1/graphql';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

function hashTournamentKey(tournamentId: Field): Field {
  return Poseidon.hash([tournamentId]);
}

interface TournamentState {
  leaf: TournamentLeaf;
  participantsMap: MerkleMap;
  winnersMap: MerkleMap;
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

  return { tournamentCreated, ticketPurchased, tournamentFinalized, prizeClaimed };
}

function rebuildTournamentsMap(events: {
  tournamentCreated: TournamentCreatedEvent[];
  ticketPurchased: TicketPurchasedEvent[];
  tournamentFinalized: TournamentFinalizedEvent[];
  prizeClaimed: PrizeClaimedEvent[];
}): {
  tournamentsMap: MerkleMap;
  tournaments: Map<string, TournamentState>;
} {
  console.log('\nRebuilding tournaments merkle map from events...');

  const tournamentsMap = new MerkleMap();
  const tournaments = new Map<string, TournamentState>();

  for (const event of events.tournamentCreated) {
    const leaf = new TournamentLeaf({
      status: TournamentStatus.Registration,
      registrationStartSlot: event.registrationStartSlot,
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
  }

  for (const event of events.ticketPurchased) {
    const state = tournaments.get(event.tournamentId.toString());
    if (state) {
      state.leaf = new TournamentLeaf({
        status: state.leaf.status,
        registrationStartSlot: state.leaf.registrationStartSlot,
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
    const state = tournaments.get(event.tournamentId.toString());
    if (state) {
      state.leaf = new TournamentLeaf({
        status: TournamentStatus.Claiming,
        registrationStartSlot: state.leaf.registrationStartSlot,
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
    const state = tournaments.get(event.tournamentId.toString());
    if (state) {
      state.leaf = new TournamentLeaf({
        status: state.leaf.status,
        registrationStartSlot: state.leaf.registrationStartSlot,
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

  return { tournamentsMap, tournaments };
}

async function backendTournamentExists(tournamentId: string): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/tournament/${tournamentId}`);
    return response.ok;
  } catch {
    return false;
  }
}

async function createTournamentInBackend(
  tournamentId: string,
  event: TournamentCreatedEvent,
  tournamentsRoot: string
): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/tournament`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tournamentId,
        ticketPrice: event.ticketPrice.toBigInt().toString(),
        prize1Percent: Number(event.prize1Percent.toBigint()),
        prize2Percent: Number(event.prize2Percent.toBigint()),
        prize3Percent: Number(event.prize3Percent.toBigint()),
        registrationStartSlot: Number(event.registrationStartSlot.toBigint()),
        battleStartSlot: Number(event.battleStartSlot.toBigint()),
        battleEndSlot: Number(event.battleEndSlot.toBigint()),
        tournamentsRoot,
      }),
    });

    if (response.ok) {
      return true;
    }

    const body = await response.text();
    console.error(`  Backend returned ${response.status}: ${body}`);
    return false;
  } catch (err) {
    console.error(`  Request failed:`, err);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Sync Tournaments Script');
  console.log('='.repeat(60));

  const contractAddressBase58 = process.env.TOURNAMENT_CONTRACT_ADDRESS;
  if (!contractAddressBase58) {
    console.error(
      'ERROR: TOURNAMENT_CONTRACT_ADDRESS environment variable not set'
    );
    process.exit(1);
  }

  console.log(`\nConnecting to: ${MINA_NETWORK_URL}`);
  const network = Mina.Network({
    mina: MINA_NETWORK_URL,
    archive: MINA_ARCHIVE_URL,
  });
  Mina.setActiveInstance(network);

  const contractAddress = PublicKey.fromBase58(contractAddressBase58);
  console.log(`Contract address: ${contractAddress.toBase58()}`);
  console.log(`Backend URL: ${BACKEND_URL}`);

  await fetchAccount({ publicKey: contractAddress });

  const events = await fetchContractEvents(contractAddress);
  const { tournamentsMap } = rebuildTournamentsMap(events);

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
  console.log('✓ Root verification passed\n');

  const tournamentsRoot = rebuiltRoot.toString();

  // Sync each tournament to backend
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const event of events.tournamentCreated) {
    const tournamentId = event.tournamentId.toString();

    const exists = await backendTournamentExists(tournamentId);
    if (exists) {
      console.log(`[SKIP] Tournament ${tournamentId} — already in backend`);
      skipped++;
      continue;
    }

    console.log(`[SYNC] Tournament ${tournamentId} — creating in backend...`);
    const ok = await createTournamentInBackend(
      tournamentId,
      event,
      tournamentsRoot
    );

    if (ok) {
      console.log(`  ✓ Created successfully`);
      created++;
    } else {
      console.error(`  ✗ Failed to create`);
      failed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SYNC COMPLETE');
  console.log('='.repeat(60));
  console.log(`Total on-chain tournaments: ${events.tournamentCreated.length}`);
  console.log(`Created in backend:         ${created}`);
  console.log(`Already existed (skipped):  ${skipped}`);
  console.log(`Failed:                     ${failed}`);
  console.log('='.repeat(60));

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
