import {
  AccountUpdate,
  Bool,
  fetchAccount,
  Field,
  MerkleMap,
  MerkleMapWitness,
  Mina,
  PrivateKey,
  PublicKey,
  UInt32,
  UInt64,
  Poseidon,
  VerificationKey,
} from 'o1js';

import { GameManager } from './GameManager';
import { GameStatus, GameLeaf, Result } from './Proofs/GameLeaf';
import {
  GameRecordProgram,
  GameRecordProof,
  GameRecordProofPublicInput,
} from './Proofs/GameRecordProof';
import {
  FraudProgram,
  FraudProofPublicInput,
  FraudProof,
} from './Proofs/FraudProoof';
import {
  SpellsDynamicProof,
  SpellsPublicInput,
  SpellsPublicOutput,
} from './Proofs/DynamicProof';

/* --------------------------------- Test helpers --------------------------------- */
const gameId = Field(1);
const key = gameId;
const setupHash = Field(111);
const fraudHash = Field(333);

// Create a Result with statesRoot for new fraud proof system
const statesRoot = Field(444);
const expectedResult = new Result({ statesRoot });
const resultHash = expectedResult.hash();

// Helper to create fraud proof inputs
function createFraudProofInputs() {
  // Create state tree with two sequential states
  const stateTree = new MerkleMap();
  const state1Hash = Field(1001);
  const state2Hash = Field(1002); // The "recorded" state
  const fraudulentFinalState = Field(1003); // What the proof actually produces (different from state2)

  // Set states at sequential keys (0 and 1)
  stateTree.set(Field(0), state1Hash);
  stateTree.set(Field(1), state2Hash);

  const state1Witness = stateTree.getWitness(Field(0));
  const state2Witness = stateTree.getWitness(Field(1));
  const stateTreeHash = stateTree.getRoot();

  // Create VK tree
  const vkTree = new MerkleMap();
  // We'll use a dummy VK for testing (will be set during test setup)
  const dummyVkHash = Field(0);
  vkTree.set(Field(0), dummyVkHash);
  const vkWitness = vkTree.getWitness(Field(0));
  const vkRoot = vkTree.getRoot();

  return {
    stateTree,
    stateTreeHash,
    state1Hash,
    state1Witness,
    state2Hash,
    state2Witness,
    fraudulentFinalState,
    vkTree,
    vkRoot,
    vkWitness,
  };
}

function leaf(
  status: UInt32,
  deadlineSlot: UInt32,
  setup: Field,
  result: Field,
  fraud: Field
) {
  return new GameLeaf({
    status,
    challengeDeadlineSlot: deadlineSlot,
    setupHash: setup,
    resultHash: result,
    fraudHash: fraud,
  });
}

// keep tests explicit about local “virtual” map → recompute expected root via witness
function wit(mm: MerkleMap) {
  return mm.getWitness(key);
}

describe('GameManagerV2 (slot-based deadlines)', () => {
  let Local: any;
  let deployerKey: PrivateKey, adminKey: PrivateKey, userKey: PrivateKey;
  let deployer: PublicKey, admin: PublicKey, user: PublicKey;

  let appKey: PrivateKey;
  let appAddr: PublicKey;
  let app: GameManager;

  // convenience to set network slot on local chain
  const setSlot = (n: number | bigint) => {
    // o1js LocalBlockchain exposes setGlobalSlot(bigint)
    (Local as any).setGlobalSlot?.(BigInt(n));
  };

  // Helper function to deploy and initialize a fresh contract
  const deployFreshContract = async () => {
    appKey = PrivateKey.random();
    appAddr = appKey.toPublicKey();
    app = new GameManager(appAddr);

    // deploy
    let tx1 = await Mina.transaction(deployer, async () => {
      AccountUpdate.fundNewAccount(deployer);
      await app.deploy();
    });
    await tx1.prove();
    await tx1.sign([deployerKey, appKey]).send();

    expect(app.admin.get()).toEqual(deployer);
    expect(app.challengeWindowSlots.get()).toEqual(UInt32.from(100));

    // Set admin
    let tx2 = await Mina.transaction(deployer, async () => {
      await app.setAdmin(admin);
    });
    await tx2.prove();
    await tx2.sign([deployerKey]).send();

    expect(app.admin.get()).toEqual(admin);
  };

  beforeAll(async () => {
    Local = await Mina.LocalBlockchain({ proofsEnabled: false });
    Mina.setActiveInstance(Local);

    deployerKey = Local.testAccounts[0].key;
    adminKey = Local.testAccounts[1].key;
    userKey = Local.testAccounts[2].key;

    deployer = deployerKey.toPublicKey();
    admin = adminKey.toPublicKey();
    user = userKey.toPublicKey();

    await GameRecordProgram.compile();
    await FraudProgram.compile();
    await GameManager.compile();
  });

  beforeEach(async () => {
    // Start each test at a deterministic slot
    setSlot(10_000n);

    // Deploy a fresh contract for each test
    await deployFreshContract();
  });

  test('startGame writes Started leaf', async () => {
    const mm = new MerkleMap();
    const beforeRoot = mm.getRoot();
    expect(app.gamesRoot.get()).toEqual(beforeRoot);

    const witness: MerkleMapWitness = wit(mm);

    let tx3 = await Mina.transaction(admin, async () => {
      await app.startGame(gameId, setupHash, witness);
    });
    await tx3.prove();
    await tx3.sign([adminKey]).send();

    const started = leaf(
      GameStatus.Started,
      UInt32.from(0),
      setupHash,
      Field(0),
      Field(0)
    );
    const expectedRoot = witness.computeRootAndKey(started.hash())[0];
    expect(app.gamesRoot.get()).toEqual(expectedRoot);
  });

  test('finishGame moves to AwaitingChallenge with deadline = currentSlot + window', async () => {
    // Set up: start a game first
    const mm = new MerkleMap();
    const witness = wit(mm);

    const beforeRoot = mm.getRoot();
    expect(app.gamesRoot.get()).toEqual(beforeRoot);

    // Start the game
    let txStart = await Mina.transaction(admin, async () => {
      await app.startGame(gameId, setupHash, witness);
    });
    await txStart.prove();
    await txStart.sign([adminKey]).send();

    const started = leaf(
      GameStatus.Started,
      UInt32.from(0),
      setupHash,
      Field(0),
      Field(0)
    );
    const startedRoot = witness.computeRootAndKey(started.hash())[0];
    expect(app.gamesRoot.get()).toEqual(startedRoot);

    // Set a known slot before finishing
    setSlot(20_000n);

    // finishGame requires prevStatus + prevSetupHash so it can enforce transition strictly
    let tx4 = await Mina.transaction(admin, async () => {
      await app.finishGame(
        gameId,
        resultHash,
        witness,
        GameStatus.Started,
        setupHash
      );
    });
    await tx4.prove();
    await tx4.sign([adminKey]).send();

    // deadline = slotNow (20_000) + window (100) = 20_100
    const deadlineSlot = UInt32.from(20_100);
    const awaiting = leaf(
      GameStatus.AwaitingChallenge,
      deadlineSlot,
      setupHash,
      resultHash,
      Field(0)
    );
    const awaitingRoot = witness.computeRootAndKey(awaiting.hash())[0];
    expect(app.gamesRoot.get()).toEqual(awaitingRoot);
  });

  test('proveGameRecord finalizes OK from AwaitingChallenge', async () => {
    // Set up: start a game and finish it to reach AwaitingChallenge state
    const mm = new MerkleMap();
    const witness = wit(mm);

    // Start the game
    let txStart = await Mina.transaction(admin, async () => {
      await app.startGame(gameId, setupHash, witness);
    });
    await txStart.prove();
    await txStart.sign([adminKey]).send();

    const started = leaf(
      GameStatus.Started,
      UInt32.from(0),
      setupHash,
      Field(0),
      Field(0)
    );
    const startedRoot = witness.computeRootAndKey(started.hash())[0];
    expect(app.gamesRoot.get()).toEqual(startedRoot);

    // Set a known slot before finishing
    setSlot(20_000n);

    // Finish the game to move to AwaitingChallenge
    let txFinish = await Mina.transaction(admin, async () => {
      await app.finishGame(
        gameId,
        resultHash,
        witness,
        GameStatus.Started,
        setupHash
      );
    });
    await txFinish.prove();
    await txFinish.sign([adminKey]).send();

    // deadline = slotNow (20_000) + window (100) = 20_100
    const deadlineSlot = UInt32.from(20_100);
    const awaiting = leaf(
      GameStatus.AwaitingChallenge,
      deadlineSlot,
      setupHash,
      resultHash,
      Field(0)
    );
    const awaitingRoot = witness.computeRootAndKey(awaiting.hash())[0];
    expect(app.gamesRoot.get()).toEqual(awaitingRoot);

    // Now prove the game record

    console.log('Before GameRecordProgram.prove');
    const proof = await GameRecordProgram.prove(
      new GameRecordProofPublicInput({
        gameId,
        setupHash,
      }),
      resultHash
    );
    console.log('Before proveGameRecord');

    let tx = await Mina.transaction(user, async () => {
      app.proveGameRecord(
        gameId,
        witness,
        proof.proof,
        deadlineSlot,
        resultHash
      );
    });
    await tx.prove();
    await tx.sign([userKey]).send();

    const finalizedOk = leaf(
      GameStatus.FinalizedOk,
      UInt32.from(0),
      setupHash,
      resultHash,
      Field(0)
    );
    const finalRoot = witness.computeRootAndKey(finalizedOk.hash())[0];
    expect(app.gamesRoot.get()).toEqual(finalRoot);
  });

  // NOTE: This test requires a real SpellsDynamicProof with a valid VK to pass.
  // The dummy proof approach doesn't work because DynamicProof.verify() checks
  // proof validity even with proofsEnabled: false.
  // To properly test fraud proofs, we need to:
  // 1. Compile a real spell proof program
  // 2. Generate a valid proof with that program
  // 3. Use the real VK from that program
  test.skip('proveFraud finalizes FRAUD from AwaitingChallenge', async () => {
    // Reset to Started → Awaiting again to test fraud flow
    const mm = new MerkleMap();
    const witness = wit(mm);

    // Create fraud proof inputs first to get consistent data
    const fraudInputs = createFraudProofInputs();

    // Create Result with statesRoot matching the fraud proof's stateTreeHash
    // This ensures proveFraud will find the correct leaf
    const fraudResult = new Result({ statesRoot: fraudInputs.stateTreeHash });
    const fraudResultHash = fraudResult.hash();

    // start
    let txStart = await Mina.transaction(admin, async () => {
      await app.startGame(gameId, setupHash, witness);
    });
    await txStart.prove();
    await txStart.sign([adminKey]).send();

    const started = leaf(
      GameStatus.Started,
      UInt32.from(0),
      setupHash,
      Field(0),
      Field(0)
    );
    const startedRoot = witness.computeRootAndKey(started.hash())[0];
    expect(app.gamesRoot.get()).toEqual(startedRoot);

    // set new slot baseline
    setSlot(30_000n);

    let txFinish = await Mina.transaction(admin, async () => {
      await app.finishGame(
        gameId,
        fraudResultHash, // Use the hash that matches our fraudResult
        witness,
        GameStatus.Started,
        setupHash
      );
    });
    await txFinish.prove();
    await txFinish.sign([adminKey]).send();

    const deadlineSlot = UInt32.from(30_000 + 100); // 30_100
    const awaiting = leaf(
      GameStatus.AwaitingChallenge,
      deadlineSlot,
      setupHash,
      fraudResultHash,
      Field(0)
    );
    const awaitingRoot = witness.computeRootAndKey(awaiting.hash())[0];
    expect(app.gamesRoot.get()).toEqual(awaitingRoot);

    // Create dummy dynamic proof for testing
    const dummyDynamicProof = await SpellsDynamicProof.dummy(
      new SpellsPublicInput({
        initialStateHash: fraudInputs.state1Hash,
        spellCastHash: Field(0),
      }),
      new SpellsPublicOutput({
        finalStateHash: fraudInputs.fraudulentFinalState, // Different from state2Hash = fraud
      }),
      0
    );

    // Get a dummy VK for testing
    const dummyVk = await VerificationKey.dummy();

    // Update VK tree with actual VK hash
    fraudInputs.vkTree.set(Field(0), dummyVk.hash);
    const vkWitness = fraudInputs.vkTree.getWitness(Field(0));
    const vkRoot = fraudInputs.vkTree.getRoot();

    console.log('Before FraudProgram.prove');
    const fraudProofResult = await FraudProgram.prove(
      new FraudProofPublicInput({
        fraudHash,
        stateTreeHash: fraudInputs.stateTreeHash,
        state1Hash: fraudInputs.state1Hash,
        state2Hash: fraudInputs.state2Hash,
        vkRoot,
      }),
      fraudInputs.state1Witness,
      fraudInputs.state2Witness,
      dummyVk,
      vkWitness,
      dummyDynamicProof
    );
    console.log('After FraudProgram.prove');

    let txFraud = await Mina.transaction(user, async () => {
      await app.proveFraud(
        gameId,
        witness,
        fraudProofResult.proof,
        deadlineSlot,
        setupHash,
        fraudResult
      );
    });
    await txFraud.prove();
    await txFraud.sign([userKey]).send();

    const finalizedFraud = leaf(
      GameStatus.FinalizedFraud,
      UInt32.from(0),
      setupHash,
      Field(0),
      fraudHash
    );
    const finalRoot = witness.computeRootAndKey(finalizedFraud.hash())[0];
    expect(app.gamesRoot.get()).toEqual(finalRoot);
  });

  // See note above about fraud proof testing requirements
  test.skip('proveFraud works even close to deadline', async () => {
    // Test that fraud proof can be submitted right before the deadline
    const mm = new MerkleMap();
    const witness = wit(mm);

    // Create fraud proof inputs first to get consistent data
    const fraudInputs = createFraudProofInputs();
    const fraudResult = new Result({ statesRoot: fraudInputs.stateTreeHash });
    const fraudResultHash = fraudResult.hash();

    // Start game
    let txStart = await Mina.transaction(admin, async () => {
      await app.startGame(gameId, setupHash, witness);
    });
    await txStart.prove();
    await txStart.sign([adminKey]).send();

    // Finish game at slot 50_000
    setSlot(50_000n);
    let txFinish = await Mina.transaction(admin, async () => {
      await app.finishGame(
        gameId,
        fraudResultHash,
        witness,
        GameStatus.Started,
        setupHash
      );
    });
    await txFinish.prove();
    await txFinish.sign([adminKey]).send();

    const deadlineSlot = UInt32.from(50_000 + 100); // 50_100

    // Advance time to just before deadline (50_099)
    setSlot(50_099n);

    // Create dummy dynamic proof for testing
    const dummyDynamicProof = await SpellsDynamicProof.dummy(
      new SpellsPublicInput({
        initialStateHash: fraudInputs.state1Hash,
        spellCastHash: Field(0),
      }),
      new SpellsPublicOutput({
        finalStateHash: fraudInputs.fraudulentFinalState,
      }),
      0
    );

    const dummyVk = await VerificationKey.dummy();
    fraudInputs.vkTree.set(Field(0), dummyVk.hash);
    const vkWitness = fraudInputs.vkTree.getWitness(Field(0));
    const vkRoot = fraudInputs.vkTree.getRoot();

    const fraudProofResult = await FraudProgram.prove(
      new FraudProofPublicInput({
        fraudHash,
        stateTreeHash: fraudInputs.stateTreeHash,
        state1Hash: fraudInputs.state1Hash,
        state2Hash: fraudInputs.state2Hash,
        vkRoot,
      }),
      fraudInputs.state1Witness,
      fraudInputs.state2Witness,
      dummyVk,
      vkWitness,
      dummyDynamicProof
    );

    let txFraud = await Mina.transaction(user, async () => {
      await app.proveFraud(
        gameId,
        witness,
        fraudProofResult.proof,
        deadlineSlot,
        setupHash,
        fraudResult
      );
    });
    await txFraud.prove();
    await txFraud.sign([userKey]).send();

    const finalizedFraud = leaf(
      GameStatus.FinalizedFraud,
      UInt32.from(0),
      setupHash,
      Field(0),
      fraudHash
    );
    const finalRoot = witness.computeRootAndKey(finalizedFraud.hash())[0];
    expect(app.gamesRoot.get()).toEqual(finalRoot);
  });

  // See note above about fraud proof testing requirements
  test.skip('proveFraud cannot finalize already finalized game', async () => {
    // Test that fraud proof cannot be submitted after game is already finalized OK
    const mm = new MerkleMap();
    const witness = wit(mm);

    // Create fraud proof inputs first to get consistent data
    const fraudInputs = createFraudProofInputs();
    const fraudResult = new Result({ statesRoot: fraudInputs.stateTreeHash });
    const fraudResultHash = fraudResult.hash();

    // Start and finish game
    let txStart = await Mina.transaction(admin, async () => {
      await app.startGame(gameId, setupHash, witness);
    });
    await txStart.prove();
    await txStart.sign([adminKey]).send();

    setSlot(60_000n);
    let txFinish = await Mina.transaction(admin, async () => {
      await app.finishGame(
        gameId,
        fraudResultHash,
        witness,
        GameStatus.Started,
        setupHash
      );
    });
    await txFinish.prove();
    await txFinish.sign([adminKey]).send();

    const deadlineSlot = UInt32.from(60_000 + 100); // 60_100

    // Prove game record to finalize OK
    const proof = await GameRecordProgram.prove(
      new GameRecordProofPublicInput({
        gameId,
        setupHash,
      }),
      fraudResultHash
    );

    let txProve = await Mina.transaction(user, async () => {
      app.proveGameRecord(
        gameId,
        witness,
        proof.proof,
        deadlineSlot,
        fraudResultHash
      );
    });
    await txProve.prove();
    await txProve.sign([userKey]).send();

    // Create dummy dynamic proof for testing
    const dummyDynamicProof = await SpellsDynamicProof.dummy(
      new SpellsPublicInput({
        initialStateHash: fraudInputs.state1Hash,
        spellCastHash: Field(0),
      }),
      new SpellsPublicOutput({
        finalStateHash: fraudInputs.fraudulentFinalState,
      }),
      0
    );

    const dummyVk = await VerificationKey.dummy();
    fraudInputs.vkTree.set(Field(0), dummyVk.hash);
    const vkWitness = fraudInputs.vkTree.getWitness(Field(0));
    const vkRoot = fraudInputs.vkTree.getRoot();

    const fraudProofResult = await FraudProgram.prove(
      new FraudProofPublicInput({
        fraudHash,
        stateTreeHash: fraudInputs.stateTreeHash,
        state1Hash: fraudInputs.state1Hash,
        state2Hash: fraudInputs.state2Hash,
        vkRoot,
      }),
      fraudInputs.state1Witness,
      fraudInputs.state2Witness,
      dummyVk,
      vkWitness,
      dummyDynamicProof
    );

    // Now try to submit fraud proof - should fail because game is already finalized
    await expect(async () => {
      let txFraud = await Mina.transaction(user, async () => {
        await app.proveFraud(
          gameId,
          witness,
          fraudProofResult.proof,
          deadlineSlot,
          setupHash,
          fraudResult
        );
      });
      await txFraud.prove();
      await txFraud.sign([userKey]).send();
    }).rejects.toThrow();
  });

  test('proveByTimeout finalizes OK when current slot >= deadlineSlot', async () => {
    // Reset to Started → Awaiting
    const mm = new MerkleMap();
    const witness = wit(mm);

    let tx7 = await Mina.transaction(admin, async () => {
      await app.startGame(gameId, setupHash, witness);
    });
    await tx7.prove();
    await tx7.sign([adminKey]).send();

    const s = leaf(
      GameStatus.Started,
      UInt32.from(0),
      setupHash,
      Field(0),
      Field(0)
    );
    const sRoot = witness.computeRootAndKey(s.hash())[0];
    expect(app.gamesRoot.get()).toEqual(sRoot);

    // set current slot, finish, then advance *past* deadline
    setSlot(40_000n);
    let tx8 = await Mina.transaction(admin, async () => {
      await app.finishGame(
        gameId,
        resultHash,
        witness,
        GameStatus.Started,
        setupHash
      );
    });
    await tx8.prove();
    await tx8.sign([adminKey]).send();

    const deadline = UInt32.from(40_000 + 100); // 40_100
    const awaiting = leaf(
      GameStatus.AwaitingChallenge,
      deadline,
      setupHash,
      resultHash,
      Field(0)
    );
    const awaitingRoot = witness.computeRootAndKey(awaiting.hash())[0];
    expect(app.gamesRoot.get()).toEqual(awaitingRoot);

    // jump to just past the deadline
    setSlot(40_101n);

    let tx9 = await Mina.transaction(user, async () => {
      await app.proveByTimeout(
        gameId,
        witness,
        deadline,
        setupHash,
        resultHash
      );
    });
    await tx9.prove();
    await tx9.sign([userKey]).send();

    const finalizedOk = leaf(
      GameStatus.FinalizedOk,
      UInt32.from(0),
      setupHash,
      resultHash,
      Field(0)
    );
    const finalRoot = witness.computeRootAndKey(finalizedOk.hash())[0];
    expect(app.gamesRoot.get()).toEqual(finalRoot);
  });

  /* --------------------------------- Vault Tests --------------------------------- */

  describe('Vault functionality', () => {
    let balancesMap: MerkleMap;

    function getUserKey(user: PublicKey): Field {
      return Poseidon.hash(user.toFields());
    }

    function getBalance(user: PublicKey): UInt64 {
      const key = getUserKey(user);
      const value = balancesMap.get(key);
      return UInt64.from(value.toString());
    }

    function setBalance(user: PublicKey, amount: UInt64) {
      const key = getUserKey(user);
      balancesMap.set(key, amount.toFields()[0]);
    }

    beforeEach(() => {
      balancesMap = new MerkleMap();
    });

    test('initializes with correct balances root', async () => {
      const root = app.balancesRoot.get();
      expect(root).toEqual(balancesMap.getRoot());
    });

    test('correctly handles deposit into the vault', async () => {
      const depositAmount = UInt64.from(1_000_000_000); // 1 MINA
      const oldBal = UInt64.from(0);
      const witness = balancesMap.getWitness(getUserKey(user));

      // Get initial zkApp balance
      const initialZkAppBalance = Mina.getBalance(appAddr);

      // Deposit transaction
      const txn = await Mina.transaction(user, async () => {
        const pay = AccountUpdate.createSigned(user);
        pay.balance.subInPlace(depositAmount);
        await app.deposit(user, depositAmount, oldBal, witness);
      });
      await txn.prove();
      await txn.sign([userKey]).send();

      // Update our local map
      setBalance(user, depositAmount);

      // Verify state
      const updatedRoot = app.balancesRoot.get();
      expect(updatedRoot).toEqual(balancesMap.getRoot());

      // Verify zkApp received the funds
      const finalZkAppBalance = Mina.getBalance(appAddr);
      expect(finalZkAppBalance).toEqual(initialZkAppBalance.add(depositAmount));
    });

    test('correctly handles withdrawal from the vault', async () => {
      const depositAmount = UInt64.from(2_000_000_000); // 2 MINA
      const withdrawAmount = UInt64.from(500_000_000); // 0.5 MINA

      // First deposit
      let witness = balancesMap.getWitness(getUserKey(user));
      const depositTxn = await Mina.transaction(user, async () => {
        const pay = AccountUpdate.createSigned(user);
        pay.balance.subInPlace(depositAmount);
        await app.deposit(user, depositAmount, UInt64.from(0), witness);
      });
      await depositTxn.prove();
      await depositTxn.sign([userKey]).send();
      setBalance(user, depositAmount);

      // Get user's balance before withdrawal
      const userBalanceBefore = Mina.getBalance(user);

      // Then withdraw
      witness = balancesMap.getWitness(getUserKey(user));
      const withdrawTxn = await Mina.transaction(user, async () => {
        await app.withdraw(user, withdrawAmount, depositAmount, witness);
      });
      await withdrawTxn.prove();
      await withdrawTxn.sign([userKey]).send();
      setBalance(user, depositAmount.sub(withdrawAmount));

      // Verify state
      const finalRoot = app.balancesRoot.get();
      expect(finalRoot).toEqual(balancesMap.getRoot());

      // Verify user received the funds (accounting for transaction fee)
      const userBalanceAfter = Mina.getBalance(user);
      expect(userBalanceAfter.toBigInt()).toBeGreaterThan(
        userBalanceBefore.toBigInt()
      );
    });

    test('correctly handles multiple deposits from different accounts', async () => {
      const deposit1 = UInt64.from(1_000_000_000); // 1 MINA
      const deposit2 = UInt64.from(500_000_000); // 0.5 MINA

      const secondUser = Local.testAccounts[3];
      const secondUserKey = secondUser.key;

      // First user deposits
      let witness1 = balancesMap.getWitness(getUserKey(user));
      const txn1 = await Mina.transaction(user, async () => {
        const pay = AccountUpdate.createSigned(user);
        pay.balance.subInPlace(deposit1);
        await app.deposit(user, deposit1, UInt64.from(0), witness1);
      });
      await txn1.prove();
      await txn1.sign([userKey]).send();
      setBalance(user, deposit1);

      // Second user deposits
      let witness2 = balancesMap.getWitness(getUserKey(secondUser));
      const txn2 = await Mina.transaction(secondUser, async () => {
        const pay = AccountUpdate.createSigned(secondUser);
        pay.balance.subInPlace(deposit2);
        await app.deposit(secondUser, deposit2, UInt64.from(0), witness2);
      });
      await txn2.prove();
      await txn2.sign([secondUserKey]).send();
      setBalance(secondUser, deposit2);

      // Verify state
      const finalRoot = app.balancesRoot.get();
      expect(finalRoot).toEqual(balancesMap.getRoot());

      // Verify total balance
      const totalBalance = Mina.getBalance(appAddr);
      expect(totalBalance).toEqual(deposit1.add(deposit2));
    });

    test('prevents withdrawal of more than deposited', async () => {
      const depositAmount = UInt64.from(1_000_000_000); // 1 MINA
      const withdrawAmount = UInt64.from(2_000_000_000); // 2 MINA (more than deposited)

      // First deposit
      let witness = balancesMap.getWitness(getUserKey(user));
      const depositTxn = await Mina.transaction(user, async () => {
        const pay = AccountUpdate.createSigned(user);
        pay.balance.subInPlace(depositAmount);
        await app.deposit(user, depositAmount, UInt64.from(0), witness);
      });
      await depositTxn.prove();
      await depositTxn.sign([userKey]).send();
      setBalance(user, depositAmount);

      // Try to withdraw more than deposited
      witness = balancesMap.getWitness(getUserKey(user));
      await expect(async () => {
        const withdrawTxn = await Mina.transaction(user, async () => {
          await app.withdraw(user, withdrawAmount, depositAmount, witness);
        });
        await withdrawTxn.prove();
        await withdrawTxn.sign([userKey]).send();
      }).rejects.toThrow();
    });

    test('admin can slash user balance', async () => {
      const depositAmount = UInt64.from(2_000_000_000); // 2 MINA
      const slashAmount = UInt64.from(500_000_000); // 0.5 MINA

      // First deposit
      let witness = balancesMap.getWitness(getUserKey(user));
      const depositTxn = await Mina.transaction(user, async () => {
        const pay = AccountUpdate.createSigned(user);
        pay.balance.subInPlace(depositAmount);
        await app.deposit(user, depositAmount, UInt64.from(0), witness);
      });
      await depositTxn.prove();
      await depositTxn.sign([userKey]).send();
      setBalance(user, depositAmount);

      // Admin slashes user balance
      witness = balancesMap.getWitness(getUserKey(user));
      const slashTxn = await Mina.transaction(admin, async () => {
        await app.slash(user, slashAmount, depositAmount, witness);
      });
      await slashTxn.prove();
      await slashTxn.sign([adminKey]).send();
      setBalance(user, depositAmount.sub(slashAmount));

      // Verify state
      const finalRoot = app.balancesRoot.get();
      expect(finalRoot).toEqual(balancesMap.getRoot());
    });
  });
});
