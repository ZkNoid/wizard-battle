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
};

export class TournamentConfig extends Struct({
  ticketPrice:   UInt64,
  prizePercents: PrizePercentsArray,
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
  ticketPrice:       UInt64,
  prizePercents:     PrizePercentsArray,
  participantsRoot:  Field,
  winnersRoot:       Field,
  prizePool:         UInt64,
  participantCount:  UInt32,
}) {
  hash(): Field {
    const prizeFields = (this.prizePercents as UInt32[]).flatMap((p) => p.toFields());
    return Poseidon.hash([
      ...this.status.toFields(),
      ...this.battleStartSlot.toFields(),
      ...this.battleEndSlot.toFields(),
      ...this.ticketPrice.toFields(),
      ...prizeFields,
      this.participantsRoot,
      this.winnersRoot,
      ...this.prizePool.toFields(),
      ...this.participantCount.toFields(),
    ]);
  }

  static empty(): TournamentLeaf {
    return new TournamentLeaf({
      status:           TournamentStatus.Created,
      battleStartSlot:  UInt32.from(0),
      battleEndSlot:    UInt32.from(0),
      ticketPrice:      UInt64.from(0),
      prizePercents: Array.from({ length: NUM_WINNERS }, () => UInt32.from(0)),
      participantsRoot: new MerkleMap().getRoot(),
      winnersRoot:      new MerkleMap().getRoot(),
      prizePool:        UInt64.from(0),
      participantCount: UInt32.from(0),
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

export class TournamentCreatedEvent extends Struct({
  tournamentId:    Field,
  battleStartSlot: UInt32,
  battleEndSlot:   UInt32,
  ticketPrice:     UInt64,
  prizePercents:   PrizePercentsArray,
}) {}

export class TicketPurchasedEvent extends Struct({
  tournamentId:        Field,
  player:              PublicKey,
  newParticipantsRoot: Field,
  newPrizePool:        UInt64,
  newParticipantCount: UInt32,
}) {}

export class TournamentFinalizedEvent extends Struct({
  tournamentId:   Field,
  winners:        WinnersArray,
  prizes:         PrizesArray,
  newWinnersRoot: Field,
}) {}

export class PrizeClaimedEvent extends Struct({
  tournamentId: Field,
  player:       PublicKey,
  prizeAmount:  UInt64,
  newWinnersRoot: Field,
}) {}

/* --------------------------------- Contract --------------------------------- */

export class TournamentManager extends SmartContract {
  @state(Field)     tournamentsRoot    = State<Field>();
  @state(PublicKey) admin              = State<PublicKey>();
  @state(UInt32)    platformFeePercent = State<UInt32>(); // e.g., 500 = 5%
  @state(PublicKey) gameManagerAddress = State<PublicKey>();

  events = {
    TournamentCreated:    TournamentCreatedEvent,
    TicketPurchased:      TicketPurchasedEvent,
    TournamentFinalized:  TournamentFinalizedEvent,
    PrizeClaimed:         PrizeClaimedEvent,
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
    battleStartSlot.assertLessThan(battleEndSlot, 'Battle must start before it ends');

    const currentRoot = this.tournamentsRoot.getAndRequireEquals();

    const [rootBefore, key] = tournamentWitness.computeRootAndKey(Field(0)) as [Field, Field];
    rootBefore.assertEquals(currentRoot, 'Tournament already exists');
    key.assertEquals(TournamentManager.keyFor(tournamentId), 'Invalid witness key');

    const newTournament = new TournamentLeaf({
      status:           TournamentStatus.Battle,
      battleStartSlot,
      battleEndSlot,
      ticketPrice:      config.ticketPrice,
      prizePercents:    config.prizePercents,
      participantsRoot: new MerkleMap().getRoot(),
      winnersRoot:      new MerkleMap().getRoot(),
      prizePool:        UInt64.from(0),
      participantCount: UInt32.from(0),
    });

    const [newRoot] = tournamentWitness.computeRootAndKey(newTournament.hash()) as [Field, Field];
    this.tournamentsRoot.set(newRoot);
    this.emitEvent('TournamentCreated', new TournamentCreatedEvent({
      tournamentId,
      battleStartSlot,
      battleEndSlot,
      ticketPrice:   config.ticketPrice,
      prizePercents: config.prizePercents,
    }));
  }

  /**
   * Finalize a tournament with up to 10 winners.
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
      status:           TournamentStatus.Claiming,
      battleStartSlot:  currentTournament.battleStartSlot,
      battleEndSlot:    currentTournament.battleEndSlot,
      ticketPrice:      currentTournament.ticketPrice,
      prizePercents:    currentTournament.prizePercents,
      participantsRoot: currentTournament.participantsRoot,
      winnersRoot:      newWinnersRoot,
      prizePool:        currentTournament.prizePool,
      participantCount: currentTournament.participantCount,
    });

    const [newRoot] = tournamentWitness.computeRootAndKey(
      finalizedTournament.hash()
    ) as [Field, Field];
    this.tournamentsRoot.set(newRoot);
    this.emitEvent('TournamentFinalized', new TournamentFinalizedEvent({
      tournamentId,
      winners:        winnersInput.items,
      prizes:         prizesInput.items,
      newWinnersRoot,
    }));
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

    const feePercent = this.platformFeePercent.getAndRequireEquals();
    const ticketPrice = currentTournament.ticketPrice;

    const feeAmount        = ticketPrice.mul(UInt64.from(feePercent)).div(UInt64.from(10000));
    const prizeContribution = ticketPrice.sub(feeAmount);

    this.balance.addInPlace(ticketPrice);

    const adminAddress = this.admin.getAndRequireEquals();
    this.send({ to: adminAddress, amount: feeAmount });

    const [newParticipantsRoot] = participantWitness.computeRootAndKey(Field(1)) as [Field, Field];

    const updatedTournament = new TournamentLeaf({
      status:           currentTournament.status,
      battleStartSlot:  currentTournament.battleStartSlot,
      battleEndSlot:    currentTournament.battleEndSlot,
      ticketPrice:      currentTournament.ticketPrice,
      prizePercents:    currentTournament.prizePercents,
      participantsRoot: newParticipantsRoot,
      winnersRoot:      currentTournament.winnersRoot,
      prizePool:        currentTournament.prizePool.add(prizeContribution),
      participantCount: currentTournament.participantCount.add(1),
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
    const currentRoot = this.tournamentsRoot.getAndRequireEquals();

    const [rootBefore, tKey] = tournamentWitness.computeRootAndKey(
      currentTournament.hash()
    ) as [Field, Field];
    rootBefore.assertEquals(currentRoot, 'Invalid tournament state');
    tKey.assertEquals(TournamentManager.keyFor(tournamentId), 'Invalid tournament ID');

    currentTournament.status.assertEquals(TournamentStatus.Claiming);

    const playerKey = TournamentManager.keyForPublicKey(player);
    const [winnersRootBefore, wKey] = winnerWitness.computeRootAndKey(
      currentWinnerLeaf.hash()
    ) as [Field, Field];
    winnersRootBefore.assertEquals(currentTournament.winnersRoot, 'Invalid winners state');
    wKey.assertEquals(playerKey, 'Invalid winner witness');

    currentWinnerLeaf.claimed.assertFalse('Prize already claimed');
    currentWinnerLeaf.prizeAmount.assertGreaterThan(UInt64.from(0), 'No prize to claim');

    this.send({ to: player, amount: currentWinnerLeaf.prizeAmount });

    const updatedWinnerLeaf = new WinnerLeaf({
      prizeAmount: currentWinnerLeaf.prizeAmount,
      claimed:     Bool(true),
    });
    const [newWinnersRoot] = winnerWitness.computeRootAndKey(
      updatedWinnerLeaf.hash()
    ) as [Field, Field];

    const updatedTournament = new TournamentLeaf({
      status:           currentTournament.status,
      battleStartSlot:  currentTournament.battleStartSlot,
      battleEndSlot:    currentTournament.battleEndSlot,
      ticketPrice:      currentTournament.ticketPrice,
      prizePercents:    currentTournament.prizePercents,
      participantsRoot: currentTournament.participantsRoot,
      winnersRoot:      newWinnersRoot,
      prizePool:        currentTournament.prizePool,
      participantCount: currentTournament.participantCount,
    });

    const [newTournamentRoot] = tournamentWitness.computeRootAndKey(
      updatedTournament.hash()
    ) as [Field, Field];
    this.tournamentsRoot.set(newTournamentRoot);

    this.emitEvent('PrizeClaimed', new PrizeClaimedEvent({
      tournamentId,
      player,
      prizeAmount:   currentWinnerLeaf.prizeAmount,
      newWinnersRoot,
    }));
  }
}
