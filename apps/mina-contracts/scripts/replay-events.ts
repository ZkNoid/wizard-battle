/**
 * Replay Events Script
 *
 * Fetches all on-chain events from the deployed TournamentManager contract,
 * rebuilds merkle state, verifies it matches the on-chain root, then replays
 * every event to the backend so that any events that were missed or failed to
 * be processed can be re-sent.
 *
 * Usage:
 *   pnpm --filter mina-contracts run replay-events
 *
 * Environment variables:
 *   MINA_NETWORK_URL  - Mina GraphQL endpoint (default: devnet)
 *   MINA_ARCHIVE_URL  - Mina Archive GraphQL endpoint
 *   TOURNAMENT_CONTRACT_ADDRESS - Deployed contract address
 *   BACKEND_URL       - Backend API base URL (default: http://localhost:3001)
 *
 * Exit codes:
 *   0 - All events replayed (or already present) successfully
 *   1 - One or more events could not be replayed
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

// ─────────────────────────────── Configuration ────────────────────────────────

const MINA_NETWORK_URL =
  process.env.MINA_NETWORK_URL ||
  'https://api.minascan.io/node/devnet/v1/graphql';

const MINA_ARCHIVE_URL =
  process.env.MINA_ARCHIVE_URL ||
  'https://api.minascan.io/archive/devnet/v1/graphql';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// ─────────────────────────────── Types ────────────────────────────────────────

interface ReplayResult {
  ok: boolean;
  skipped: boolean;
  status?: number;
  error?: string;
}

interface EventStats {
  total: number;
  replayed: number;
  skipped: number;
  failed: number;
}

// ─────────────────────────────── Helpers ──────────────────────────────────────

function hashTournamentKey(tournamentId: Field): Field {
  return Poseidon.hash([tournamentId]);
}

/**
 * Send a POST request to the backend and classify the response.
 * - 2xx  → ok
 * - 409  → skipped (already exists / already processed)
 * - anything else → failed
 */
async function post(
  url: string,
  body: Record<string, unknown>
): Promise<ReplayResult> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      return { ok: true, skipped: false, status: response.status };
    }

    if (response.status === 409) {
      return { ok: true, skipped: true, status: 409 };
    }

    const text = await response.text();
    return {
      ok: false,
      skipped: false,
      status: response.status,
      error: text,
    };
  } catch (err) {
    return {
      ok: false,
      skipped: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─────────────────────────────── Event fetching ───────────────────────────────

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
 * fan-out `PrizePercentSet` events. Missing slots default to 0 — matches
 * how the contract initializes empty places. Returns a map keyed by
 * tournamentId stringified Field.
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

interface AggregatedWinners {
  winners: PublicKey[];
  prizes: UInt64[];
}

/**
 * Reassemble per-tournament winner/prize arrays from the fan-out
 * `WinnerAllocated` events emitted alongside `TournamentFinalized`.
 */
function aggregateWinners(
  events: WinnerAllocatedEvent[]
): Map<string, AggregatedWinners> {
  const out = new Map<string, AggregatedWinners>();
  for (const ev of events) {
    const id = ev.tournamentId.toString();
    let agg = out.get(id);
    if (!agg) {
      agg = {
        winners: Array.from({ length: NUM_WINNERS }, () => PublicKey.empty()),
        prizes: Array.from({ length: NUM_WINNERS }, () => UInt64.from(0)),
      };
      out.set(id, agg);
    }
    const place = Number(ev.place.toBigint());
    if (place >= 0 && place < NUM_WINNERS) {
      agg.winners[place] = ev.winner;
      agg.prizes[place] = ev.prize;
    }
  }
  return out;
}

async function fetchContractEvents(
  contractAddress: PublicKey
): Promise<ContractEventBundle> {
  console.log('Fetching contract events from archive...');
  const contract = new TournamentManager(contractAddress);
  const events = await contract.fetchEvents();
  console.log(`Found ${events.length} raw events`);

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

  for (const record of events) {
    const data = record.event.data;
    switch (record.type) {
      case 'TournamentCreated':
        bundle.tournamentCreated.push(data as unknown as TournamentCreatedEvent);
        break;
      case 'PrizePercentSet':
        bundle.prizePercentSet.push(data as unknown as PrizePercentSetEvent);
        break;
      case 'TicketPurchased':
        bundle.ticketPurchased.push(data as unknown as TicketPurchasedEvent);
        break;
      case 'SponsorFunded':
        bundle.sponsorFunded.push(data as unknown as SponsorFundedEvent);
        break;
      case 'TournamentFinalized':
        bundle.tournamentFinalized.push(
          data as unknown as TournamentFinalizedEvent
        );
        break;
      case 'WinnerAllocated':
        bundle.winnerAllocated.push(data as unknown as WinnerAllocatedEvent);
        break;
      case 'PrizeClaimed':
        bundle.prizeClaimed.push(data as unknown as PrizeClaimedEvent);
        break;
      case 'UnclaimedRecovered':
        bundle.unclaimedRecovered.push(
          data as unknown as UnclaimedRecoveredEvent
        );
        break;
      default:
        console.warn(`  Unknown event type: ${record.type}`);
    }
  }

  console.log(`Parsed events:`);
  console.log(`  TournamentCreated:   ${bundle.tournamentCreated.length}`);
  console.log(`  PrizePercentSet:     ${bundle.prizePercentSet.length}`);
  console.log(`  TicketPurchased:     ${bundle.ticketPurchased.length}`);
  console.log(`  SponsorFunded:       ${bundle.sponsorFunded.length}`);
  console.log(`  TournamentFinalized: ${bundle.tournamentFinalized.length}`);
  console.log(`  WinnerAllocated:     ${bundle.winnerAllocated.length}`);
  console.log(`  PrizeClaimed:        ${bundle.prizeClaimed.length}`);
  console.log(`  UnclaimedRecovered:  ${bundle.unclaimedRecovered.length}`);

  return bundle;
}

// ─────────────────────────────── Merkle rebuild ───────────────────────────────

interface TournamentState {
  leaf: TournamentLeaf;
  participantsMap: MerkleMap;
  winnersMap: MerkleMap;
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
} {
  const tournamentsMap = new MerkleMap();
  const tournaments = new Map<string, TournamentState>();

  // Pre-aggregate per-place prize percent events so each TournamentCreated
  // header can be paired with its full distribution. If the per-place
  // events are missing (e.g. archive lagging) the leaf hash will not match
  // the on-chain root and the script will exit later.
  const prizePercentsByTournament = aggregatePrizePercents(
    events.prizePercentSet
  );

  for (const ev of events.tournamentCreated) {
    const id = ev.tournamentId.toString();
    const prizePercents =
      prizePercentsByTournament.get(id) ??
      Array.from({ length: NUM_WINNERS }, () => UInt32.from(0));
    const leaf = new TournamentLeaf({
      status: TournamentStatus.Battle,
      battleStartSlot: ev.battleStartSlot,
      battleEndSlot: ev.battleEndSlot,
      claimDeadlineSlot: ev.claimDeadlineSlot,
      ticketPrice: ev.ticketPrice,
      feePercent: ev.feePercent,
      prizePercents,
      participantsRoot: new MerkleMap().getRoot(),
      winnersRoot: new MerkleMap().getRoot(),
      prizePool: UInt64.from(0),
      participantCount: UInt32.from(0),
      sponsorContribution: UInt64.from(0),
    });
    const key = hashTournamentKey(ev.tournamentId);
    tournamentsMap.set(key, leaf.hash());
    tournaments.set(id, {
      leaf,
      participantsMap: new MerkleMap(),
      winnersMap: new MerkleMap(),
    });
  }

  for (const ev of events.ticketPurchased) {
    const state = tournaments.get(ev.tournamentId.toString());
    if (state) {
      state.leaf = cloneLeafWith(state.leaf, {
        participantsRoot: ev.newParticipantsRoot,
        prizePool: ev.newPrizePool,
        participantCount: ev.newParticipantCount,
      });
      const playerKey = Poseidon.hash(ev.player.toFields());
      state.participantsMap.set(playerKey, Field(1));
      tournamentsMap.set(hashTournamentKey(ev.tournamentId), state.leaf.hash());
    }
  }

  for (const ev of events.sponsorFunded) {
    const state = tournaments.get(ev.tournamentId.toString());
    if (state) {
      state.leaf = cloneLeafWith(state.leaf, {
        prizePool: ev.newPrizePool,
        sponsorContribution: ev.newSponsorContribution,
      });
      tournamentsMap.set(hashTournamentKey(ev.tournamentId), state.leaf.hash());
    }
  }

  for (const ev of events.tournamentFinalized) {
    const state = tournaments.get(ev.tournamentId.toString());
    if (state) {
      state.leaf = cloneLeafWith(state.leaf, {
        status: TournamentStatus.Claiming,
        winnersRoot: ev.newWinnersRoot,
        prizePool: ev.totalAllocated,
      });
      tournamentsMap.set(hashTournamentKey(ev.tournamentId), state.leaf.hash());
    }
  }

  for (const ev of events.prizeClaimed) {
    const state = tournaments.get(ev.tournamentId.toString());
    if (state) {
      state.leaf = cloneLeafWith(state.leaf, {
        winnersRoot: ev.newWinnersRoot,
        prizePool: ev.newPrizePool,
      });
      tournamentsMap.set(hashTournamentKey(ev.tournamentId), state.leaf.hash());
    }
  }

  for (const ev of events.unclaimedRecovered) {
    const state = tournaments.get(ev.tournamentId.toString());
    if (state) {
      state.leaf = cloneLeafWith(state.leaf, {
        status: TournamentStatus.Settled,
        prizePool: UInt64.from(0),
      });
      tournamentsMap.set(hashTournamentKey(ev.tournamentId), state.leaf.hash());
    }
  }

  return { tournamentsMap, tournaments };
}

// ─────────────────────────────── Replay handlers ──────────────────────────────

async function replayTournamentCreated(
  events: TournamentCreatedEvent[],
  prizePercentsByTournament: Map<string, UInt32[]>,
  tournamentsRoot: string
): Promise<EventStats> {
  const stats: EventStats = {
    total: events.length,
    replayed: 0,
    skipped: 0,
    failed: 0,
  };

  for (const ev of events) {
    const tournamentId = ev.tournamentId.toString();
    process.stdout.write(`  [TournamentCreated] id=${tournamentId} … `);

    // Prize percents arrive as a fan-out of `PrizePercentSet` events
    // emitted in the same tx; aggregateor returns the rebuilt array or
    // an all-zero fallback if the per-place stream is missing.
    const prizePercents =
      prizePercentsByTournament.get(tournamentId) ??
      Array.from({ length: NUM_WINNERS }, () => UInt32.from(0));

    const result = await post(`${BACKEND_URL}/tournament`, {
      tournamentId,
      ticketPrice: ev.ticketPrice.toBigInt().toString(),
      feePercent: Number(ev.feePercent.toBigint()),
      claimDeadlineSlot: Number(ev.claimDeadlineSlot.toBigint()),
      claimWindow:
        Number(ev.claimDeadlineSlot.toBigint()) -
        Number(ev.battleEndSlot.toBigint()),
      prizePercents: prizePercents.map((p) => Number(p.toBigint())),
      battleStartSlot: Number(ev.battleStartSlot.toBigint()),
      battleEndSlot: Number(ev.battleEndSlot.toBigint()),
      tournamentsRoot,
    });

    if (result.skipped) {
      console.log('SKIP (already exists)');
      stats.skipped++;
    } else if (result.ok) {
      console.log('OK');
      stats.replayed++;
    } else {
      console.log(
        `FAIL [${result.status ?? 'network error'}] ${result.error ?? ''}`
      );
      stats.failed++;
    }
  }

  return stats;
}

async function replayTicketPurchased(
  events: TicketPurchasedEvent[]
): Promise<EventStats> {
  const stats: EventStats = {
    total: events.length,
    replayed: 0,
    skipped: 0,
    failed: 0,
  };

  for (const ev of events) {
    const tournamentId = ev.tournamentId.toString();
    const playerPubKey = ev.player.toBase58();
    process.stdout.write(
      `  [TicketPurchased] tournament=${tournamentId} player=${playerPubKey.slice(
        0,
        16
      )}… `
    );

    const result = await post(
      `${BACKEND_URL}/tournament/${encodeURIComponent(
        tournamentId
      )}/buy-ticket`,
      { playerPubKey }
    );

    if (result.skipped) {
      console.log('SKIP (already registered or pending)');
      stats.skipped++;
    } else if (result.ok) {
      console.log('OK');
      stats.replayed++;
    } else {
      console.log(
        `FAIL [${result.status ?? 'network error'}] ${result.error ?? ''}`
      );
      stats.failed++;
    }
  }

  return stats;
}

async function replayTournamentFinalized(
  events: TournamentFinalizedEvent[],
  winnersByTournament: Map<string, AggregatedWinners>
): Promise<EventStats> {
  const stats: EventStats = {
    total: events.length,
    replayed: 0,
    skipped: 0,
    failed: 0,
  };

  if (events.length === 0) return stats;

  // There is no dedicated backend endpoint to replay a finalization event —
  // finalization is initiated internally by the chain monitor.  We log each
  // event so the operator can manually trigger finalization if needed.
  console.log(
    `  [TournamentFinalized] ${events.length} event(s) found — no HTTP endpoint to replay.`
  );
  console.log('  Winners per tournament:');
  for (const ev of events) {
    const id = ev.tournamentId.toString();
    console.log(
      `    tournament=${id}  totalAllocated=${ev.totalAllocated.toBigInt()}nMINA`
    );
    // Winner detail comes from the per-place WinnerAllocated stream, not
    // the header. Empty slots (PublicKey.empty / 0 prize) are skipped.
    const agg = winnersByTournament.get(id);
    if (!agg) continue;
    for (let i = 0; i < NUM_WINNERS; i++) {
      const prize = agg.prizes[i].toBigInt();
      if (prize === 0n) continue;
      console.log(
        `      winner${i + 1}=${agg.winners[i].toBase58()} prize=${prize}nMINA`
      );
    }
  }
  console.log(
    '  To trigger finalization use the backend admin API or restart the chain monitor.'
  );

  // Count as skipped — they are not failures, just unactionable from here.
  stats.skipped = events.length;
  return stats;
}

async function replayPrizeClaimed(
  events: PrizeClaimedEvent[]
): Promise<EventStats> {
  const stats: EventStats = {
    total: events.length,
    replayed: 0,
    skipped: 0,
    failed: 0,
  };

  for (const ev of events) {
    const tournamentId = ev.tournamentId.toString();
    const playerPubKey = ev.player.toBase58();
    process.stdout.write(
      `  [PrizeClaimed] tournament=${tournamentId} player=${playerPubKey.slice(
        0,
        16
      )}… `
    );

    const result = await post(
      `${BACKEND_URL}/tournament/${encodeURIComponent(
        tournamentId
      )}/claim-prize`,
      { playerPubKey }
    );

    if (result.skipped) {
      console.log('SKIP (already claimed or pending)');
      stats.skipped++;
    } else if (result.ok) {
      console.log('OK');
      stats.replayed++;
    } else {
      console.log(
        `FAIL [${result.status ?? 'network error'}] ${result.error ?? ''}`
      );
      stats.failed++;
    }
  }

  return stats;
}

// ─────────────────────────────── Main ────────────────────────────────────────

async function main() {
  console.log('='.repeat(60));
  console.log('Replay Events Script');
  console.log('='.repeat(60));

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
  console.log(`Backend URL:      ${BACKEND_URL}`);

  // ── Fetch on-chain account & events ─────────────────────────────────────────
  await fetchAccount({ publicKey: contractAddress });

  const events = await fetchContractEvents(contractAddress);

  // ── Rebuild & verify merkle root ─────────────────────────────────────────────
  console.log('\nRebuilding tournaments merkle map from events...');
  const { tournamentsMap } = rebuildTournamentsMap(events);

  const contract = new TournamentManager(contractAddress);
  const onChainRoot = contract.tournamentsRoot.get();
  const rebuiltRoot = tournamentsMap.getRoot();

  console.log(`On-chain root: ${onChainRoot.toString()}`);
  console.log(`Rebuilt root:  ${rebuiltRoot.toString()}`);

  if (!onChainRoot.equals(rebuiltRoot).toBoolean()) {
    console.error('\nERROR: Rebuilt root does not match on-chain root!');
    console.error('Events may be incomplete or state is corrupted.');
    process.exit(1);
  }
  console.log('✓ Root verification passed');

  const tournamentsRoot = rebuiltRoot.toString();

  // ── Replay each event type ────────────────────────────────────────────────────
  // Pre-aggregate the per-place fan-out streams once so each replay path
  // can do a constant-time lookup per tournament.
  const prizePercentsByTournament = aggregatePrizePercents(
    events.prizePercentSet
  );
  const winnersByTournament = aggregateWinners(events.winnerAllocated);

  console.log('\n' + '─'.repeat(60));
  console.log('Replaying TournamentCreated events...');
  const createdStats = await replayTournamentCreated(
    events.tournamentCreated,
    prizePercentsByTournament,
    tournamentsRoot
  );

  console.log('\n' + '─'.repeat(60));
  console.log('Replaying TicketPurchased events...');
  const ticketStats = await replayTicketPurchased(events.ticketPurchased);

  console.log('\n' + '─'.repeat(60));
  console.log('Replaying TournamentFinalized events...');
  const finalizedStats = await replayTournamentFinalized(
    events.tournamentFinalized,
    winnersByTournament
  );

  console.log('\n' + '─'.repeat(60));
  console.log('Replaying PrizeClaimed events...');
  const claimedStats = await replayPrizeClaimed(events.prizeClaimed);

  // ── Summary ───────────────────────────────────────────────────────────────────
  const allStats: Record<string, EventStats> = {
    TournamentCreated: createdStats,
    TicketPurchased: ticketStats,
    TournamentFinalized: finalizedStats,
    PrizeClaimed: claimedStats,
  };

  const totalFailed = Object.values(allStats).reduce((s, v) => s + v.failed, 0);

  console.log('\n' + '='.repeat(60));
  console.log('REPLAY SUMMARY');
  console.log('='.repeat(60));
  console.log(
    `${'Event type'.padEnd(24)} ${'Total'.padStart(6)} ${'Replayed'.padStart(
      9
    )} ${'Skipped'.padStart(8)} ${'Failed'.padStart(7)}`
  );
  console.log('─'.repeat(60));
  for (const [name, s] of Object.entries(allStats)) {
    console.log(
      `${name.padEnd(24)} ${String(s.total).padStart(6)} ${String(
        s.replayed
      ).padStart(9)} ${String(s.skipped).padStart(8)} ${String(
        s.failed
      ).padStart(7)}`
    );
  }
  console.log('─'.repeat(60));
  const totals = Object.values(allStats).reduce(
    (acc, s) => ({
      total: acc.total + s.total,
      replayed: acc.replayed + s.replayed,
      skipped: acc.skipped + s.skipped,
      failed: acc.failed + s.failed,
    }),
    { total: 0, replayed: 0, skipped: 0, failed: 0 }
  );
  console.log(
    `${'TOTAL'.padEnd(24)} ${String(totals.total).padStart(6)} ${String(
      totals.replayed
    ).padStart(9)} ${String(totals.skipped).padStart(8)} ${String(
      totals.failed
    ).padStart(7)}`
  );
  console.log('='.repeat(60));

  if (totalFailed > 0) {
    console.error(
      `\n${totalFailed} event(s) failed to replay. See output above for details.`
    );
    process.exit(1);
  }

  console.log('\nAll events replayed successfully.');
}

main().catch((err) => {
  console.error('Replay failed:', err);
  process.exit(1);
});
