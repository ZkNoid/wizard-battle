/**
 * Sync Tournaments Script
 *
 * Fetches all events from the deployed TournamentManager contract,
 * rebuilds merkle state, verifies it matches on-chain root,
 * and creates any tournaments in the backend that are missing.
 *
 * Usage:
 *   pnpm --filter mina-contracts run sync-tournaments -- --title "Backfill" --image-url /tournaments/x.png
 *
 * Required CLI flags (after `--` when using pnpm): same as create-tournament
 * (--title / -t, --image-url / -i). Applied to each tournament POSTed to the backend.
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
  PrizePercentSetEvent,
  TicketPurchasedEvent,
  SponsorFundedEvent,
  TournamentFinalizedEvent,
  WinnerAllocatedEvent,
  PrizeClaimedEvent,
  UnclaimedRecoveredEvent,
  NUM_WINNERS,
} from '../src/TournamentManager.js';
import { parseRequiredTournamentDisplayArgs } from './tournament-display-cli.js';

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

interface ContractEventBundle {
  tournamentCreated: TournamentCreatedEvent[];
  prizePercentSet: PrizePercentSetEvent[];
  ticketPurchased: TicketPurchasedEvent[];
  sponsorFunded: SponsorFundedEvent[];
  tournamentFinalized: TournamentFinalizedEvent[];
  winnerAllocated: WinnerAllocatedEvent[];
  prizeClaimed: PrizeClaimedEvent[];
  unclaimedRecovered: UnclaimedRecoveredEvent[];
}

/**
 * Reassemble per-tournament `prizePercents` (length NUM_WINNERS) from the
 * fan-out `PrizePercentSet` events. Mirrors `replay-events.ts` so both
 * scripts agree on how to recover the array from per-place events.
 */
function aggregatePrizePercents(
  events: PrizePercentSetEvent[]
): Map<string, UInt32[]> {
  const out = new Map<string, UInt32[]>();
  for (const ev of events) {
    const id = ev.tournamentId.toString();
    let arr = out.get(id);
    if (!arr) {
      arr = Array.from({ length: NUM_WINNERS }, () => UInt32.from(0));
      out.set(id, arr);
    }
    const place = Number(ev.place.toBigint());
    if (place >= 0 && place < NUM_WINNERS) {
      arr[place] = ev.percent;
    }
  }
  return out;
}

async function fetchContractEvents(
  contractAddress: PublicKey
): Promise<ContractEventBundle> {
  console.log('Fetching contract events from archive...');
  const tournament = new TournamentManager(contractAddress);

  const events = await tournament.fetchEvents();
  console.log(`Found ${events.length} events`);

  const bundle: ContractEventBundle = {
    tournamentCreated: [],
    prizePercentSet: [],
    ticketPurchased: [],
    sponsorFunded: [],
    tournamentFinalized: [],
    winnerAllocated: [],
    prizeClaimed: [],
    unclaimedRecovered: [],
  };

  for (const eventRecord of events) {
    const eventData = eventRecord.event.data;

    switch (eventRecord.type) {
      case 'TournamentCreated':
        bundle.tournamentCreated.push(
          eventData as unknown as TournamentCreatedEvent
        );
        break;
      case 'PrizePercentSet':
        bundle.prizePercentSet.push(
          eventData as unknown as PrizePercentSetEvent
        );
        break;
      case 'TicketPurchased':
        bundle.ticketPurchased.push(
          eventData as unknown as TicketPurchasedEvent
        );
        break;
      case 'SponsorFunded':
        bundle.sponsorFunded.push(eventData as unknown as SponsorFundedEvent);
        break;
      case 'TournamentFinalized':
        bundle.tournamentFinalized.push(
          eventData as unknown as TournamentFinalizedEvent
        );
        break;
      case 'WinnerAllocated':
        bundle.winnerAllocated.push(
          eventData as unknown as WinnerAllocatedEvent
        );
        break;
      case 'PrizeClaimed':
        bundle.prizeClaimed.push(eventData as unknown as PrizeClaimedEvent);
        break;
      case 'UnclaimedRecovered':
        bundle.unclaimedRecovered.push(
          eventData as unknown as UnclaimedRecoveredEvent
        );
        break;
      default:
        console.warn(`Unknown event type: ${eventRecord.type}`);
    }
  }

  console.log(`Parsed events:`);
  console.log(`  - TournamentCreated:   ${bundle.tournamentCreated.length}`);
  console.log(`  - PrizePercentSet:     ${bundle.prizePercentSet.length}`);
  console.log(`  - TicketPurchased:     ${bundle.ticketPurchased.length}`);
  console.log(`  - SponsorFunded:       ${bundle.sponsorFunded.length}`);
  console.log(`  - TournamentFinalized: ${bundle.tournamentFinalized.length}`);
  console.log(`  - WinnerAllocated:     ${bundle.winnerAllocated.length}`);
  console.log(`  - PrizeClaimed:        ${bundle.prizeClaimed.length}`);
  console.log(`  - UnclaimedRecovered:  ${bundle.unclaimedRecovered.length}`);

  return bundle;
}

function cloneLeafWith(
  leaf: TournamentLeaf,
  overrides: Partial<{
    status: typeof leaf.status;
    participantsRoot: typeof leaf.participantsRoot;
    winnersRoot: typeof leaf.winnersRoot;
    prizePool: typeof leaf.prizePool;
    participantCount: typeof leaf.participantCount;
    sponsorContribution: typeof leaf.sponsorContribution;
  }>
): TournamentLeaf {
  return new TournamentLeaf({
    status: overrides.status ?? leaf.status,
    battleStartSlot: leaf.battleStartSlot,
    battleEndSlot: leaf.battleEndSlot,
    claimDeadlineSlot: leaf.claimDeadlineSlot,
    ticketPrice: leaf.ticketPrice,
    feePercent: leaf.feePercent,
    prizePercents: leaf.prizePercents,
    participantsRoot: overrides.participantsRoot ?? leaf.participantsRoot,
    winnersRoot: overrides.winnersRoot ?? leaf.winnersRoot,
    prizePool: overrides.prizePool ?? leaf.prizePool,
    participantCount: overrides.participantCount ?? leaf.participantCount,
    sponsorContribution:
      overrides.sponsorContribution ?? leaf.sponsorContribution,
  });
}

function rebuildTournamentsMap(events: ContractEventBundle): {
  tournamentsMap: MerkleMap;
  tournaments: Map<string, TournamentState>;
  prizePercentsByTournament: Map<string, UInt32[]>;
} {
  console.log('\nRebuilding tournaments merkle map from events...');

  const tournamentsMap = new MerkleMap();
  const tournaments = new Map<string, TournamentState>();
  // Pre-aggregate the per-place fan-out so the leaf can be reconstructed
  // in one pass; the same map is returned to the caller for use when
  // posting to the backend.
  const prizePercentsByTournament = aggregatePrizePercents(
    events.prizePercentSet
  );

  for (const event of events.tournamentCreated) {
    const id = event.tournamentId.toString();
    const prizePercents =
      prizePercentsByTournament.get(id) ??
      Array.from({ length: NUM_WINNERS }, () => UInt32.from(0));
    const leaf = new TournamentLeaf({
      status: TournamentStatus.Battle,
      battleStartSlot: event.battleStartSlot,
      battleEndSlot: event.battleEndSlot,
      claimDeadlineSlot: event.claimDeadlineSlot,
      ticketPrice: event.ticketPrice,
      feePercent: event.feePercent,
      prizePercents,
      participantsRoot: new MerkleMap().getRoot(),
      winnersRoot: new MerkleMap().getRoot(),
      prizePool: UInt64.from(0),
      participantCount: UInt32.from(0),
      sponsorContribution: UInt64.from(0),
    });

    const key = hashTournamentKey(event.tournamentId);
    tournamentsMap.set(key, leaf.hash());

    tournaments.set(id, {
      leaf,
      participantsMap: new MerkleMap(),
      winnersMap: new MerkleMap(),
    });
  }

  for (const event of events.ticketPurchased) {
    const state = tournaments.get(event.tournamentId.toString());
    if (state) {
      state.leaf = cloneLeafWith(state.leaf, {
        participantsRoot: event.newParticipantsRoot,
        prizePool: event.newPrizePool,
        participantCount: event.newParticipantCount,
      });

      const playerKey = Poseidon.hash(event.player.toFields());
      state.participantsMap.set(playerKey, Field(1));

      const key = hashTournamentKey(event.tournamentId);
      tournamentsMap.set(key, state.leaf.hash());
    }
  }

  for (const event of events.sponsorFunded) {
    const state = tournaments.get(event.tournamentId.toString());
    if (state) {
      state.leaf = cloneLeafWith(state.leaf, {
        prizePool: event.newPrizePool,
        sponsorContribution: event.newSponsorContribution,
      });

      const key = hashTournamentKey(event.tournamentId);
      tournamentsMap.set(key, state.leaf.hash());
    }
  }

  for (const event of events.tournamentFinalized) {
    const state = tournaments.get(event.tournamentId.toString());
    if (state) {
      state.leaf = cloneLeafWith(state.leaf, {
        status: TournamentStatus.Claiming,
        winnersRoot: event.newWinnersRoot,
        prizePool: event.totalAllocated,
      });

      const key = hashTournamentKey(event.tournamentId);
      tournamentsMap.set(key, state.leaf.hash());
    }
  }

  for (const event of events.prizeClaimed) {
    const state = tournaments.get(event.tournamentId.toString());
    if (state) {
      state.leaf = cloneLeafWith(state.leaf, {
        winnersRoot: event.newWinnersRoot,
        prizePool: event.newPrizePool,
      });

      const key = hashTournamentKey(event.tournamentId);
      tournamentsMap.set(key, state.leaf.hash());
    }
  }

  for (const event of events.unclaimedRecovered) {
    const state = tournaments.get(event.tournamentId.toString());
    if (state) {
      state.leaf = cloneLeafWith(state.leaf, {
        status: TournamentStatus.Settled,
        prizePool: UInt64.from(0),
      });

      const key = hashTournamentKey(event.tournamentId);
      tournamentsMap.set(key, state.leaf.hash());
    }
  }

  console.log(`Rebuilt map with ${tournaments.size} tournaments`);

  return { tournamentsMap, tournaments, prizePercentsByTournament };
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
  prizePercents: UInt32[],
  tournamentsRoot: string,
  display: { title: string; imageUrl: string }
): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/tournament`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tournamentId,
        ticketPrice: event.ticketPrice.toBigInt().toString(),
        feePercent: Number(event.feePercent.toBigint()),
        claimDeadlineSlot: Number(event.claimDeadlineSlot.toBigint()),
        claimWindow:
          Number(event.claimDeadlineSlot.toBigint()) -
          Number(event.battleEndSlot.toBigint()),
        prizePercents: prizePercents.map((p) => Number(p.toBigint())),
        battleStartSlot: Number(event.battleStartSlot.toBigint()),
        battleEndSlot: Number(event.battleEndSlot.toBigint()),
        tournamentsRoot,
        title: display.title,
        imageUrl: display.imageUrl,
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

  const display = parseRequiredTournamentDisplayArgs(process.argv);

  const contractAddressBase58 = process.env.TOURNAMENT_CONTRACT_ADDRESS;
  if (!contractAddressBase58) {
    console.error(
      'ERROR: TOURNAMENT_CONTRACT_ADDRESS environment variable not set'
    );
    process.exit(1);
  }

  console.log(`\nConnecting to: ${MINA_NETWORK_URL}`);
  const networkId = MINA_NETWORK_URL.includes('mainnet') ? 'mainnet' : 'devnet';
  const network = Mina.Network({
    mina: MINA_NETWORK_URL,
    archive: MINA_ARCHIVE_URL,
    networkId: networkId as 'mainnet' | 'devnet',
  });
  Mina.setActiveInstance(network);

  const contractAddress = PublicKey.fromBase58(contractAddressBase58);
  console.log(`Contract address: ${contractAddress.toBase58()}`);
  console.log(`Backend URL: ${BACKEND_URL}`);

  await fetchAccount({ publicKey: contractAddress });

  const events = await fetchContractEvents(contractAddress);
  const { tournamentsMap, prizePercentsByTournament } =
    rebuildTournamentsMap(events);

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
    const prizePercents =
      prizePercentsByTournament.get(tournamentId) ??
      Array.from({ length: NUM_WINNERS }, () => UInt32.from(0));
    const ok = await createTournamentInBackend(
      tournamentId,
      event,
      prizePercents,
      tournamentsRoot,
      display
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
