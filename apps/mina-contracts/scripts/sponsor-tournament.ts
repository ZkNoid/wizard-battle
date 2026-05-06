/**
 * Sponsor Tournament Script
 *
 * Fetches events from deployed TournamentManager contract, rebuilds merkle map
 * state, and calls `sponsorFund` to add MINA to a tournament's prize pool.
 * After on-chain confirmation, notifies the backend to keep its verified state
 * in sync.
 *
 * Usage:
 *   pnpm --filter mina-contracts run sponsor-tournament -- --tournament-id 1 --amount 5000000000
 *
 * Required CLI flags (after `--` when using pnpm):
 *   --tournament-id, -T  — Tournament ID to fund (integer ≥ 1)
 *   --amount, -a         — Amount in nanoMINA (e.g. 5000000000 = 5 MINA)
 *
 * Environment variables:
 *   MINA_NETWORK_URL          - Mina GraphQL endpoint (default: devnet)
 *   MINA_ARCHIVE_URL          - Mina Archive GraphQL endpoint
 *   SPONSOR_PRIVATE_KEY       - Private key for the sponsor account
 *   TOURNAMENT_CONTRACT_ADDRESS - Deployed contract address
 *   BACKEND_URL               - Backend API base URL (default: http://localhost:3001)
 */
import dotenv from 'dotenv';
dotenv.config();

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
  AccountUpdate,
} from 'o1js';
import {
  TournamentManager,
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

const MINA_NETWORK_URL =
  process.env.MINA_NETWORK_URL ||
  'https://api.minascan.io/node/devnet/v1/graphql';

const MINA_ARCHIVE_URL =
  process.env.MINA_ARCHIVE_URL ||
  'https://api.minascan.io/archive/devnet/v1/graphql';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

/* --------------------------------- CLI args --------------------------------- */

function parseSponsorArgs(argv: string[]): {
  tournamentId: number;
  amount: bigint;
} {
  const args = argv.slice(2);
  let tournamentId: number | undefined;
  let amount: bigint | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;

    if (arg === '--tournament-id' || arg === '-T') {
      const v = args[++i];
      if (v && !v.startsWith('-')) tournamentId = parseInt(v, 10);
    } else if (arg.startsWith('--tournament-id=')) {
      tournamentId = parseInt(arg.slice('--tournament-id='.length), 10);
    } else if (arg === '--amount' || arg === '-a') {
      const v = args[++i];
      if (v && !v.startsWith('-')) amount = BigInt(v);
    } else if (arg.startsWith('--amount=')) {
      amount = BigInt(arg.slice('--amount='.length));
    }
  }

  if (!tournamentId || isNaN(tournamentId) || tournamentId < 1) {
    console.error(
      'ERROR: --tournament-id (or -T) is required and must be a positive integer.'
    );
    console.error(
      'Usage: pnpm --filter mina-contracts run sponsor-tournament -- --tournament-id 1 --amount 5000000000'
    );
    process.exit(1);
  }
  if (!amount || amount <= 0n) {
    console.error(
      'ERROR: --amount (or -a) is required and must be > 0 nanoMINA.'
    );
    process.exit(1);
  }

  return { tournamentId, amount };
}

/* --------------------------------- Event types --------------------------------- */

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

interface TournamentState {
  leaf: TournamentLeaf;
  participantsMap: MerkleMap;
  winnersMap: MerkleMap;
}

/* --------------------------------- Helpers --------------------------------- */

function hashTournamentKey(tournamentId: Field): Field {
  return Poseidon.hash([tournamentId]);
}

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
    if (place >= 0 && place < NUM_WINNERS) arr[place] = ev.percent;
  }
  return out;
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
    status:              overrides.status              ?? leaf.status,
    battleStartSlot:     leaf.battleStartSlot,
    battleEndSlot:       leaf.battleEndSlot,
    claimDeadlineSlot:   leaf.claimDeadlineSlot,
    ticketPrice:         leaf.ticketPrice,
    feePercent:          leaf.feePercent,
    prizePercents:       leaf.prizePercents,
    participantsRoot:    overrides.participantsRoot    ?? leaf.participantsRoot,
    winnersRoot:         overrides.winnersRoot         ?? leaf.winnersRoot,
    prizePool:           overrides.prizePool           ?? leaf.prizePool,
    participantCount:    overrides.participantCount    ?? leaf.participantCount,
    sponsorContribution: overrides.sponsorContribution ?? leaf.sponsorContribution,
  });
}

/* --------------------------------- Event fetching --------------------------------- */

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
        bundle.tournamentCreated.push(eventData as unknown as TournamentCreatedEvent);
        break;
      case 'PrizePercentSet':
        bundle.prizePercentSet.push(eventData as unknown as PrizePercentSetEvent);
        break;
      case 'TicketPurchased':
        bundle.ticketPurchased.push(eventData as unknown as TicketPurchasedEvent);
        break;
      case 'SponsorFunded':
        bundle.sponsorFunded.push(eventData as unknown as SponsorFundedEvent);
        break;
      case 'TournamentFinalized':
        bundle.tournamentFinalized.push(eventData as unknown as TournamentFinalizedEvent);
        break;
      case 'WinnerAllocated':
        bundle.winnerAllocated.push(eventData as unknown as WinnerAllocatedEvent);
        break;
      case 'PrizeClaimed':
        bundle.prizeClaimed.push(eventData as unknown as PrizeClaimedEvent);
        break;
      case 'UnclaimedRecovered':
        bundle.unclaimedRecovered.push(eventData as unknown as UnclaimedRecoveredEvent);
        break;
      default:
        console.warn(`Unknown event type: ${eventRecord.type}`);
    }
  }

  console.log('Parsed events:');
  console.log(`  - TournamentCreated:   ${bundle.tournamentCreated.length}`);
  console.log(`  - PrizePercentSet:     ${bundle.prizePercentSet.length}`);
  console.log(`  - TicketPurchased:     ${bundle.ticketPurchased.length}`);
  console.log(`  - SponsorFunded:       ${bundle.sponsorFunded.length}`);
  console.log(`  - TournamentFinalized: ${bundle.tournamentFinalized.length}`);
  console.log(`  - PrizeClaimed:        ${bundle.prizeClaimed.length}`);
  console.log(`  - UnclaimedRecovered:  ${bundle.unclaimedRecovered.length}`);

  return bundle;
}

/* --------------------------------- Map rebuild --------------------------------- */

function rebuildTournamentsMap(events: ContractEventBundle): {
  tournamentsMap: MerkleMap;
  tournaments: Map<string, TournamentState>;
} {
  console.log('\nRebuilding tournaments merkle map from events...');

  const tournamentsMap = new MerkleMap();
  const tournaments = new Map<string, TournamentState>();

  const prizePercentsByTournament = aggregatePrizePercents(events.prizePercentSet);

  for (const event of events.tournamentCreated) {
    const id = event.tournamentId.toString();
    const prizePercents =
      prizePercentsByTournament.get(id) ??
      Array.from({ length: NUM_WINNERS }, () => UInt32.from(0));

    const leaf = new TournamentLeaf({
      status:              TournamentStatus.Battle,
      battleStartSlot:     event.battleStartSlot,
      battleEndSlot:       event.battleEndSlot,
      claimDeadlineSlot:   event.claimDeadlineSlot,
      ticketPrice:         event.ticketPrice,
      feePercent:          event.feePercent,
      prizePercents,
      participantsRoot:    new MerkleMap().getRoot(),
      winnersRoot:         new MerkleMap().getRoot(),
      prizePool:           UInt64.from(0),
      participantCount:    UInt32.from(0),
      sponsorContribution: UInt64.from(0),
    });

    const key = hashTournamentKey(event.tournamentId);
    tournamentsMap.set(key, leaf.hash());
    tournaments.set(id, { leaf, participantsMap: new MerkleMap(), winnersMap: new MerkleMap() });
    console.log(`  Loaded tournament ${id}`);
  }

  for (const event of events.ticketPurchased) {
    const state = tournaments.get(event.tournamentId.toString());
    if (state) {
      state.leaf = cloneLeafWith(state.leaf, {
        participantsRoot: event.newParticipantsRoot,
        prizePool:        event.newPrizePool,
        participantCount: event.newParticipantCount,
      });
      const playerKey = Poseidon.hash(event.player.toFields());
      state.participantsMap.set(playerKey, Field(1));
      tournamentsMap.set(hashTournamentKey(event.tournamentId), state.leaf.hash());
    }
  }

  for (const event of events.sponsorFunded) {
    const state = tournaments.get(event.tournamentId.toString());
    if (state) {
      state.leaf = cloneLeafWith(state.leaf, {
        prizePool:           event.newPrizePool,
        sponsorContribution: event.newSponsorContribution,
      });
      tournamentsMap.set(hashTournamentKey(event.tournamentId), state.leaf.hash());
    }
  }

  for (const event of events.tournamentFinalized) {
    const state = tournaments.get(event.tournamentId.toString());
    if (state) {
      state.leaf = cloneLeafWith(state.leaf, {
        status:      TournamentStatus.Claiming,
        winnersRoot: event.newWinnersRoot,
        prizePool:   event.totalAllocated,
      });
      tournamentsMap.set(hashTournamentKey(event.tournamentId), state.leaf.hash());
    }
  }

  for (const event of events.prizeClaimed) {
    const state = tournaments.get(event.tournamentId.toString());
    if (state) {
      state.leaf = cloneLeafWith(state.leaf, {
        winnersRoot: event.newWinnersRoot,
        prizePool:   event.newPrizePool,
      });
      tournamentsMap.set(hashTournamentKey(event.tournamentId), state.leaf.hash());
    }
  }

  for (const event of events.unclaimedRecovered) {
    const state = tournaments.get(event.tournamentId.toString());
    if (state) {
      state.leaf = cloneLeafWith(state.leaf, {
        status:    TournamentStatus.Settled,
        prizePool: UInt64.from(0),
      });
      tournamentsMap.set(hashTournamentKey(event.tournamentId), state.leaf.hash());
    }
  }

  console.log(`Rebuilt map with ${tournaments.size} tournament(s)`);
  return { tournamentsMap, tournaments };
}

/* --------------------------------- Backend notification --------------------------------- */

async function notifyBackend(
  tournamentId: string,
  sponsorPubKey: string,
  amount: bigint,
  txHash: string
): Promise<void> {
  const MAX_RETRIES = 10;
  const INITIAL_DELAY_MS = 30_000;
  const BACKOFF_MULTIPLIER = 1.5;
  const MAX_DELAY_MS = 5 * 60_000;

  let attempt = 0;
  let delayMs = INITIAL_DELAY_MS;

  while (attempt <= MAX_RETRIES) {
    try {
      const response = await fetch(
        `${BACKEND_URL}/tournament/${tournamentId}/sponsor-fund/notify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sponsorPubKey, amount: amount.toString(), txHash }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log(`Backend notified successfully: ${JSON.stringify(result)}`);
        return;
      }

      const errorBody = await response.text();

      if (response.status === 409) {
        if (attempt >= MAX_RETRIES) {
          console.error(`Backend notification failed after ${MAX_RETRIES} retries: ${errorBody}`);
          return;
        }
        console.log(
          `Attempt ${attempt + 1}/${MAX_RETRIES}: tx still pending. ` +
            `Waiting ${Math.round(delayMs / 1000)}s...`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs = Math.min(delayMs * BACKOFF_MULTIPLIER, MAX_DELAY_MS);
        attempt++;
        continue;
      }

      console.error(`Backend notification failed (${response.status}): ${errorBody}`);
      console.warn(
        `SponsorFund tx ${txHash} confirmed on-chain but backend not updated.\n` +
          `POST manually: ${BACKEND_URL}/tournament/${tournamentId}/sponsor-fund/notify\n` +
          `Body: ${JSON.stringify({ sponsorPubKey, amount: amount.toString(), txHash })}`
      );
      return;
    } catch (err) {
      if (attempt >= MAX_RETRIES) {
        console.error('Failed to reach backend after retries:', err);
        console.warn(
          `SponsorFund tx ${txHash} confirmed on-chain but backend not updated.\n` +
            `POST manually: ${BACKEND_URL}/tournament/${tournamentId}/sponsor-fund/notify\n` +
            `Body: ${JSON.stringify({ sponsorPubKey, amount: amount.toString(), txHash })}`
        );
        return;
      }
      console.log(
        `Network error on attempt ${attempt + 1}/${MAX_RETRIES}. ` +
          `Waiting ${Math.round(delayMs / 1000)}s...`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs = Math.min(delayMs * BACKOFF_MULTIPLIER, MAX_DELAY_MS);
      attempt++;
    }
  }
}

/* --------------------------------- Main --------------------------------- */

async function main() {
  console.log('='.repeat(60));
  console.log('Sponsor Tournament Script');
  console.log('='.repeat(60));

  const { tournamentId, amount } = parseSponsorArgs(process.argv);

  const sponsorKeyBase58 = process.env.SPONSOR_PRIVATE_KEY;
  if (!sponsorKeyBase58) {
    console.error('ERROR: SPONSOR_PRIVATE_KEY environment variable not set');
    process.exit(1);
  }

  const contractAddressBase58 = process.env.TOURNAMENT_CONTRACT_ADDRESS;
  if (!contractAddressBase58) {
    console.error('ERROR: TOURNAMENT_CONTRACT_ADDRESS environment variable not set');
    process.exit(1);
  }

  console.log(`\nConnecting to: ${MINA_NETWORK_URL}`);
  const network = Mina.Network({ mina: MINA_NETWORK_URL, archive: MINA_ARCHIVE_URL });
  Mina.setActiveInstance(network);

  const sponsorKey      = PrivateKey.fromBase58(sponsorKeyBase58);
  const sponsor         = sponsorKey.toPublicKey();
  const contractAddress = PublicKey.fromBase58(contractAddressBase58);

  console.log(`Sponsor address:  ${sponsor.toBase58()}`);
  console.log(`Contract address: ${contractAddress.toBase58()}`);
  console.log(`Tournament ID:    ${tournamentId}`);
  console.log(`Amount:           ${Number(amount) / 1e9} MINA (${amount} nanoMINA)`);

  console.log('\nFetching accounts...');
  const [sponsorAccount, contractAccount] = await Promise.all([
    fetchAccount({ publicKey: sponsor }),
    fetchAccount({ publicKey: contractAddress }),
  ]);

  if (!sponsorAccount.account) {
    console.error('ERROR: Sponsor account not found on-chain');
    process.exit(1);
  }
  console.log(
    `Sponsor balance: ${Number(sponsorAccount.account.balance.toBigInt()) / 1e9} MINA`
  );

  if (!contractAccount.account) {
    console.error('ERROR: Contract account not found. Has it been deployed?');
    process.exit(1);
  }

  const events = await fetchContractEvents(contractAddress);
  const { tournamentsMap, tournaments } = rebuildTournamentsMap(events);

  const contract = new TournamentManager(contractAddress);
  const onChainRoot = contract.tournamentsRoot.get();
  const rebuiltRoot = tournamentsMap.getRoot();

  console.log(`\nOn-chain root: ${onChainRoot.toString()}`);
  console.log(`Rebuilt root:  ${rebuiltRoot.toString()}`);

  if (!onChainRoot.equals(rebuiltRoot).toBoolean()) {
    console.error('ERROR: Rebuilt root does not match on-chain root! Missing events or state corruption.');
    process.exit(1);
  }
  console.log('✓ Root verification passed');

  const tournamentIdField = Field(tournamentId);
  const state = tournaments.get(tournamentIdField.toString());

  if (!state) {
    console.error(`ERROR: Tournament ${tournamentId} not found in on-chain events.`);
    process.exit(1);
  }

  const { leaf: currentTournament } = state;
  const currentStatus = Number(currentTournament.status.toBigint());
  if (currentStatus !== Number(TournamentStatus.Battle.toBigint())) {
    console.error(
      `ERROR: Tournament ${tournamentId} is not in Battle phase (status=${currentStatus}). ` +
        'Sponsor funding only allowed during Battle phase.'
    );
    process.exit(1);
  }

  console.log(`\nCurrent prize pool:         ${Number(currentTournament.prizePool.toBigInt()) / 1e9} MINA`);
  console.log(`Current sponsor contribution: ${Number(currentTournament.sponsorContribution.toBigInt()) / 1e9} MINA`);

  console.log('\nCompiling TournamentManager...');
  const startCompile = Date.now();
  await TournamentManager.compile();
  console.log(`Compilation completed in ${Date.now() - startCompile}ms`);

  const tournamentWitness = tournamentsMap.getWitness(
    hashTournamentKey(tournamentIdField)
  );

  console.log('\nCreating sponsorFund transaction...');
  const fundTx = await Mina.transaction(
    { sender: sponsor, fee: 0.1e9 },
    async () => {
      const sponsorUpdate = AccountUpdate.createSigned(sponsor);
      sponsorUpdate.balance.subInPlace(UInt64.from(amount));

      await contract.sponsorFund(
        tournamentIdField,
        currentTournament,
        tournamentWitness,
        UInt64.from(amount)
      );
    }
  );

  console.log('Proving transaction...');
  await fundTx.prove();

  console.log('Sending transaction...');
  const fundResult = await fundTx.sign([sponsorKey]).send();
  console.log(`Transaction hash: ${fundResult.hash}`);

  console.log('Waiting for confirmation...');
  await fundResult.wait();
  console.log('Transaction confirmed.');

  console.log('\nNotifying backend...');
  await notifyBackend(
    tournamentIdField.toString(),
    sponsor.toBase58(),
    amount,
    fundResult.hash
  );

  console.log('\n' + '='.repeat(60));
  console.log('SPONSOR FUND COMPLETE');
  console.log('='.repeat(60));
  console.log(`Tournament ID:      ${tournamentId}`);
  console.log(`Sponsor:            ${sponsor.toBase58()}`);
  console.log(`Amount:             ${Number(amount) / 1e9} MINA`);
  console.log(`New prize pool:     ${(Number(currentTournament.prizePool.toBigInt()) + Number(amount)) / 1e9} MINA`);
  console.log(`Transaction hash:   ${fundResult.hash}`);
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('Failed to sponsor tournament:', err);
  process.exit(1);
});
