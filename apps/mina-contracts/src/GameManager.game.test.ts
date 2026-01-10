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
} from 'o1js';

import { GameManager } from './GameManager';
import { GameStatus, GameLeaf, Result } from './Proofs/GameLeaf';
import {
  GameRecordProgram,
  GameRecordProofPublicInput,
} from './Proofs/GameRecordProof';
import { FraudProgram } from './Proofs/FraudProoof';

/* --------------------------------- Test helpers --------------------------------- */
const gameId = Field(1);
const key = gameId;
const setupHash = Field(111);

// Create a Result with statesRoot for new fraud proof system
const statesRoot = Field(444);
const expectedResult = new Result({ statesRoot });
const resultHash = expectedResult.hash();

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

describe('GameManager Game Proof tests (slot-based deadlines)', () => {
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

    console.log('Before GameRecordProgram.proveDirect');
    const proof = await GameRecordProgram.proveDirect(
      new GameRecordProofPublicInput({
        gameId,
        setupHash,
        stateTreeRoot: Field(0), // Not used in proveDirect
        vkRoot: Field(0), // Not used in proveDirect
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
});

