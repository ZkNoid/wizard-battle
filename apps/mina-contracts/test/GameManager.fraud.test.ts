import {
  AccountUpdate,
  Field,
  MerkleMap,
  Mina,
  PrivateKey,
  PublicKey,
  UInt32,
  VerificationKey,
} from 'o1js';

import { GameManager } from '../src/GameManager';
import { GameStatus, GameLeaf, Result } from '../src/Proofs/GameLeaf';
import {
  GameRecordProgram,
  GameRecordProofPublicInput,
} from '../src/Proofs/GameRecordProof';
import { FraudProgram, FraudProofPublicInput } from '../src/Proofs/FraudProoof';
import {
  SpellsDynamicProof,
  SpellsPublicInput,
  SpellsPublicOutput,
} from '../src/Proofs/DynamicProof';
import { State } from '@wizard-battle/common/stater/state';
import {
  dummyModifier,
  DummySpellCast,
  dummySpellProgram,
} from './mock/dummySpellProof';

/* --------------------------------- Test helpers --------------------------------- */
const gameId = Field(1);
const key = gameId;
const setupHash = Field(111);
const fraudHash = Field(333);

// Helper to create fraud proof inputs using real State objects
function createFraudProofInputs() {
  // Create a real initial state
  const initialState = State.default();
  const state1Hash = initialState.hash();

  // Apply the dummy spell modifier to get actual final state
  const actualFinalState = initialState.copy();
  const spellCast = new DummySpellCast({
    caster: Field(1),
    spellId: Field(1),
    target: Field(0),
    additionalData: Field(0),
  });
  dummyModifier(actualFinalState, spellCast);
  const actualFinalStateHash = actualFinalState.hash();

  // Create a fraudulent recorded state (different from actual)
  const fraudulentRecordedState = State.default();
  // Make it different - e.g., different maxHp
  fraudulentRecordedState.playerStats.maxHp =
    fraudulentRecordedState.playerStats.maxHp.add(20); // Wrong value!
  const state2Hash = fraudulentRecordedState.hash(); // This is what was fraudulently recorded

  // Create state tree with the fraudulent recording
  const stateTree = new MerkleMap();
  stateTree.set(Field(0), state1Hash);
  stateTree.set(Field(1), state2Hash); // Fraudulent state recorded

  const state1Witness = stateTree.getWitness(Field(0));
  const state2Witness = stateTree.getWitness(Field(1));
  const stateTreeHash = stateTree.getRoot();

  // Create VK tree (will be populated with real VK during test)
  const vkTree = new MerkleMap();

  return {
    initialState,
    actualFinalState,
    actualFinalStateHash,
    stateTree,
    stateTreeHash,
    state1Hash,
    state1Witness,
    state2Hash, // Fraudulent recorded hash
    state2Witness,
    vkTree,
    spellCast,
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

  // Store compiled verification key for dummySpellProof
  let dummySpellVk: VerificationKey;

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

    // Compile all required programs
    console.log('Compiling dummySpellProof...');
    const dummySpellCompiled = await dummySpellProgram.compile();
    dummySpellVk = dummySpellCompiled.verificationKey;
    console.log(
      'dummySpellProof compiled, VK hash:',
      dummySpellVk.hash.toString()
    );

    console.log('Compiling GameRecordProgram...');
    await GameRecordProgram.compile();

    console.log('Compiling FraudProgram...');
    await FraudProgram.compile();

    console.log('Compiling GameManager...');
    await GameManager.compile();

    console.log('All programs compiled');
  });

  beforeEach(async () => {
    // Start each test at a deterministic slot
    setSlot(10_000n);

    // Deploy a fresh contract for each test
    await deployFreshContract();
  });

  test('proveFraud finalizes FRAUD from AwaitingChallenge using dummySpellProof', async () => {
    const mm = new MerkleMap();
    const witness = wit(mm);

    // Create fraud proof inputs with real State objects
    const fraudInputs = createFraudProofInputs();

    // Create Result with statesRoot matching the fraud proof's stateTreeHash
    const fraudResult = new Result({ statesRoot: fraudInputs.stateTreeHash });
    const fraudResultHash = fraudResult.hash();

    // Start game
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

    // Set new slot baseline
    setSlot(30_000n);

    // Finish game with fraudulent result
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

    // Generate a REAL spell proof using dummySpellProof
    console.log('Generating real spell proof with dummySpellProof...');
    const spellProofResult = await dummySpellProgram.prove(
      new SpellsPublicInput({
        initialStateHash: fraudInputs.state1Hash,
        spellCastHash: fraudInputs.spellCast.hash(),
      }),
      fraudInputs.initialState,
      fraudInputs.spellCast
    );
    console.log('Spell proof generated');

    // Convert to dynamic proof
    const dynamicProof = SpellsDynamicProof.fromProof(spellProofResult.proof);

    // The proof shows: state1 -> actualFinalState
    // But state2 (fraudulent) was recorded in the tree
    // actualFinalState != state2, proving fraud!
    expect(dynamicProof.publicOutput.finalStateHash.toString()).toEqual(
      fraudInputs.actualFinalStateHash.toString()
    );
    expect(dynamicProof.publicOutput.finalStateHash.toString()).not.toEqual(
      fraudInputs.state2Hash.toString()
    );

    // Setup VK tree with real verification key
    fraudInputs.vkTree.set(Field(0), dummySpellVk.hash);
    const vkWitness = fraudInputs.vkTree.getWitness(Field(0));
    const vkRoot = fraudInputs.vkTree.getRoot();

    // Generate fraud proof
    console.log('Generating fraud proof...');
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
      dummySpellVk,
      vkWitness,
      dynamicProof
    );
    console.log('Fraud proof generated');

    // Submit fraud proof to contract
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

    // Verify game is now in FinalizedFraud state
    const finalizedFraud = leaf(
      GameStatus.FinalizedFraud,
      UInt32.from(0),
      setupHash,
      Field(0),
      fraudHash
    );
    const finalRoot = witness.computeRootAndKey(finalizedFraud.hash())[0];
    expect(app.gamesRoot.get()).toEqual(finalRoot);

    console.log('Fraud proof test passed!');
  });

  test('proveFraud works even close to deadline', async () => {
    const mm = new MerkleMap();
    const witness = wit(mm);

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

    // Generate real spell proof
    const spellProofResult = await dummySpellProgram.prove(
      new SpellsPublicInput({
        initialStateHash: fraudInputs.state1Hash,
        spellCastHash: fraudInputs.spellCast.hash(),
      }),
      fraudInputs.initialState,
      fraudInputs.spellCast
    );

    const dynamicProof = SpellsDynamicProof.fromProof(spellProofResult.proof);

    // Setup VK tree
    fraudInputs.vkTree.set(Field(0), dummySpellVk.hash);
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
      dummySpellVk,
      vkWitness,
      dynamicProof
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

  test('proveFraud cannot finalize already finalized game', async () => {
    const mm = new MerkleMap();
    const witness = wit(mm);

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

    // Update witness for the awaiting state before proveGameRecord
    const awaitingLeaf = leaf(
      GameStatus.AwaitingChallenge,
      deadlineSlot,
      setupHash,
      fraudResultHash,
      Field(0)
    );
    mm.set(key, awaitingLeaf.hash());
    const witnessAfterFinish = wit(mm);

    let txProve = await Mina.transaction(user, async () => {
      app.proveGameRecord(
        gameId,
        witnessAfterFinish,
        proof.proof,
        deadlineSlot,
        fraudResultHash
      );
    });
    await txProve.prove();
    await txProve.sign([userKey]).send();

    // Generate real spell proof
    const spellProofResult = await dummySpellProgram.prove(
      new SpellsPublicInput({
        initialStateHash: fraudInputs.state1Hash,
        spellCastHash: fraudInputs.spellCast.hash(),
      }),
      fraudInputs.initialState,
      fraudInputs.spellCast
    );

    const dynamicProof = SpellsDynamicProof.fromProof(spellProofResult.proof);

    // Setup VK tree
    fraudInputs.vkTree.set(Field(0), dummySpellVk.hash);
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
      dummySpellVk,
      vkWitness,
      dynamicProof
    );

    // Now try to submit fraud proof - should fail because game is already finalized
    await expect(async () => {
      let txFraud = await Mina.transaction(user, async () => {
        await app.proveFraud(
          gameId,
          witnessAfterFinish, // Use updated witness
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
