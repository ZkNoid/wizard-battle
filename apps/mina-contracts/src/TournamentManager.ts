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

/* --------------------------------- Structs --------------------------------- */

export const TournamentStatus = {
  Created: UInt32.from(0),
  Registration: UInt32.from(1),
  Battle: UInt32.from(2),
  Claiming: UInt32.from(3),
};

export class TournamentConfig extends Struct({
  ticketPrice: UInt64,
  prize1Percent: UInt32, // e.g., 5000 = 50%
  prize2Percent: UInt32, // e.g., 3000 = 30%
  prize3Percent: UInt32, // e.g., 2000 = 20%
}) {
  static empty(): TournamentConfig {
    return new TournamentConfig({
      ticketPrice: UInt64.from(0),
      prize1Percent: UInt32.from(5000),
      prize2Percent: UInt32.from(3000),
      prize3Percent: UInt32.from(2000),
    });
  }

  assertValidDistribution() {
    const total = this.prize1Percent
      .add(this.prize2Percent)
      .add(this.prize3Percent);
    total.assertEquals(PERCENT_BASE);
  }
}

export class TournamentLeaf extends Struct({
  status: UInt32,
  registrationStartSlot: UInt32,
  battleStartSlot: UInt32,
  battleEndSlot: UInt32,
  ticketPrice: UInt64,
  prize1Percent: UInt32,
  prize2Percent: UInt32,
  prize3Percent: UInt32,
  participantsRoot: Field,
  winnersRoot: Field,
  prizePool: UInt64,
  participantCount: UInt32,
}) {
  hash(): Field {
    return Poseidon.hash([
      ...this.status.toFields(),
      ...this.registrationStartSlot.toFields(),
      ...this.battleStartSlot.toFields(),
      ...this.battleEndSlot.toFields(),
      ...this.ticketPrice.toFields(),
      ...this.prize1Percent.toFields(),
      ...this.prize2Percent.toFields(),
      ...this.prize3Percent.toFields(),
      this.participantsRoot,
      this.winnersRoot,
      ...this.prizePool.toFields(),
      ...this.participantCount.toFields(),
    ]);
  }

  static empty(): TournamentLeaf {
    return new TournamentLeaf({
      status: TournamentStatus.Created,
      registrationStartSlot: UInt32.from(0),
      battleStartSlot: UInt32.from(0),
      battleEndSlot: UInt32.from(0),
      ticketPrice: UInt64.from(0),
      prize1Percent: UInt32.from(0),
      prize2Percent: UInt32.from(0),
      prize3Percent: UInt32.from(0),
      participantsRoot: new MerkleMap().getRoot(),
      winnersRoot: new MerkleMap().getRoot(),
      prizePool: UInt64.from(0),
      participantCount: UInt32.from(0),
    });
  }
}

export class WinnerLeaf extends Struct({
  prizeAmount: UInt64,
  claimed: Bool,
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
      claimed: Bool(false),
    });
  }
}

/* --------------------------------- Events --------------------------------- */

export class TournamentCreatedEvent extends Struct({
  tournamentId: Field,
  registrationStartSlot: UInt32,
  battleStartSlot: UInt32,
  battleEndSlot: UInt32,
  ticketPrice: UInt64,
  prize1Percent: UInt32,
  prize2Percent: UInt32,
  prize3Percent: UInt32,
}) {}

export class TicketPurchasedEvent extends Struct({
  tournamentId: Field,
  player: PublicKey,
  newParticipantsRoot: Field,
  newPrizePool: UInt64,
  newParticipantCount: UInt32,
}) {}

export class TournamentFinalizedEvent extends Struct({
  tournamentId: Field,
  winner1: PublicKey,
  winner2: PublicKey,
  winner3: PublicKey,
  prize1: UInt64,
  prize2: UInt64,
  prize3: UInt64,
  newWinnersRoot: Field,
}) {}

export class PrizeClaimedEvent extends Struct({
  tournamentId: Field,
  player: PublicKey,
  prizeAmount: UInt64,
  newWinnersRoot: Field,
}) {}

/* --------------------------------- Contract --------------------------------- */

export class TournamentManager extends SmartContract {
  @state(Field) tournamentsRoot = State<Field>();
  @state(PublicKey) admin = State<PublicKey>();
  @state(UInt32) platformFeePercent = State<UInt32>(); // e.g., 500 = 5%
  @state(PublicKey) gameManagerAddress = State<PublicKey>();

  events = {
    TournamentCreated: TournamentCreatedEvent,
    TicketPurchased: TicketPurchasedEvent,
    TournamentFinalized: TournamentFinalizedEvent,
    PrizeClaimed: PrizeClaimedEvent,
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
    tournamentId: Field,
    config: TournamentConfig,
    registrationStartSlot: UInt32,
    battleStartSlot: UInt32,
    battleEndSlot: UInt32,
    tournamentWitness: MerkleMapWitness
  ) {
    this.assertAdmin();

    // Validate config
    config.assertValidDistribution();
    config.ticketPrice.assertGreaterThan(
      UInt64.from(0),
      'Ticket price must be > 0'
    );

    // Validate timing: registration < battle < battleEnd
    registrationStartSlot.assertLessThan(
      battleStartSlot,
      'Registration must start before battle'
    );
    battleStartSlot.assertLessThan(
      battleEndSlot,
      'Battle must start before it ends'
    );

    const currentRoot = this.tournamentsRoot.getAndRequireEquals();

    // Verify tournament doesn't exist (empty leaf)
    const [rootBefore, key] = tournamentWitness.computeRootAndKey(Field(0)) as [Field, Field];
    rootBefore.assertEquals(currentRoot, 'Tournament already exists');
    key.assertEquals(
      TournamentManager.keyFor(tournamentId),
      'Invalid witness key'
    );

    // Create new tournament leaf
    const newTournament = new TournamentLeaf({
      status: TournamentStatus.Registration,
      registrationStartSlot,
      battleStartSlot,
      battleEndSlot,
      ticketPrice: config.ticketPrice,
      prize1Percent: config.prize1Percent,
      prize2Percent: config.prize2Percent,
      prize3Percent: config.prize3Percent,
      participantsRoot: new MerkleMap().getRoot(),
      winnersRoot: new MerkleMap().getRoot(),
      prizePool: UInt64.from(0),
      participantCount: UInt32.from(0),
    });

    const [newRoot] = tournamentWitness.computeRootAndKey(newTournament.hash()) as [Field, Field];
    this.tournamentsRoot.set(newRoot);
    this.emitEvent(
      'TournamentCreated',
      new TournamentCreatedEvent({
        tournamentId,
        registrationStartSlot,
        battleStartSlot,
        battleEndSlot,
        ticketPrice: config.ticketPrice,
        prize1Percent: config.prize1Percent,
        prize2Percent: config.prize2Percent,
        prize3Percent: config.prize3Percent,
      })
    );
  }

  @method async finalizeTournament(
    tournamentId: Field,
    // Current tournament state
    currentTournament: TournamentLeaf,
    tournamentWitness: MerkleMapWitness,
    // Winners (up to 3)
    winner1: PublicKey,
    winner2: PublicKey,
    winner3: PublicKey,
    prize1: UInt64,
    prize2: UInt64,
    prize3: UInt64,
    // New winners root after inserting all winners
    newWinnersRoot: Field
  ) {
    this.assertAdmin();

    const currentSlot = this.getCurrentSlot();
    const currentRoot = this.tournamentsRoot.getAndRequireEquals();

    // Verify current tournament state
    const [rootBefore, key] = tournamentWitness.computeRootAndKey(
      currentTournament.hash()
    ) as [Field, Field];
    rootBefore.assertEquals(currentRoot, 'Invalid tournament state');
    key.assertEquals(
      TournamentManager.keyFor(tournamentId),
      'Invalid tournament ID'
    );

    // Must be in Battle or Claiming phase (battle ended)
    currentTournament.status.assertEquals(TournamentStatus.Battle);
    currentSlot.assertGreaterThanOrEqual(
      currentTournament.battleEndSlot,
      'Battle phase not ended yet'
    );

    // Verify prize amounts don't exceed pool
    const totalPrizes = prize1.add(prize2).add(prize3);
    totalPrizes.assertLessThanOrEqual(
      currentTournament.prizePool,
      'Prizes exceed pool'
    );

    // Update tournament to Claiming with winners
    const finalizedTournament = new TournamentLeaf({
      status: TournamentStatus.Claiming,
      registrationStartSlot: currentTournament.registrationStartSlot,
      battleStartSlot: currentTournament.battleStartSlot,
      battleEndSlot: currentTournament.battleEndSlot,
      ticketPrice: currentTournament.ticketPrice,
      prize1Percent: currentTournament.prize1Percent,
      prize2Percent: currentTournament.prize2Percent,
      prize3Percent: currentTournament.prize3Percent,
      participantsRoot: currentTournament.participantsRoot,
      winnersRoot: newWinnersRoot,
      prizePool: currentTournament.prizePool,
      participantCount: currentTournament.participantCount,
    });

    const [newRoot] = tournamentWitness.computeRootAndKey(
      finalizedTournament.hash()
    ) as [Field, Field];
    this.tournamentsRoot.set(newRoot);
    this.emitEvent(
      'TournamentFinalized',
      new TournamentFinalizedEvent({
        tournamentId,
        winner1,
        winner2,
        winner3,
        prize1,
        prize2,
        prize3,
        newWinnersRoot,
      })
    );
  }

  /* ------------------------------- Player Methods ------------------------------ */

  @method async buyTicket(
    tournamentId: Field,
    // Current tournament state
    currentTournament: TournamentLeaf,
    tournamentWitness: MerkleMapWitness,
    // Participant witness (to add player)
    participantWitness: MerkleMapWitness
  ) {
    const player = this.sender.getAndRequireSignature();
    const currentSlot = this.getCurrentSlot();
    const currentRoot = this.tournamentsRoot.getAndRequireEquals();

    // Verify current tournament state
    const [rootBefore, tKey] = tournamentWitness.computeRootAndKey(
      currentTournament.hash()
    ) as [Field, Field];
    rootBefore.assertEquals(currentRoot, 'Invalid tournament state');
    tKey.assertEquals(
      TournamentManager.keyFor(tournamentId),
      'Invalid tournament ID'
    );

    // Must be in Registration phase
    currentTournament.status.assertEquals(TournamentStatus.Registration);
    currentSlot.assertGreaterThanOrEqual(
      currentTournament.registrationStartSlot,
      'Registration not started'
    );
    currentSlot.assertLessThan(
      currentTournament.battleStartSlot,
      'Registration ended'
    );

    // Verify player not already registered (empty leaf)
    const playerKey = TournamentManager.keyForPublicKey(player);
    const [participantsRootBefore, pKey] = participantWitness.computeRootAndKey(
      Field(0)
    ) as [Field, Field];
    participantsRootBefore.assertEquals(
      currentTournament.participantsRoot,
      'Invalid participants state'
    );
    pKey.assertEquals(playerKey, 'Invalid participant witness');

    // Calculate fee and prize contribution
    const feePercent = this.platformFeePercent.getAndRequireEquals();
    const ticketPrice = currentTournament.ticketPrice;

    // fee = ticketPrice * feePercent / 10000
    const feeAmount = ticketPrice
      .mul(UInt64.from(feePercent))
      .div(UInt64.from(10000));
    const prizeContribution = ticketPrice.sub(feeAmount);

    // Take payment
    this.balance.addInPlace(ticketPrice);

    // Send fee to admin
    const adminAddress = this.admin.getAndRequireEquals();
    this.send({ to: adminAddress, amount: feeAmount });

    // Update participants root (mark player as registered with Field(1))
    const [newParticipantsRoot] = participantWitness.computeRootAndKey(
      Field(1)
    ) as [Field, Field];

    // Update tournament state
    const updatedTournament = new TournamentLeaf({
      status: currentTournament.status,
      registrationStartSlot: currentTournament.registrationStartSlot,
      battleStartSlot: currentTournament.battleStartSlot,
      battleEndSlot: currentTournament.battleEndSlot,
      ticketPrice: currentTournament.ticketPrice,
      prize1Percent: currentTournament.prize1Percent,
      prize2Percent: currentTournament.prize2Percent,
      prize3Percent: currentTournament.prize3Percent,
      participantsRoot: newParticipantsRoot,
      winnersRoot: currentTournament.winnersRoot,
      prizePool: currentTournament.prizePool.add(prizeContribution),
      participantCount: currentTournament.participantCount.add(1),
    });

    // Need to recompute tournament root with updated leaf
    // Note: We need the witness to be for the OLD tournament state
    const [newTournamentRoot] = tournamentWitness.computeRootAndKey(
      updatedTournament.hash()
    ) as [Field, Field];
    this.tournamentsRoot.set(newTournamentRoot);

    this.emitEvent(
      'TicketPurchased',
      new TicketPurchasedEvent({
        tournamentId,
        player,
        newParticipantsRoot,
        newPrizePool: updatedTournament.prizePool,
        newParticipantCount: updatedTournament.participantCount,
      })
    );
  }

  @method async advanceToBattle(
    tournamentId: Field,
    currentTournament: TournamentLeaf,
    tournamentWitness: MerkleMapWitness
  ) {
    // Anyone can call this to advance phase when time is right
    const currentSlot = this.getCurrentSlot();
    const currentRoot = this.tournamentsRoot.getAndRequireEquals();

    // Verify current tournament state
    const [rootBefore, key] = tournamentWitness.computeRootAndKey(
      currentTournament.hash()
    ) as [Field, Field];
    rootBefore.assertEquals(currentRoot, 'Invalid tournament state');
    key.assertEquals(
      TournamentManager.keyFor(tournamentId),
      'Invalid tournament ID'
    );

    // Must be in Registration phase and battle start slot reached
    currentTournament.status.assertEquals(TournamentStatus.Registration);
    currentSlot.assertGreaterThanOrEqual(
      currentTournament.battleStartSlot,
      'Battle phase not started yet'
    );

    // Update to Battle phase
    const updatedTournament = new TournamentLeaf({
      status: TournamentStatus.Battle,
      registrationStartSlot: currentTournament.registrationStartSlot,
      battleStartSlot: currentTournament.battleStartSlot,
      battleEndSlot: currentTournament.battleEndSlot,
      ticketPrice: currentTournament.ticketPrice,
      prize1Percent: currentTournament.prize1Percent,
      prize2Percent: currentTournament.prize2Percent,
      prize3Percent: currentTournament.prize3Percent,
      participantsRoot: currentTournament.participantsRoot,
      winnersRoot: currentTournament.winnersRoot,
      prizePool: currentTournament.prizePool,
      participantCount: currentTournament.participantCount,
    });

    const [newRoot] = tournamentWitness.computeRootAndKey(
      updatedTournament.hash()
    ) as [Field, Field];
    this.tournamentsRoot.set(newRoot);
  }

  @method async claimPrize(
    tournamentId: Field,
    // Current tournament state
    currentTournament: TournamentLeaf,
    tournamentWitness: MerkleMapWitness,
    // Winner proof
    currentWinnerLeaf: WinnerLeaf,
    winnerWitness: MerkleMapWitness
  ) {
    const player = this.sender.getAndRequireSignature();
    const currentRoot = this.tournamentsRoot.getAndRequireEquals();

    // Verify current tournament state
    const [rootBefore, tKey] = tournamentWitness.computeRootAndKey(
      currentTournament.hash()
    ) as [Field, Field];
    rootBefore.assertEquals(currentRoot, 'Invalid tournament state');
    tKey.assertEquals(
      TournamentManager.keyFor(tournamentId),
      'Invalid tournament ID'
    );

    // Must be in Claiming phase
    currentTournament.status.assertEquals(TournamentStatus.Claiming);

    // Verify player is a winner
    const playerKey = TournamentManager.keyForPublicKey(player);
    const [winnersRootBefore, wKey] = winnerWitness.computeRootAndKey(
      currentWinnerLeaf.hash()
    ) as [Field, Field];
    winnersRootBefore.assertEquals(
      currentTournament.winnersRoot,
      'Invalid winners state'
    );
    wKey.assertEquals(playerKey, 'Invalid winner witness');

    // Verify not already claimed
    currentWinnerLeaf.claimed.assertFalse('Prize already claimed');

    // Verify prize amount > 0
    currentWinnerLeaf.prizeAmount.assertGreaterThan(
      UInt64.from(0),
      'No prize to claim'
    );

    // Send prize
    this.send({ to: player, amount: currentWinnerLeaf.prizeAmount });

    // Update winner leaf to claimed
    const updatedWinnerLeaf = new WinnerLeaf({
      prizeAmount: currentWinnerLeaf.prizeAmount,
      claimed: Bool(true),
    });
    const [newWinnersRoot] = winnerWitness.computeRootAndKey(
      updatedWinnerLeaf.hash()
    ) as [Field, Field];

    // Update tournament with new winners root
    const updatedTournament = new TournamentLeaf({
      status: currentTournament.status,
      registrationStartSlot: currentTournament.registrationStartSlot,
      battleStartSlot: currentTournament.battleStartSlot,
      battleEndSlot: currentTournament.battleEndSlot,
      ticketPrice: currentTournament.ticketPrice,
      prize1Percent: currentTournament.prize1Percent,
      prize2Percent: currentTournament.prize2Percent,
      prize3Percent: currentTournament.prize3Percent,
      participantsRoot: currentTournament.participantsRoot,
      winnersRoot: newWinnersRoot,
      prizePool: currentTournament.prizePool,
      participantCount: currentTournament.participantCount,
    });

    const [newTournamentRoot] = tournamentWitness.computeRootAndKey(
      updatedTournament.hash()
    ) as [Field, Field];
    this.tournamentsRoot.set(newTournamentRoot);

    this.emitEvent(
      'PrizeClaimed',
      new PrizeClaimedEvent({
        tournamentId,
        player,
        prizeAmount: currentWinnerLeaf.prizeAmount,
        newWinnersRoot,
      })
    );
  }
}
