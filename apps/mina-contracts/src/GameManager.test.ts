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
} from 'o1js';

import { GameManager, GameStatus, GameLeaf } from './GameManager';
import {
  GameRecordProgram,
  GameRecordProof,
  GameRecordProofPublicInput,
} from './Proofs/GameRecordProof';
import { FraudProgram } from './Proofs/FraudProoof';

/* --------------------------------- Test helpers --------------------------------- */
const gameId = Field(1);
const key = gameId;
const setupHash = Field(111);
const resultHash = Field(222);
const fraudHash = Field(333);

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

  // test('proveFraud finalizes FRAUD from AwaitingChallenge', async () => {
  //   // Reset to Started → Awaiting again to test fraud flow
  //   const mm = new MerkleMap();
  //   const witness = wit(mm);

  //   // start
  //   let tx5 = await Mina.transaction(admin, async () => {
  //     app.startGame(gameId, setupHash, witness);
  //   });
  //   await tx5.prove();
  //   await tx5.sign([adminKey]).send();
  //   const started = leaf(
  //     GameStatus.Started,
  //     UInt32.from(0),
  //     setupHash,
  //     Field(0),
  //     Field(0)
  //   );
  //   const startedRoot = witness.computeRootAndKey(started.hash())[0];
  //   expect(app.gamesRoot.get()).toEqual(startedRoot);

  //   // set new slot baseline
  //   setSlot(30_000n);

  //   let tx6 = await Mina.transaction(admin, async () => {
  //     app.finishGame(
  //       gameId,
  //       resultHash,
  //       witness,
  //       GameStatus.Started,
  //       setupHash
  //     );
  //   });
  //   await tx6.prove();
  //   await tx6.sign([adminKey]).send();

  //   const deadlineSlot = UInt32.from(30_000 + 100); // 30_100
  //   const awaiting = leaf(
  //     GameStatus.AwaitingChallenge,
  //     deadlineSlot,
  //     setupHash,
  //     resultHash,
  //     Field(0)
  //   );
  //   const awaitingRoot = witness.computeRootAndKey(awaiting.hash())[0];
  //   expect(app.gamesRoot.get()).toEqual(awaitingRoot);

  //   const fproof = await DummyFraudProof.make(gameId, setupHash, fraudHash);

  //   await Mina.transaction(userKey, async () => {
  //     app.proveFraud(
  //       gameId,
  //       witness,
  //       fproof,
  //       deadlineSlot,
  //       setupHash,
  //       resultHash
  //     );
  //   }).send();

  //   const finalizedFraud = leaf(
  //     GameStatus.FinalizedFraud,
  //     UInt32.from(0),
  //     setupHash,
  //     Field(0),
  //     fraudHash
  //   );
  //   const finalRoot = witness.computeRootAndKey(finalizedFraud.hash())[0];
  //   expect(app.gamesRoot.get()).toEqual(finalRoot);
  // });

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
