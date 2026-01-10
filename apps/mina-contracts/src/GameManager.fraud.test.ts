import {
  AccountUpdate,
  Field,
  MerkleMap,
  MerkleMapWitness,
  Mina,
  PrivateKey,
  PublicKey,
  UInt32,
  UInt64,
  VerificationKey,
} from 'o1js';

import { GameManager } from './GameManager';
import { GameStatus, GameLeaf, Result } from './Proofs/GameLeaf';
import {
  GameRecordProgram,
  GameRecordProofPublicInput,
} from './Proofs/GameRecordProof';
import {
  FraudProgram,
  FraudProofPublicInput,
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

// keep tests explicit about local "virtual" map → recompute expected root via witness
function wit(mm: MerkleMap) {
  return mm.getWitness(key);
}

describe('GameManager Fraud Proof tests', () => {
  let Local: any;
  let deployerKey: PrivateKey, adminKey: PrivateKey, userKey: PrivateKey;
  let deployer: PublicKey, admin: PublicKey, user: PublicKey;

  let appKey: PrivateKey;
  let appAddr: PublicKey;
  let app: GameManager;

  // convenience to set network slot on local chain
  const setSlot = (n: number | bigint) => {
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
    const proof = await GameRecordProgram.proveDirect(
      new GameRecordProofPublicInput({
        gameId,
        setupHash,
        stateTreeRoot: Field(0), // Not used in proveDirect
        vkRoot: Field(0), // Not used in proveDirect
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
});

