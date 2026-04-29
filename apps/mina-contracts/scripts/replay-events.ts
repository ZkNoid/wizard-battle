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
  TicketPurchasedEvent,
  TournamentFinalizedEvent,
  PrizeClaimedEvent,
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

async function fetchContractEvents(contractAddress: PublicKey): Promise<{
  tournamentCreated: TournamentCreatedEvent[];
  ticketPurchased: TicketPurchasedEvent[];
  tournamentFinalized: TournamentFinalizedEvent[];
  prizeClaimed: PrizeClaimedEvent[];
}> {
  console.log('Fetching contract events from archive...');
  const contract = new TournamentManager(contractAddress);
  const events = await contract.fetchEvents();
  console.log(`Found ${events.length} raw events`);

  const tournamentCreated: TournamentCreatedEvent[] = [];
  const ticketPurchased: TicketPurchasedEvent[] = [];
  const tournamentFinalized: TournamentFinalizedEvent[] = [];
  const prizeClaimed: PrizeClaimedEvent[] = [];

  for (const record of events) {
    const data = record.event.data;
    switch (record.type) {
      case 'TournamentCreated':
        tournamentCreated.push(data as unknown as TournamentCreatedEvent);
        break;
      case 'TicketPurchased':
        ticketPurchased.push(data as unknown as TicketPurchasedEvent);
        break;
      case 'TournamentFinalized':
        tournamentFinalized.push(data as unknown as TournamentFinalizedEvent);
        break;
      case 'PrizeClaimed':
        prizeClaimed.push(data as unknown as PrizeClaimedEvent);
        break;
      default:
        console.warn(`  Unknown event type: ${record.type}`);
    }
  }

  console.log(`Parsed events:`);
  console.log(`  TournamentCreated:   ${tournamentCreated.length}`);
  console.log(`  TicketPurchased:     ${ticketPurchased.length}`);
  console.log(`  TournamentFinalized: ${tournamentFinalized.length}`);
  console.log(`  PrizeClaimed:        ${prizeClaimed.length}`);

  return {
    tournamentCreated,
    ticketPurchased,
    tournamentFinalized,
    prizeClaimed,
  };
}

// ─────────────────────────────── Merkle rebuild ───────────────────────────────

interface TournamentState {
  leaf: TournamentLeaf;
  participantsMap: MerkleMap;
  winnersMap: MerkleMap;
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
  const tournamentsMap = new MerkleMap();
  const tournaments = new Map<string, TournamentState>();

  for (const ev of events.tournamentCreated) {
    const leaf = new TournamentLeaf({
      status: TournamentStatus.Battle,
      battleStartSlot: ev.battleStartSlot,
      battleEndSlot: ev.battleEndSlot,
      ticketPrice: ev.ticketPrice,
      prize1Percent: ev.prize1Percent,
      prize2Percent: ev.prize2Percent,
      prize3Percent: ev.prize3Percent,
      participantsRoot: new MerkleMap().getRoot(),
      winnersRoot: new MerkleMap().getRoot(),
      prizePool: UInt64.from(0),
      participantCount: UInt32.from(0),
    });
    const key = hashTournamentKey(ev.tournamentId);
    tournamentsMap.set(key, leaf.hash());
    tournaments.set(ev.tournamentId.toString(), {
      leaf,
      participantsMap: new MerkleMap(),
      winnersMap: new MerkleMap(),
    });
  }

  for (const ev of events.ticketPurchased) {
    const state = tournaments.get(ev.tournamentId.toString());
    if (state) {
      state.leaf = new TournamentLeaf({
        status: state.leaf.status,
        battleStartSlot: state.leaf.battleStartSlot,
        battleEndSlot: state.leaf.battleEndSlot,
        ticketPrice: state.leaf.ticketPrice,
        prize1Percent: state.leaf.prize1Percent,
        prize2Percent: state.leaf.prize2Percent,
        prize3Percent: state.leaf.prize3Percent,
        participantsRoot: ev.newParticipantsRoot,
        winnersRoot: state.leaf.winnersRoot,
        prizePool: ev.newPrizePool,
        participantCount: ev.newParticipantCount,
      });
      const playerKey = Poseidon.hash(ev.player.toFields());
      state.participantsMap.set(playerKey, Field(1));
      tournamentsMap.set(hashTournamentKey(ev.tournamentId), state.leaf.hash());
    }
  }

  for (const ev of events.tournamentFinalized) {
    const state = tournaments.get(ev.tournamentId.toString());
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
        winnersRoot: ev.newWinnersRoot,
        prizePool: state.leaf.prizePool,
        participantCount: state.leaf.participantCount,
      });
      tournamentsMap.set(hashTournamentKey(ev.tournamentId), state.leaf.hash());
    }
  }

  for (const ev of events.prizeClaimed) {
    const state = tournaments.get(ev.tournamentId.toString());
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
        winnersRoot: ev.newWinnersRoot,
        prizePool: state.leaf.prizePool,
        participantCount: state.leaf.participantCount,
      });
      tournamentsMap.set(hashTournamentKey(ev.tournamentId), state.leaf.hash());
    }
  }

  return { tournamentsMap, tournaments };
}

// ─────────────────────────────── Replay handlers ──────────────────────────────

async function replayTournamentCreated(
  events: TournamentCreatedEvent[],
  tournamentsRoot: string
): Promise<EventStats> {
  const stats: EventStats = { total: events.length, replayed: 0, skipped: 0, failed: 0 };

  for (const ev of events) {
    const tournamentId = ev.tournamentId.toString();
    process.stdout.write(`  [TournamentCreated] id=${tournamentId} … `);

    const result = await post(`${BACKEND_URL}/tournament`, {
      tournamentId,
      ticketPrice: ev.ticketPrice.toBigInt().toString(),
      prize1Percent: Number(ev.prize1Percent.toBigint()),
      prize2Percent: Number(ev.prize2Percent.toBigint()),
      prize3Percent: Number(ev.prize3Percent.toBigint()),
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
      console.log(`FAIL [${result.status ?? 'network error'}] ${result.error ?? ''}`);
      stats.failed++;
    }
  }

  return stats;
}

async function replayTicketPurchased(
  events: TicketPurchasedEvent[]
): Promise<EventStats> {
  const stats: EventStats = { total: events.length, replayed: 0, skipped: 0, failed: 0 };

  for (const ev of events) {
    const tournamentId = ev.tournamentId.toString();
    const playerPubKey = ev.player.toBase58();
    process.stdout.write(`  [TicketPurchased] tournament=${tournamentId} player=${playerPubKey.slice(0, 16)}… `);

    const result = await post(
      `${BACKEND_URL}/tournament/${encodeURIComponent(tournamentId)}/buy-ticket`,
      { playerPubKey }
    );

    if (result.skipped) {
      console.log('SKIP (already registered or pending)');
      stats.skipped++;
    } else if (result.ok) {
      console.log('OK');
      stats.replayed++;
    } else {
      console.log(`FAIL [${result.status ?? 'network error'}] ${result.error ?? ''}`);
      stats.failed++;
    }
  }

  return stats;
}

async function replayTournamentFinalized(
  events: TournamentFinalizedEvent[]
): Promise<EventStats> {
  const stats: EventStats = { total: events.length, replayed: 0, skipped: 0, failed: 0 };

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
    console.log(`    tournament=${id}`);
    console.log(`      winner1=${ev.winner1.toBase58()} prize=${ev.prize1.toBigInt()}nMINA`);
    console.log(`      winner2=${ev.winner2.toBase58()} prize=${ev.prize2.toBigInt()}nMINA`);
    console.log(`      winner3=${ev.winner3.toBase58()} prize=${ev.prize3.toBigInt()}nMINA`);
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
  const stats: EventStats = { total: events.length, replayed: 0, skipped: 0, failed: 0 };

  for (const ev of events) {
    const tournamentId = ev.tournamentId.toString();
    const playerPubKey = ev.player.toBase58();
    process.stdout.write(`  [PrizeClaimed] tournament=${tournamentId} player=${playerPubKey.slice(0, 16)}… `);

    const result = await post(
      `${BACKEND_URL}/tournament/${encodeURIComponent(tournamentId)}/claim-prize`,
      { playerPubKey }
    );

    if (result.skipped) {
      console.log('SKIP (already claimed or pending)');
      stats.skipped++;
    } else if (result.ok) {
      console.log('OK');
      stats.replayed++;
    } else {
      console.log(`FAIL [${result.status ?? 'network error'}] ${result.error ?? ''}`);
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
    console.error('ERROR: TOURNAMENT_CONTRACT_ADDRESS environment variable not set');
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
  console.log('\n' + '─'.repeat(60));
  console.log('Replaying TournamentCreated events...');
  const createdStats = await replayTournamentCreated(events.tournamentCreated, tournamentsRoot);

  console.log('\n' + '─'.repeat(60));
  console.log('Replaying TicketPurchased events...');
  const ticketStats = await replayTicketPurchased(events.ticketPurchased);

  console.log('\n' + '─'.repeat(60));
  console.log('Replaying TournamentFinalized events...');
  const finalizedStats = await replayTournamentFinalized(events.tournamentFinalized);

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
    `${'Event type'.padEnd(24)} ${'Total'.padStart(6)} ${'Replayed'.padStart(9)} ${'Skipped'.padStart(8)} ${'Failed'.padStart(7)}`
  );
  console.log('─'.repeat(60));
  for (const [name, s] of Object.entries(allStats)) {
    console.log(
      `${name.padEnd(24)} ${String(s.total).padStart(6)} ${String(s.replayed).padStart(9)} ${String(s.skipped).padStart(8)} ${String(s.failed).padStart(7)}`
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
    `${'TOTAL'.padEnd(24)} ${String(totals.total).padStart(6)} ${String(totals.replayed).padStart(9)} ${String(totals.skipped).padStart(8)} ${String(totals.failed).padStart(7)}`
  );
  console.log('='.repeat(60));

  if (totalFailed > 0) {
    console.error(`\n${totalFailed} event(s) failed to replay. See output above for details.`);
    process.exit(1);
  }

  console.log('\nAll events replayed successfully.');
}

main().catch((err) => {
  console.error('Replay failed:', err);
  process.exit(1);
});
