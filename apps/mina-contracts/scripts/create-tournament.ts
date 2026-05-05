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
 *   FEE_PERCENT - Per-tournament fee in basis points (default: 500 = 5%)
 *   CLAIM_WINDOW - Slots after battleEndSlot during which winners may claim
 *                  (default: 20000)
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
  PrizePercentSetEvent,
  TicketPurchasedEvent,
  TournamentFinalizedEvent,
  WinnerAllocatedEvent,
  PrizeClaimedEvent,
  SponsorFundedEvent,
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
const FEE_PERCENT = Number(process.env.FEE_PERCENT || '500');
const CLAIM_WINDOW = Number(process.env.CLAIM_WINDOW || '20000');

interface TournamentState {
  leaf: TournamentLeaf;
  participantsMap: MerkleMap;
  winnersMap: MerkleMap;
}

function hashTournamentKey(tournamentId: Field): Field {
  return Poseidon.hash([tournamentId]);
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
 * fan-out `PrizePercentSet` events. Mirrors aggregation in the other
 * scripts so all consumers agree on how to recover the array.
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
  maxTournamentId: number;
} {
  console.log('\nRebuilding tournaments merkle map from events...');

  const tournamentsMap = new MerkleMap();
  const tournaments = new Map<string, TournamentState>();
  let maxTournamentId = 0;

  // Pair each TournamentCreated header with the per-place fan-out so we
  // can reconstruct the full leaf hash. Without this the rebuilt root
  // will differ from the on-chain root.
  const prizePercentsByTournament = aggregatePrizePercents(
    events.prizePercentSet
  );

  for (const event of events.tournamentCreated) {
    const tournamentIdNum = Number(event.tournamentId.toBigInt());
    maxTournamentId = Math.max(maxTournamentId, tournamentIdNum);

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
    const tournamentId = event.tournamentId.toString();
    const state = tournaments.get(tournamentId);

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
    const tournamentId = event.tournamentId.toString();
    const state = tournaments.get(tournamentId);

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
    const tournamentId = event.tournamentId.toString();
    const state = tournaments.get(tournamentId);

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
    const tournamentId = event.tournamentId.toString();
    const state = tournaments.get(tournamentId);

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
  const claimDeadlineSlot = battleEndSlot + CLAIM_WINDOW;

  console.log(`\nTournament timing:`);
  console.log(`  Current slot: ${currentSlot}`);
  console.log(
    `  Battle window (join anytime): slots ${battleStartSlot} → ${battleEndSlot} (~${
      BATTLE_START_DELAY * 3
    } min until open, then ~${BATTLE_SLOTS * 3} min window)`
  );
  console.log(
    `  Claim window: slot ${battleEndSlot} → ${claimDeadlineSlot} (~${
      CLAIM_WINDOW * 3
    } min)`
  );
  console.log(`  Fee: ${FEE_PERCENT / 100}% (${FEE_PERCENT} bps)`);

  const config = new TournamentConfig({
    ticketPrice: UInt64.from(ticketPrice),
    feePercent: UInt32.from(FEE_PERCENT),
    claimWindow: UInt32.from(CLAIM_WINDOW),
    prizePercents: [
      UInt32.from(2500), UInt32.from(1500), UInt32.from(1000),
      UInt32.from(1000), UInt32.from(1000), UInt32.from(700),
      UInt32.from(700),  UInt32.from(700),  UInt32.from(500),
      UInt32.from(400),
    ],
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
    claimDeadlineSlot: UInt32.from(claimDeadlineSlot),
    ticketPrice: UInt64.from(ticketPrice),
    feePercent: UInt32.from(FEE_PERCENT),
    prizePercents: config.prizePercents,
    participantsRoot: new MerkleMap().getRoot(),
    winnersRoot: new MerkleMap().getRoot(),
    prizePool: UInt64.from(0),
    participantCount: UInt32.from(0),
    sponsorContribution: UInt64.from(0),
  });
  tournamentsMap.set(tournamentKey, newLeaf.hash());
  const newTournamentsRoot = tournamentsMap.getRoot().toString();

  const backendPayloadObject = {
    tournamentId: nextTournamentId.toString(),
    ticketPrice: ticketPrice.toString(),
    feePercent: FEE_PERCENT,
    claimWindow: CLAIM_WINDOW,
    prizePercents: [2500, 1500, 1000, 1000, 1000, 700, 700, 700, 500, 400],
    battleStartSlot,
    battleEndSlot,
    claimDeadlineSlot,
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
  console.log(`Fee: ${FEE_PERCENT / 100}% (${FEE_PERCENT} bps)`);
  console.log(`Battle Start Slot: ${battleStartSlot}`);
  console.log(`Battle End Slot: ${battleEndSlot}`);
  console.log(`Claim Deadline Slot: ${claimDeadlineSlot}`);
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
