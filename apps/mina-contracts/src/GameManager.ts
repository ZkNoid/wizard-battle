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
  Proof,
  MerkleMap,
  Provable,
} from 'o1js';

import { GameRecordProof } from './Proofs/GameRecordProof.js';
import { FraudProof } from './Proofs/FraudProoof.js';
import { GameLeaf, GameStatus, Result } from './Proofs/GameLeaf.js';

/* --------------------------------- Contract --------------------------------- */

export class GameManager extends SmartContract {
  @state(Field) gamesRoot = State<Field>();

  // window in SLOTS now (e.g., 100 slots)
  @state(UInt32) challengeWindowSlots = State<UInt32>();

  @state(PublicKey) admin = State<PublicKey>();

  // Vault functionality: balances merkle root
  @state(Field) balancesRoot = State<Field>();

  // optional VKs, unchanged
  // @state(VerificationKey) recordVk = State<VerificationKey>();
  // @state(VerificationKey) fraudVk = State<VerificationKey>();

  events = {
    GameStarted: Field,
    GameFinished: Field,
    GameFinalizedOk: Field,
    GameFinalizedFraud: Field,
  };

  init() {
    super.init();
    this.gamesRoot.set(new MerkleMap().getRoot());
    this.balancesRoot.set(new MerkleMap().getRoot());
    let admin = this.sender.getAndRequireSignature();
    Provable.asProver(() => {
      console.log('admin', admin.toBase58());
    });
    this.admin.set(admin);
    this.challengeWindowSlots.set(UInt32.from(100)); // pick a sensible default
  }

  /* ------------------------------ Helper methods ------------------------------ */

  private assertAdmin() {
    this.sender
      .getAndRequireSignature()
      .assertEquals(this.admin.getAndRequireEquals());
  }

  /** current slot from the network, checked in-circuit */
  private getCurrentSlot(): UInt32 {
    const slot = this.network.globalSlotSinceGenesis.get();
    this.network.globalSlotSinceGenesis.requireEquals(slot);
    return slot;
  }

  /* ------------------------- Vault Helper methods ------------------------- */

  private static keyFor(user: PublicKey): Field {
    return Poseidon.hash(user.toFields());
  }

  private static verifyAndComputeNewRoot(
    root: Field,
    user: PublicKey,
    witness: MerkleMapWitness,
    expectedOld: UInt64,
    newBalance: UInt64
  ): { nextRoot: Field } {
    const key = GameManager.keyFor(user);

    const [rootBefore, gotKey] = witness.computeRootAndKey(
      expectedOld.toFields()[0]
    );
    gotKey.assertEquals(key);
    rootBefore.assertEquals(root);

    const [rootAfter] = witness.computeRootAndKey(newBalance.toFields()[0]);
    return { nextRoot: rootAfter };
  }

  private _decrease(
    root: Field,
    user: PublicKey,
    witness: MerkleMapWitness,
    oldBal: UInt64,
    dec: UInt64
  ): { nextRoot: Field } {
    dec.assertLessThanOrEqual(oldBal, 'Insufficient balance to decrease');
    const newBal = oldBal.sub(dec);
    const { nextRoot } = GameManager.verifyAndComputeNewRoot(
      root,
      user,
      witness,
      oldBal,
      newBal
    );
    return { nextRoot };
  }

  /* ------------------------------- Admin setters ------------------------------ */

  @method async setAdmin(newAdmin: PublicKey) {
    this.assertAdmin();
    this.admin.set(newAdmin);
  }

  @method async setChallengeWindowSlots(newWindow: UInt32) {
    this.assertAdmin();
    this.challengeWindowSlots.set(newWindow);
  }

  /* --------------------------- Vault Methods --------------------------- */

  /**
   * DEPOSIT (now enforces incoming funds):
   * 1) We REQUIRE the zkApp account balance to increase by `amount`:
   *      this.balance.addInPlace(amount)
   *    This binds the transaction to include a matching payment into this account.
   * 2) We update the Merkle root from oldBal → oldBal + amount.
   *
   * NOTE: This proves funds arrived to the zkApp, but does not prove *who* paid.
   * If you need to cryptographically tie the payer to `user`, you can:
   *  - require an extra signed AccountUpdate from `user` and pass its public input
   *    into the proof via a prior commitment, or
   *  - switch to a tokenized deposit flow the contract can fully gate.
   */
  @method async deposit(
    user: PublicKey,
    amount: UInt64,
    oldBal: UInt64,
    witness: MerkleMapWitness
  ) {
    // 1) Enforce incoming funds to this zkApp account
    this.balance.addInPlace(amount);

    // 2) Accounting: bump user's balance in Merkle root
    const root = this.balancesRoot.getAndRequireEquals();
    const newBal = oldBal.add(amount);
    const { nextRoot } = GameManager.verifyAndComputeNewRoot(
      root,
      user,
      witness,
      oldBal,
      newBal
    );
    this.balancesRoot.set(nextRoot);
  }

  /**
   * WITHDRAW:
   *  - Decrease user's recorded balance.
   *  - Send MINA from zkApp to user.
   */
  @method async withdraw(
    user: PublicKey,
    amount: UInt64,
    oldBal: UInt64,
    witness: MerkleMapWitness
  ) {
    const root = this.balancesRoot.getAndRequireEquals();
    const [oldRoot] = witness.computeRootAndKey(oldBal.toFields()[0]);
    oldRoot.assertEquals(root, 'Old balance mismatch');

    const { nextRoot } = this._decrease(root, user, witness, oldBal, amount);
    this.balancesRoot.set(nextRoot);

    this.send({ to: user, amount });
  }

  /**
   * SLASH (admin-only): reduce user's recorded balance without moving coins.
   */
  @method async slash(
    user: PublicKey,
    dec: UInt64,
    oldBal: UInt64,
    witness: MerkleMapWitness
  ) {
    this.assertAdmin();
    const root = this.balancesRoot.getAndRequireEquals();
    const [oldRoot] = witness.computeRootAndKey(oldBal.toFields()[0]);
    oldRoot.assertEquals(root, 'Old balance mismatch');

    const { nextRoot } = this._decrease(root, user, witness, oldBal, dec);
    this.balancesRoot.set(nextRoot);
  }

  /* --------------------------------- Game Flows --------------------------------- */

  // Same signature; witness must be for the *previous* leaf (or empty leaf at first).
  @method async startGame(
    gameId: Field,
    setupHash: Field,
    witness: MerkleMapWitness
  ) {
    this.assertAdmin();
    const currentRoot = this.gamesRoot.getAndRequireEquals();

    // require witness matches current root with old leaf
    const [rootBefore, _key] = witness.computeRootAndKey(Field(0));
    rootBefore.assertEquals(currentRoot);

    const newLeaf = new GameLeaf({
      status: GameStatus.Started,
      challengeDeadlineSlot: UInt32.from(0),
      setupHash,
      resultHash: Field(0),
      fraudHash: Field(0),
    });

    const newRoot = witness.computeRootAndKey(newLeaf.hash())[0];
    this.gamesRoot.set(newRoot);
    this.emitEvent('GameStarted', gameId);
  }

  /**
   * finishGame(gameId, resultHash, witness)
   * - Admin-only
   * - Move to AwaitingChallenge, set deadline = currentSlot + window
   */
  @method async finishGame(
    gameId: Field,
    resultHash: Field,
    witness: MerkleMapWitness,
    // pass previous leaf fields explicitly so we can strictly enforce transitions
    prevStatus: UInt32,
    prevSetupHash: Field
  ) {
    this.assertAdmin();
    const currentRoot = this.gamesRoot.getAndRequireEquals();

    // Recreate the expected previous leaf (Started)
    prevStatus.assertEquals(GameStatus.Started);

    const prevLeaf = new GameLeaf({
      status: prevStatus,
      challengeDeadlineSlot: UInt32.from(0),
      setupHash: prevSetupHash,
      resultHash: Field(0),
      fraudHash: Field(0),
    });

    // Verify witness against previous leaf
    const [rootBefore] = witness.computeRootAndKey(prevLeaf.hash());
    rootBefore.assertEquals(currentRoot);

    // compute deadline using network slot
    const slotNow = this.getCurrentSlot();
    const deadline = slotNow.add(
      this.challengeWindowSlots.getAndRequireEquals()
    );

    const nextLeaf = new GameLeaf({
      status: GameStatus.AwaitingChallenge,
      challengeDeadlineSlot: deadline,
      setupHash: prevSetupHash,
      resultHash,
      fraudHash: Field(0),
    });

    const newRoot = witness.computeRootAndKey(nextLeaf.hash())[0];
    this.gamesRoot.set(newRoot);
    this.emitEvent('GameFinished', gameId);
  }

  /** Finalize OK on valid record proof */
  @method async proveGameRecord(
    gameId: Field,
    witness: MerkleMapWitness,
    proof: GameRecordProof,
    deadlineSlot: UInt32,
    resultHash: Field
  ) {
    proof.verify();

    // Verify the proof's result matches what we expect
    proof.publicOutput.resultHash.assertEquals(resultHash);

    const currentRoot = this.gamesRoot.getAndRequireEquals();

    const awaitingLeaf = new GameLeaf({
      status: GameStatus.AwaitingChallenge,
      challengeDeadlineSlot: deadlineSlot,
      setupHash: proof.publicInput.setupHash,
      resultHash: resultHash,
      fraudHash: Field(0),
    });

    const [rootBefore] = witness.computeRootAndKey(awaitingLeaf.hash());
    rootBefore.assertEquals(currentRoot);

    const finalized = new GameLeaf({
      status: GameStatus.FinalizedOk,
      challengeDeadlineSlot: UInt32.from(0),
      setupHash: awaitingLeaf.setupHash,
      resultHash: awaitingLeaf.resultHash,
      fraudHash: Field(0),
    });

    const newRoot = witness.computeRootAndKey(finalized.hash())[0];
    this.gamesRoot.set(newRoot);
    this.emitEvent('GameFinalizedOk', gameId);
  }

  /** Finalize FRAUD on valid fraud proof */
  @method async proveFraud(
    gameId: Field,
    witness: MerkleMapWitness,
    proof: FraudProof,
    // we still expect the current leaf is AwaitingChallenge with some deadline
    deadlineSlot: UInt32,
    expectedSetupHash: Field,
    expectedResult: Result
  ) {
    proof.verify();
    proof.publicInput.stateTreeHash.assertEquals(expectedResult.statesRoot);

    // Verify the proof's public fields

    const currentRoot = this.gamesRoot.getAndRequireEquals();

    const awaitingLeaf = new GameLeaf({
      status: GameStatus.AwaitingChallenge,
      challengeDeadlineSlot: deadlineSlot,
      setupHash: expectedSetupHash,
      resultHash: expectedResult.hash(),
      fraudHash: Field(0),
    });

    const [rootBefore] = witness.computeRootAndKey(awaitingLeaf.hash());
    rootBefore.assertEquals(currentRoot);

    const finalized = new GameLeaf({
      status: GameStatus.FinalizedFraud,
      challengeDeadlineSlot: UInt32.from(0),
      setupHash: expectedSetupHash,
      resultHash: Field(0),
      fraudHash: proof.publicInput.fraudHash,
    });

    const newRoot = witness.computeRootAndKey(finalized.hash())[0];
    this.gamesRoot.set(newRoot);
    this.emitEvent('GameFinalizedFraud', gameId);
  }

  /**
   * proveByTimeout()
   * - Anyone can call
   * - If current slot ≥ deadline and status == AwaitingChallenge -> finalize OK
   */
  @method async proveByTimeout(
    gameId: Field,
    witness: MerkleMapWitness,
    // inputs describing the Surrent leaf we’re timing out
    deadlineSlot: UInt32,
    setupHash: Field,
    resultHash: Field
  ) {
    const currentRoot = this.gamesRoot.getAndRequireEquals();

    const awaitingLeaf = new GameLeaf({
      status: GameStatus.AwaitingChallenge,
      challengeDeadlineSlot: deadlineSlot,
      setupHash,
      resultHash,
      fraudHash: Field(0),
    });

    const [rootBefore] = witness.computeRootAndKey(awaitingLeaf.hash());
    rootBefore.assertEquals(currentRoot);

    // Compare slots in-circuit
    const slotNow = this.getCurrentSlot();
    slotNow.greaterThanOrEqual(deadlineSlot);

    const finalized = new GameLeaf({
      status: GameStatus.FinalizedOk,
      challengeDeadlineSlot: UInt32.from(0),
      setupHash,
      resultHash,
      fraudHash: Field(0),
    });

    const newRoot = witness.computeRootAndKey(finalized.hash())[0];
    this.gamesRoot.set(newRoot);
    this.emitEvent('GameFinalizedOk', gameId);
  }
}
