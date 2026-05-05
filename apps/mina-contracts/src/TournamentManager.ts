// o1js ^1.5+
import {
  SmartContract,
  state,
  State,
  method,
  PublicKey,
  UInt64,
  UInt32,
  Field,
  Poseidon,
  Bool,
  MerkleMapWitness,
  Struct,
  Provable,
  MerkleMap,
} from 'o1js';

/* --------------------------------- Constants --------------------------------- */

const PERCENT_BASE = UInt32.from(10000); // 100.00%
export const NUM_WINNERS = 10;

/* --------------------------------- Array types (provable) ------------------- */

const PrizePercentsArray = Provable.Array(UInt32, NUM_WINNERS);
const WinnersArray       = Provable.Array(PublicKey, NUM_WINNERS);
const PrizesArray        = Provable.Array(UInt64, NUM_WINNERS);

/* --------------------------------- Input wrappers (for @method args) -------- */

export class WinnersInput extends Struct({
  items: WinnersArray,
}) {}

export class PrizesInput extends Struct({
  items: PrizesArray,
}) {}

/* --------------------------------- Structs --------------------------------- */

export const TournamentStatus = {
  Created: UInt32.from(0),
  Battle:  UInt32.from(1),
  Claiming: UInt32.from(2),
  Settled:  UInt32.from(3),
};

export class TournamentConfig extends Struct({
  ticketPrice:   UInt64,
  prizePercents: PrizePercentsArray,
  /**
   * Per-tournament platform fee in basis points (e.g. 500 = 5%).
   * Locked at create-time so admin cannot mutate fee mid-tournament.
   */
  feePercent:    UInt32,
  /**
   * Number of slots after `battleEndSlot` during which winners can claim.
   * Once it elapses the admin can sweep unclaimed prize money via
   * `recoverUnclaimed`. Must be > 0.
   */
  claimWindow:   UInt32,
}) {
  static empty(): TournamentConfig {
    return new TournamentConfig({
      ticketPrice: UInt64.from(0),
      prizePercents: [
        UInt32.from(2500), UInt32.from(1500), UInt32.from(1000),
        UInt32.from(1000), UInt32.from(1000), UInt32.from(700),
        UInt32.from(700),  UInt32.from(700),  UInt32.from(500),
        UInt32.from(400),
      ],
      feePercent:  UInt32.from(500),
      claimWindow: UInt32.from(20_000),
    });
  }

  assertValidDistribution() {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    let total = this.prizePercents[0]!;
    for (let i = 1; i < NUM_WINNERS; i++) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      total = total.add(this.prizePercents[i]!);
    }
    total.assertEquals(PERCENT_BASE);
  }
}

export class TournamentLeaf extends Struct({
  status:            UInt32,
  battleStartSlot:   UInt32,
  battleEndSlot:     UInt32,
  /** Slot at which the claim window closes; admin can recover after. */
  claimDeadlineSlot: UInt32,
  ticketPrice:       UInt64,
  /** Snapshot of platform fee in basis points; locked at create. */
  feePercent:        UInt32,
  prizePercents:     PrizePercentsArray,
  participantsRoot:  Field,
  winnersRoot:       Field,
  /**
   * Live, decremented-on-claim accounting. After `recoverUnclaimed` runs
   * this is zero and the tournament is fully settled.
   */
  prizePool:         UInt64,
  participantCount:  UInt32,
  /**
   * Total amount supplied by sponsors via `sponsorFund`. Tracked for
   * accounting/transparency; counted into `prizePool`.
   */
  sponsorContribution: UInt64,
}) {
  hash(): Field {
    const prizeFields = (this.prizePercents as UInt32[]).flatMap((p) => p.toFields());
    return Poseidon.hash([
      ...this.status.toFields(),
      ...this.battleStartSlot.toFields(),
      ...this.battleEndSlot.toFields(),
      ...this.claimDeadlineSlot.toFields(),
      ...this.ticketPrice.toFields(),
      ...this.feePercent.toFields(),
      ...prizeFields,
      this.participantsRoot,
      this.winnersRoot,
      ...this.prizePool.toFields(),
      ...this.participantCount.toFields(),
      ...this.sponsorContribution.toFields(),
    ]);
  }

  static empty(): TournamentLeaf {
    return new TournamentLeaf({
      status:           TournamentStatus.Created,
      battleStartSlot:  UInt32.from(0),
      battleEndSlot:    UInt32.from(0),
      claimDeadlineSlot: UInt32.from(0),
      ticketPrice:      UInt64.from(0),
      feePercent:       UInt32.from(0),
      prizePercents: Array.from({ length: NUM_WINNERS }, () => UInt32.from(0)),
      participantsRoot: new MerkleMap().getRoot(),
      winnersRoot:      new MerkleMap().getRoot(),
      prizePool:        UInt64.from(0),
      participantCount: UInt32.from(0),
      sponsorContribution: UInt64.from(0),
    });
  }
}

export class WinnerLeaf extends Struct({
  prizeAmount: UInt64,
  claimed:     Bool,
}) {
  hash(): Field {
    return Poseidon.hash([
      ...this.prizeAmount.toFields(),
      ...this.claimed.toFields(),
    ]);
  }

  static empty(): WinnerLeaf {
    return new WinnerLeaf({
      prizeAmount: UInt64.from(0),
      claimed:     Bool(false),
    });
  }
}

/* --------------------------------- Events --------------------------------- */

/**
 * Header event emitted once per tournament creation. The prize distribution
 * is *not* embedded here because Mina caps a single event payload at 16
 * Field elements; the 10-slot `prizePercents` array would push us over.
 * Indexers should pair this header with the 10 `PrizePercentSet` events
 * emitted in the same transaction (one per place) to reconstruct the full
 * configuration. Aggregation key: `tournamentId`.
 */
export class TournamentCreatedEvent extends Struct({
  tournamentId:      Field,
  battleStartSlot:   UInt32,
  battleEndSlot:     UInt32,
  claimDeadlineSlot: UInt32,
  ticketPrice:       UInt64,
  feePercent:        UInt32,
}) {}

/**
 * One per (tournament, place) — emitted in a fixed-size loop alongside
 * `TournamentCreated`. Total events per createTournament tx = 1 + NUM_WINNERS.
 */
export class PrizePercentSetEvent extends Struct({
  tournamentId: Field,
  place:        UInt32,
  percent:      UInt32,
}) {}

export class TicketPurchasedEvent extends Struct({
  tournamentId:        Field,
  player:              PublicKey,
  newParticipantsRoot: Field,
  newPrizePool:        UInt64,
  newParticipantCount: UInt32,
}) {}

export class SponsorFundedEvent extends Struct({
  tournamentId:        Field,
  sponsor:             PublicKey,
  amount:              UInt64,
  newPrizePool:        UInt64,
  newSponsorContribution: UInt64,
}) {}

/**
 * Header event for finalization. Per-winner detail is split out into the
 * companion `WinnerAllocated` events (one per place) for the same reason
 * as `TournamentCreated` above. `totalAllocated` is the sum of every
 * `WinnerAllocated.prize` in this tx — indexers can use that as a checksum.
 */
export class TournamentFinalizedEvent extends Struct({
  tournamentId:   Field,
  newWinnersRoot: Field,
  totalAllocated: UInt64,
}) {}

export class WinnerAllocatedEvent extends Struct({
  tournamentId: Field,
  place:        UInt32,
  winner:       PublicKey,
  prize:        UInt64,
}) {}

export class PrizeClaimedEvent extends Struct({
  tournamentId:  Field,
  player:        PublicKey,
  prizeAmount:   UInt64,
  newWinnersRoot: Field,
  newPrizePool:  UInt64,
}) {}

export class UnclaimedRecoveredEvent extends Struct({
  tournamentId:   Field,
  recipient:      PublicKey,
  amount:         UInt64,
}) {}

/* --------------------------------- Contract --------------------------------- */

export class TournamentManager extends SmartContract {
  @state(Field)     tournamentsRoot    = State<Field>();
  @state(PublicKey) admin              = State<PublicKey>();
  /**
   * Default platform fee used for new tournaments. Each tournament still
   * snapshots its own `feePercent` into the leaf at creation, so toggling
   * this never affects in-flight tournaments.
   */
  @state(UInt32)    platformFeePercent = State<UInt32>();
  @state(PublicKey) gameManagerAddress = State<PublicKey>();

  events = {
    TournamentCreated:    TournamentCreatedEvent,
    PrizePercentSet:      PrizePercentSetEvent,
    TicketPurchased:      TicketPurchasedEvent,
    SponsorFunded:        SponsorFundedEvent,
    TournamentFinalized:  TournamentFinalizedEvent,
    WinnerAllocated:      WinnerAllocatedEvent,
    PrizeClaimed:         PrizeClaimedEvent,
    UnclaimedRecovered:   UnclaimedRecoveredEvent,
  };

  init() {
    super.init();
    this.tournamentsRoot.set(new MerkleMap().getRoot());
    const admin = this.sender.getAndRequireSignature();
    this.admin.set(admin);
    this.platformFeePercent.set(UInt32.from(500)); // 5% default
    this.gameManagerAddress.set(PublicKey.empty());
  }

  /* ------------------------------ Helper methods ------------------------------ */

  private assertAdmin() {
    this.sender
      .getAndRequireSignature()
      .assertEquals(this.admin.getAndRequireEquals());
  }

  private getCurrentSlot(): UInt32 {
    const slot = this.network.globalSlotSinceGenesis.get();
    this.network.globalSlotSinceGenesis.requireEquals(slot);
    return slot;
  }

  private static keyFor(value: Field): Field {
    return Poseidon.hash([value]);
  }

  private static keyForPublicKey(pk: PublicKey): Field {
    return Poseidon.hash(pk.toFields());
  }

  /* ------------------------------- Admin setters ------------------------------ */

  @method async setAdmin(newAdmin: PublicKey) {
    this.assertAdmin();
    this.admin.set(newAdmin);
  }

  @method async setPlatformFeePercent(newFee: UInt32) {
    this.assertAdmin();
    newFee.assertLessThanOrEqual(UInt32.from(5000), 'Fee cannot exceed 50%');
    this.platformFeePercent.set(newFee);
  }

  @method async setGameManagerAddress(address: PublicKey) {
    this.assertAdmin();
    this.gameManagerAddress.set(address);
  }

  /* ------------------------------- Tournament Admin Methods ------------------------------ */

  @method async createTournament(
    tournamentId:      Field,
    config:            TournamentConfig,
    battleStartSlot:   UInt32,
    battleEndSlot:     UInt32,
    tournamentWitness: MerkleMapWitness
  ) {
    this.assertAdmin();

    config.assertValidDistribution();
    config.ticketPrice.assertGreaterThan(UInt64.from(0), 'Ticket price must be > 0');
    config.feePercent.assertLessThanOrEqual(UInt32.from(5000), 'Fee cannot exceed 50%');
    config.claimWindow.assertGreaterThan(UInt32.from(0), 'Claim window must be > 0');
    battleStartSlot.assertLessThan(battleEndSlot, 'Battle must start before it ends');

    const claimDeadlineSlot = battleEndSlot.add(config.claimWindow);

    const currentRoot = this.tournamentsRoot.getAndRequireEquals();

    const [rootBefore, key] = tournamentWitness.computeRootAndKey(Field(0)) as [Field, Field];
    rootBefore.assertEquals(currentRoot, 'Tournament already exists');
    key.assertEquals(TournamentManager.keyFor(tournamentId), 'Invalid witness key');

    const newTournament = new TournamentLeaf({
      status:           TournamentStatus.Battle,
      battleStartSlot,
      battleEndSlot,
      claimDeadlineSlot,
      ticketPrice:      config.ticketPrice,
      feePercent:       config.feePercent,
      prizePercents:    config.prizePercents,
      participantsRoot: new MerkleMap().getRoot(),
      winnersRoot:      new MerkleMap().getRoot(),
      prizePool:        UInt64.from(0),
      participantCount: UInt32.from(0),
      sponsorContribution: UInt64.from(0),
    });

    const [newRoot] = tournamentWitness.computeRootAndKey(newTournament.hash()) as [Field, Field];
    this.tournamentsRoot.set(newRoot);
    this.emitEvent('TournamentCreated', new TournamentCreatedEvent({
      tournamentId,
      battleStartSlot,
      battleEndSlot,
      claimDeadlineSlot,
      ticketPrice:   config.ticketPrice,
      feePercent:    config.feePercent,
    }));
    // Emit per-place prize percents as separate events; keeps each event
    // payload under Mina's 16-Field cap while preserving full data for
    // off-chain replay. Indexers correlate these with the header by
    // tournamentId in the same transaction.
    for (let i = 0; i < NUM_WINNERS; i++) {
      this.emitEvent('PrizePercentSet', new PrizePercentSetEvent({
        tournamentId,
        place:   UInt32.from(i),
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        percent: config.prizePercents[i]!,
      }));
    }
  }

  /**
   * Allow anyone (typically branded as a "sponsor") to add MINA to a
   * tournament's prize pool while it is still in Battle phase. The funds
   * stay inside the zkApp account and are accounted for via the leaf's
   * `prizePool` and `sponsorContribution` fields.
   */
  @method async sponsorFund(
    tournamentId:      Field,
    currentTournament: TournamentLeaf,
    tournamentWitness: MerkleMapWitness,
    amount:            UInt64
  ) {
    const sponsor    = this.sender.getAndRequireSignature();
    const currentSlot = this.getCurrentSlot();
    const currentRoot = this.tournamentsRoot.getAndRequireEquals();

    const [rootBefore, tKey] = tournamentWitness.computeRootAndKey(
      currentTournament.hash()
    ) as [Field, Field];
    rootBefore.assertEquals(currentRoot, 'Invalid tournament state');
    tKey.assertEquals(TournamentManager.keyFor(tournamentId), 'Invalid tournament ID');

    currentTournament.status.assertEquals(TournamentStatus.Battle);
    currentSlot.assertLessThan(
      currentTournament.battleEndSlot,
      'Sponsor funding closed after battle end'
    );

    amount.assertGreaterThan(UInt64.from(0), 'Sponsor amount must be > 0');

    this.balance.addInPlace(amount);

    const newPrizePool        = currentTournament.prizePool.add(amount);
    const newSponsorContribution = currentTournament.sponsorContribution.add(amount);

    const updatedTournament = new TournamentLeaf({
      status:            currentTournament.status,
      battleStartSlot:   currentTournament.battleStartSlot,
      battleEndSlot:     currentTournament.battleEndSlot,
      claimDeadlineSlot: currentTournament.claimDeadlineSlot,
      ticketPrice:       currentTournament.ticketPrice,
      feePercent:        currentTournament.feePercent,
      prizePercents:     currentTournament.prizePercents,
      participantsRoot:  currentTournament.participantsRoot,
      winnersRoot:       currentTournament.winnersRoot,
      prizePool:         newPrizePool,
      participantCount:  currentTournament.participantCount,
      sponsorContribution: newSponsorContribution,
    });

    const [newTournamentRoot] = tournamentWitness.computeRootAndKey(
      updatedTournament.hash()
    ) as [Field, Field];
    this.tournamentsRoot.set(newTournamentRoot);

    this.emitEvent('SponsorFunded', new SponsorFundedEvent({
      tournamentId,
      sponsor,
      amount,
      newPrizePool,
      newSponsorContribution,
    }));
  }

  /**
   * Finalize a tournament with up to NUM_WINNERS winners.
   * Pass PublicKey.empty() / UInt64.from(0) for unused slots.
   */
  @method async finalizeTournament(
    tournamentId:        Field,
    currentTournament:   TournamentLeaf,
    tournamentWitness:   MerkleMapWitness,
    winnersInput:        WinnersInput,
    prizesInput:         PrizesInput,
    newWinnersRoot:      Field
  ) {
    this.assertAdmin();

    const currentSlot = this.getCurrentSlot();
    const currentRoot = this.tournamentsRoot.getAndRequireEquals();

    const [rootBefore, key] = tournamentWitness.computeRootAndKey(
      currentTournament.hash()
    ) as [Field, Field];
    rootBefore.assertEquals(currentRoot, 'Invalid tournament state');
    key.assertEquals(TournamentManager.keyFor(tournamentId), 'Invalid tournament ID');

    currentTournament.status.assertEquals(TournamentStatus.Battle);
    currentSlot.assertGreaterThanOrEqual(
      currentTournament.battleEndSlot,
      'Battle phase not ended yet'
    );

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    let totalPrizes = prizesInput.items[0]!;
    for (let i = 1; i < NUM_WINNERS; i++) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      totalPrizes = totalPrizes.add(prizesInput.items[i]!);
    }
    totalPrizes.assertLessThanOrEqual(currentTournament.prizePool, 'Prizes exceed pool');

    const finalizedTournament = new TournamentLeaf({
      status:            TournamentStatus.Claiming,
      battleStartSlot:   currentTournament.battleStartSlot,
      battleEndSlot:     currentTournament.battleEndSlot,
      claimDeadlineSlot: currentTournament.claimDeadlineSlot,
      ticketPrice:       currentTournament.ticketPrice,
      feePercent:        currentTournament.feePercent,
      prizePercents:     currentTournament.prizePercents,
      participantsRoot:  currentTournament.participantsRoot,
      winnersRoot:       newWinnersRoot,
      // Track the *allocated* total — anything not allocated to winners is
      // immediately recoverable by admin and never sits as undead state.
      prizePool:         totalPrizes,
      participantCount:  currentTournament.participantCount,
      sponsorContribution: currentTournament.sponsorContribution,
    });

    const [newRoot] = tournamentWitness.computeRootAndKey(
      finalizedTournament.hash()
    ) as [Field, Field];
    this.tournamentsRoot.set(newRoot);

    // If we underspent the pool, refund the unallocated remainder to admin
    // immediately — keeps zkApp balance in lock-step with leaf prizePool.
    const remainder = currentTournament.prizePool.sub(totalPrizes);
    const adminAddress = this.admin.getAndRequireEquals();
    // `send` of zero is a no-op for accounting purposes but still emits an
    // account update; gate it with a Provable.if guard.
    const refund = Provable.if(
      remainder.greaterThan(UInt64.from(0)),
      remainder,
      UInt64.from(0)
    );
    this.send({ to: adminAddress, amount: refund });

    this.emitEvent('TournamentFinalized', new TournamentFinalizedEvent({
      tournamentId,
      newWinnersRoot,
      totalAllocated: totalPrizes,
    }));
    // Emit per-place winner allocations alongside the header. Total events
    // per finalize tx = 1 header + NUM_WINNERS detail = 11. Empty slots
    // (PublicKey.empty / 0 prize) are still emitted so indexers see a
    // stable, fixed-shape stream.
    for (let i = 0; i < NUM_WINNERS; i++) {
      this.emitEvent('WinnerAllocated', new WinnerAllocatedEvent({
        tournamentId,
        place:  UInt32.from(i),
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        winner: winnersInput.items[i]!,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        prize:  prizesInput.items[i]!,
      }));
    }
  }

  /* ------------------------------- Player Methods ------------------------------ */

  @method async buyTicket(
    tournamentId:       Field,
    currentTournament:  TournamentLeaf,
    tournamentWitness:  MerkleMapWitness,
    participantWitness: MerkleMapWitness
  ) {
    const player      = this.sender.getAndRequireSignature();
    const currentSlot = this.getCurrentSlot();
    const currentRoot = this.tournamentsRoot.getAndRequireEquals();

    const [rootBefore, tKey] = tournamentWitness.computeRootAndKey(
      currentTournament.hash()
    ) as [Field, Field];
    rootBefore.assertEquals(currentRoot, 'Invalid tournament state');
    tKey.assertEquals(TournamentManager.keyFor(tournamentId), 'Invalid tournament ID');

    currentTournament.status.assertEquals(TournamentStatus.Battle);
    currentSlot.assertGreaterThanOrEqual(currentTournament.battleStartSlot, 'Battle not started');
    currentSlot.assertLessThan(currentTournament.battleEndSlot, 'Battle ended');

    const playerKey = TournamentManager.keyForPublicKey(player);
    const [participantsRootBefore, pKey] = participantWitness.computeRootAndKey(Field(0)) as [Field, Field];
    participantsRootBefore.assertEquals(currentTournament.participantsRoot, 'Invalid participants state');
    pKey.assertEquals(playerKey, 'Invalid participant witness');

    // Use the leaf's locked feePercent so admin cannot front-run a buy
    // by raising platformFeePercent between proof generation and inclusion.
    const feePercent  = currentTournament.feePercent;
    const ticketPrice = currentTournament.ticketPrice;

    const feeAmount         = ticketPrice.mul(UInt64.from(feePercent)).div(UInt64.from(10000));
    const prizeContribution = ticketPrice.sub(feeAmount);

    this.balance.addInPlace(ticketPrice);

    const adminAddress = this.admin.getAndRequireEquals();
    this.send({ to: adminAddress, amount: feeAmount });

    const [newParticipantsRoot] = participantWitness.computeRootAndKey(Field(1)) as [Field, Field];

    const updatedTournament = new TournamentLeaf({
      status:            currentTournament.status,
      battleStartSlot:   currentTournament.battleStartSlot,
      battleEndSlot:     currentTournament.battleEndSlot,
      claimDeadlineSlot: currentTournament.claimDeadlineSlot,
      ticketPrice:       currentTournament.ticketPrice,
      feePercent:        currentTournament.feePercent,
      prizePercents:     currentTournament.prizePercents,
      participantsRoot:  newParticipantsRoot,
      winnersRoot:       currentTournament.winnersRoot,
      prizePool:         currentTournament.prizePool.add(prizeContribution),
      participantCount:  currentTournament.participantCount.add(1),
      sponsorContribution: currentTournament.sponsorContribution,
    });

    const [newTournamentRoot] = tournamentWitness.computeRootAndKey(
      updatedTournament.hash()
    ) as [Field, Field];
    this.tournamentsRoot.set(newTournamentRoot);

    this.emitEvent('TicketPurchased', new TicketPurchasedEvent({
      tournamentId,
      player,
      newParticipantsRoot,
      newPrizePool:        updatedTournament.prizePool,
      newParticipantCount: updatedTournament.participantCount,
    }));
  }

  @method async claimPrize(
    tournamentId:       Field,
    currentTournament:  TournamentLeaf,
    tournamentWitness:  MerkleMapWitness,
    currentWinnerLeaf:  WinnerLeaf,
    winnerWitness:      MerkleMapWitness
  ) {
    const player      = this.sender.getAndRequireSignature();
    const currentSlot = this.getCurrentSlot();
    const currentRoot = this.tournamentsRoot.getAndRequireEquals();

    const [rootBefore, tKey] = tournamentWitness.computeRootAndKey(
      currentTournament.hash()
    ) as [Field, Field];
    rootBefore.assertEquals(currentRoot, 'Invalid tournament state');
    tKey.assertEquals(TournamentManager.keyFor(tournamentId), 'Invalid tournament ID');

    currentTournament.status.assertEquals(TournamentStatus.Claiming);
    currentSlot.assertLessThan(
      currentTournament.claimDeadlineSlot,
      'Claim window has closed'
    );

    const playerKey = TournamentManager.keyForPublicKey(player);
    const [winnersRootBefore, wKey] = winnerWitness.computeRootAndKey(
      currentWinnerLeaf.hash()
    ) as [Field, Field];
    winnersRootBefore.assertEquals(currentTournament.winnersRoot, 'Invalid winners state');
    wKey.assertEquals(playerKey, 'Invalid winner witness');

    currentWinnerLeaf.claimed.assertFalse('Prize already claimed');
    currentWinnerLeaf.prizeAmount.assertGreaterThan(UInt64.from(0), 'No prize to claim');
    currentWinnerLeaf.prizeAmount.assertLessThanOrEqual(
      currentTournament.prizePool,
      'Prize exceeds remaining pool'
    );

    this.send({ to: player, amount: currentWinnerLeaf.prizeAmount });

    const updatedWinnerLeaf = new WinnerLeaf({
      prizeAmount: currentWinnerLeaf.prizeAmount,
      claimed:     Bool(true),
    });
    const [newWinnersRoot] = winnerWitness.computeRootAndKey(
      updatedWinnerLeaf.hash()
    ) as [Field, Field];

    // Decrement live pool so leaf accounting stays aligned with zkApp balance.
    const newPrizePool = currentTournament.prizePool.sub(currentWinnerLeaf.prizeAmount);

    const updatedTournament = new TournamentLeaf({
      status:            currentTournament.status,
      battleStartSlot:   currentTournament.battleStartSlot,
      battleEndSlot:     currentTournament.battleEndSlot,
      claimDeadlineSlot: currentTournament.claimDeadlineSlot,
      ticketPrice:       currentTournament.ticketPrice,
      feePercent:        currentTournament.feePercent,
      prizePercents:     currentTournament.prizePercents,
      participantsRoot:  currentTournament.participantsRoot,
      winnersRoot:       newWinnersRoot,
      prizePool:         newPrizePool,
      participantCount:  currentTournament.participantCount,
      sponsorContribution: currentTournament.sponsorContribution,
    });

    const [newTournamentRoot] = tournamentWitness.computeRootAndKey(
      updatedTournament.hash()
    ) as [Field, Field];
    this.tournamentsRoot.set(newTournamentRoot);

    this.emitEvent('PrizeClaimed', new PrizeClaimedEvent({
      tournamentId,
      player,
      prizeAmount:    currentWinnerLeaf.prizeAmount,
      newWinnersRoot,
      newPrizePool,
    }));
  }

  /**
   * Sweep any prize money still sitting in the pool after the claim
   * window closes. Required for sponsored tournaments — without this,
   * unclaimed sponsor money is permanently locked in the contract.
   */
  @method async recoverUnclaimed(
    tournamentId:      Field,
    currentTournament: TournamentLeaf,
    tournamentWitness: MerkleMapWitness
  ) {
    this.assertAdmin();

    const currentSlot = this.getCurrentSlot();
    const currentRoot = this.tournamentsRoot.getAndRequireEquals();

    const [rootBefore, tKey] = tournamentWitness.computeRootAndKey(
      currentTournament.hash()
    ) as [Field, Field];
    rootBefore.assertEquals(currentRoot, 'Invalid tournament state');
    tKey.assertEquals(TournamentManager.keyFor(tournamentId), 'Invalid tournament ID');

    currentTournament.status.assertEquals(TournamentStatus.Claiming);
    currentSlot.assertGreaterThanOrEqual(
      currentTournament.claimDeadlineSlot,
      'Claim window still open'
    );

    const remaining = currentTournament.prizePool;
    const adminAddress = this.admin.getAndRequireEquals();
    // Always emit a (possibly zero) send for a stable account-update layout.
    const recover = Provable.if(
      remaining.greaterThan(UInt64.from(0)),
      remaining,
      UInt64.from(0)
    );
    this.send({ to: adminAddress, amount: recover });

    const settledTournament = new TournamentLeaf({
      status:            TournamentStatus.Settled,
      battleStartSlot:   currentTournament.battleStartSlot,
      battleEndSlot:     currentTournament.battleEndSlot,
      claimDeadlineSlot: currentTournament.claimDeadlineSlot,
      ticketPrice:       currentTournament.ticketPrice,
      feePercent:        currentTournament.feePercent,
      prizePercents:     currentTournament.prizePercents,
      participantsRoot:  currentTournament.participantsRoot,
      winnersRoot:       currentTournament.winnersRoot,
      prizePool:         UInt64.from(0),
      participantCount:  currentTournament.participantCount,
      sponsorContribution: currentTournament.sponsorContribution,
    });

    const [newRoot] = tournamentWitness.computeRootAndKey(
      settledTournament.hash()
    ) as [Field, Field];
    this.tournamentsRoot.set(newRoot);

    this.emitEvent('UnclaimedRecovered', new UnclaimedRecoveredEvent({
      tournamentId,
      recipient: adminAddress,
      amount:    remaining,
    }));
  }
}
