import {
  AccountUpdate,
  Cache,
  Field,
  MerkleMap,
  Mina,
  PrivateKey,
  PublicKey,
  UInt32,
  UInt64,
  Poseidon,
  Bool,
} from 'o1js';
import * as path from 'path';

import {
  TournamentManager,
  TournamentConfig,
  TournamentLeaf,
  TournamentStatus,
  WinnerLeaf,
  WinnersInput,
  PrizesInput,
  NUM_WINNERS,
} from './TournamentManager';

const PRIZE_PERCENTS_50_30_20 = [
  UInt32.from(5000), UInt32.from(3000), UInt32.from(2000),
  UInt32.from(0), UInt32.from(0), UInt32.from(0),
  UInt32.from(0), UInt32.from(0), UInt32.from(0), UInt32.from(0),
];

const DEFAULT_FEE_PERCENT = UInt32.from(500); // 5%
const DEFAULT_CLAIM_WINDOW = UInt32.from(20_000);

function makeConfig(overrides: Partial<{
  ticketPrice: UInt64;
  prizePercents: UInt32[];
  feePercent: UInt32;
  claimWindow: UInt32;
}> = {}): TournamentConfig {
  return new TournamentConfig({
    ticketPrice: overrides.ticketPrice ?? UInt64.from(1_000_000_000),
    prizePercents: overrides.prizePercents ?? PRIZE_PERCENTS_50_30_20,
    feePercent: overrides.feePercent ?? DEFAULT_FEE_PERCENT,
    claimWindow: overrides.claimWindow ?? DEFAULT_CLAIM_WINDOW,
  });
}

function makeLeaf(overrides: Partial<{
  status: UInt32;
  battleStartSlot: UInt32;
  battleEndSlot: UInt32;
  claimDeadlineSlot: UInt32;
  ticketPrice: UInt64;
  feePercent: UInt32;
  prizePercents: UInt32[];
  participantsRoot: Field;
  winnersRoot: Field;
  prizePool: UInt64;
  participantCount: UInt32;
  sponsorContribution: UInt64;
}> = {}): TournamentLeaf {
  const battleStartSlot = overrides.battleStartSlot ?? UInt32.from(11_000);
  const battleEndSlot = overrides.battleEndSlot ?? UInt32.from(12_000);
  const claimDeadlineSlot =
    overrides.claimDeadlineSlot ??
    battleEndSlot.add(DEFAULT_CLAIM_WINDOW);
  return new TournamentLeaf({
    status: overrides.status ?? TournamentStatus.Battle,
    battleStartSlot,
    battleEndSlot,
    claimDeadlineSlot,
    ticketPrice: overrides.ticketPrice ?? UInt64.from(1_000_000_000),
    feePercent: overrides.feePercent ?? DEFAULT_FEE_PERCENT,
    prizePercents: overrides.prizePercents ?? PRIZE_PERCENTS_50_30_20,
    participantsRoot:
      overrides.participantsRoot ?? new MerkleMap().getRoot(),
    winnersRoot: overrides.winnersRoot ?? new MerkleMap().getRoot(),
    prizePool: overrides.prizePool ?? UInt64.from(0),
    participantCount: overrides.participantCount ?? UInt32.from(0),
    sponsorContribution: overrides.sponsorContribution ?? UInt64.from(0),
  });
}

function makeWinnersInput(pks: PublicKey[]): WinnersInput {
  return new WinnersInput({
    items: Array.from({ length: NUM_WINNERS }, (_, i) => pks[i] ?? PublicKey.empty()),
  });
}

function makePrizesInput(amounts: UInt64[]): PrizesInput {
  return new PrizesInput({
    items: Array.from({ length: NUM_WINNERS }, (_, i) => amounts[i] ?? UInt64.from(0)),
  });
}

describe('TournamentManager', () => {
  let Local: any;
  let deployerKey: PrivateKey, adminKey: PrivateKey;
  let deployer: PublicKey, admin: PublicKey;
  let player1Key: PrivateKey, player2Key: PrivateKey, player3Key: PrivateKey;
  let player1: PublicKey, player2: PublicKey, player3: PublicKey;

  let appKey: PrivateKey;
  let appAddr: PublicKey;
  let app: TournamentManager;

  let tournamentsMap: MerkleMap;

  const setSlot = (n: number | bigint) => {
    (Local as any).setGlobalSlot?.(BigInt(n));
  };

  function getTournamentKey(tournamentId: Field): Field {
    return Poseidon.hash([tournamentId]);
  }

  function getPlayerKey(player: PublicKey): Field {
    return Poseidon.hash(player.toFields());
  }

  const deployFreshContract = async () => {
    appKey = PrivateKey.random();
    appAddr = appKey.toPublicKey();
    app = new TournamentManager(appAddr);

    const tx1 = await Mina.transaction(deployer, async () => {
      AccountUpdate.fundNewAccount(deployer);
      await app.deploy();
    });
    await tx1.prove();
    await tx1.sign([deployerKey, appKey]).send();

    expect(app.admin.get()).toEqual(deployer);
    expect(app.platformFeePercent.get()).toEqual(UInt32.from(500)); // 5%

    const tx2 = await Mina.transaction(deployer, async () => {
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
    player1Key = Local.testAccounts[2].key;
    player2Key = Local.testAccounts[3].key;
    player3Key = Local.testAccounts[4].key;

    deployer = deployerKey.toPublicKey();
    admin = adminKey.toPublicKey();
    player1 = player1Key.toPublicKey();
    player2 = player2Key.toPublicKey();
    player3 = player3Key.toPublicKey();

    // Cache compiled circuit on disk so re-runs skip the multi-minute
    // setup. First run populates the cache; subsequent runs hit it.
    // `process.cwd()` resolves to the mina-contracts package root under
    // jest, which avoids ESM's missing `__dirname`.
    const cacheDir = path.resolve(process.cwd(), 'cache/TournamentManager');
    await TournamentManager.compile({ cache: Cache.FileSystem(cacheDir) });
  });

  beforeEach(async () => {
    setSlot(10_000n);
    await deployFreshContract();
    tournamentsMap = new MerkleMap();
  });

  describe('Initialization', () => {
    test('initializes with correct tournaments root', async () => {
      const root = app.tournamentsRoot.get();
      expect(root).toEqual(tournamentsMap.getRoot());
    });

    test('initializes with correct platform fee', async () => {
      const fee = app.platformFeePercent.get();
      expect(fee).toEqual(UInt32.from(500));
    });
  });

  describe('Admin Settings', () => {
    test('admin can update platform fee', async () => {
      const newFee = UInt32.from(1000); // 10%

      const txn = await Mina.transaction(admin, async () => {
        await app.setPlatformFeePercent(newFee);
      });
      await txn.prove();
      await txn.sign([adminKey]).send();

      expect(app.platformFeePercent.get()).toEqual(newFee);
    });

    test('platform fee cannot exceed 50%', async () => {
      const invalidFee = UInt32.from(6000); // 60%

      await expect(async () => {
        const txn = await Mina.transaction(admin, async () => {
          await app.setPlatformFeePercent(invalidFee);
        });
        await txn.prove();
        await txn.sign([adminKey]).send();
      }).rejects.toThrow();
    });
  });

  describe('Tournament Creation', () => {
    test('admin can create a tournament in Battle status', async () => {
      const tournamentId = Field(1);
      const config = makeConfig();

      const witness = tournamentsMap.getWitness(getTournamentKey(tournamentId));

      const txn = await Mina.transaction(admin, async () => {
        await app.createTournament(
          tournamentId,
          config,
          UInt32.from(11_000), // battle start
          UInt32.from(12_000), // battle end
          witness
        );
      });
      await txn.prove();
      await txn.sign([adminKey]).send();

      const newTournament = makeLeaf({
        battleStartSlot: UInt32.from(11_000),
        battleEndSlot: UInt32.from(12_000),
        ticketPrice: config.ticketPrice,
        prizePercents: config.prizePercents,
      });
      tournamentsMap.set(getTournamentKey(tournamentId), newTournament.hash());

      expect(app.tournamentsRoot.get()).toEqual(tournamentsMap.getRoot());
    });

    test('prize distribution must sum to 100%', async () => {
      const tournamentId = Field(1);
      const invalidConfig = makeConfig({
        prizePercents: [
          UInt32.from(5000), UInt32.from(3000), UInt32.from(1000),
          UInt32.from(0), UInt32.from(0), UInt32.from(0),
          UInt32.from(0), UInt32.from(0), UInt32.from(0), UInt32.from(0),
        ], // Total: 90%, not 100%
      });

      const witness = tournamentsMap.getWitness(getTournamentKey(tournamentId));

      await expect(async () => {
        const txn = await Mina.transaction(admin, async () => {
          await app.createTournament(
            tournamentId,
            invalidConfig,
            UInt32.from(11_000),
            UInt32.from(12_000),
            witness
          );
        });
        await txn.prove();
        await txn.sign([adminKey]).send();
      }).rejects.toThrow();
    });
  });

  describe('Ticket Purchase', () => {
    let tournamentId: Field;
    let participantsMap: MerkleMap;
    let currentTournament: TournamentLeaf;

    beforeEach(async () => {
      tournamentId = Field(1);
      participantsMap = new MerkleMap();

      const config = makeConfig();

      currentTournament = makeLeaf({
        ticketPrice: config.ticketPrice,
        prizePercents: config.prizePercents,
        participantsRoot: participantsMap.getRoot(),
      });

      const witness = tournamentsMap.getWitness(getTournamentKey(tournamentId));

      const txn = await Mina.transaction(admin, async () => {
        await app.createTournament(
          tournamentId,
          config,
          UInt32.from(11_000),
          UInt32.from(12_000),
          witness
        );
      });
      await txn.prove();
      await txn.sign([adminKey]).send();

      tournamentsMap.set(getTournamentKey(tournamentId), currentTournament.hash());
      setSlot(11_000n);
    });

    test('player can buy ticket during battle window', async () => {
      const ticketPrice = UInt64.from(1_000_000_000);
      const adminBalanceBefore = Mina.getBalance(admin);

      const tournamentWitness = tournamentsMap.getWitness(
        getTournamentKey(tournamentId)
      );
      const participantWitness = participantsMap.getWitness(
        getPlayerKey(player1)
      );

      const txn = await Mina.transaction(player1, async () => {
        const pay = AccountUpdate.createSigned(player1);
        pay.balance.subInPlace(ticketPrice);
        await app.buyTicket(
          tournamentId,
          currentTournament,
          tournamentWitness,
          participantWitness
        );
      });
      await txn.prove();
      await txn.sign([player1Key]).send();

      participantsMap.set(getPlayerKey(player1), Field(1));

      const feeAmount = ticketPrice.mul(UInt64.from(500)).div(UInt64.from(10000));
      const prizeContribution = ticketPrice.sub(feeAmount);

      const updatedTournament = makeLeaf({
        ticketPrice: currentTournament.ticketPrice,
        prizePercents: currentTournament.prizePercents,
        participantsRoot: participantsMap.getRoot(),
        winnersRoot: currentTournament.winnersRoot,
        prizePool: prizeContribution,
        participantCount: UInt32.from(1),
      });
      tournamentsMap.set(getTournamentKey(tournamentId), updatedTournament.hash());

      expect(app.tournamentsRoot.get()).toEqual(tournamentsMap.getRoot());

      const adminBalanceAfter = Mina.getBalance(admin);
      expect(adminBalanceAfter.sub(adminBalanceBefore)).toEqual(feeAmount);
    });

    test('player cannot buy ticket before battle starts', async () => {
      setSlot(10_500n);
      const ticketPrice = UInt64.from(1_000_000_000);
      const tournamentWitness = tournamentsMap.getWitness(
        getTournamentKey(tournamentId)
      );
      const participantWitness = participantsMap.getWitness(
        getPlayerKey(player1)
      );

      await expect(async () => {
        const txn = await Mina.transaction(player1, async () => {
          const pay = AccountUpdate.createSigned(player1);
          pay.balance.subInPlace(ticketPrice);
          await app.buyTicket(
            tournamentId,
            currentTournament,
            tournamentWitness,
            participantWitness
          );
        });
        await txn.prove();
        await txn.sign([player1Key]).send();
      }).rejects.toThrow();
    });

    test('player cannot buy ticket twice', async () => {
      const ticketPrice = UInt64.from(1_000_000_000);

      let tournamentWitness = tournamentsMap.getWitness(
        getTournamentKey(tournamentId)
      );
      let participantWitness = participantsMap.getWitness(getPlayerKey(player1));

      const txn1 = await Mina.transaction(player1, async () => {
        const pay = AccountUpdate.createSigned(player1);
        pay.balance.subInPlace(ticketPrice);
        await app.buyTicket(
          tournamentId,
          currentTournament,
          tournamentWitness,
          participantWitness
        );
      });
      await txn1.prove();
      await txn1.sign([player1Key]).send();

      participantsMap.set(getPlayerKey(player1), Field(1));
      const feeAmount = ticketPrice.mul(UInt64.from(500)).div(UInt64.from(10000));
      const prizeContribution = ticketPrice.sub(feeAmount);

      const updatedTournament = makeLeaf({
        ticketPrice: currentTournament.ticketPrice,
        prizePercents: currentTournament.prizePercents,
        participantsRoot: participantsMap.getRoot(),
        winnersRoot: currentTournament.winnersRoot,
        prizePool: prizeContribution,
        participantCount: UInt32.from(1),
      });
      tournamentsMap.set(getTournamentKey(tournamentId), updatedTournament.hash());

      tournamentWitness = tournamentsMap.getWitness(getTournamentKey(tournamentId));
      participantWitness = participantsMap.getWitness(getPlayerKey(player1));

      await expect(async () => {
        const txn2 = await Mina.transaction(player1, async () => {
          const pay = AccountUpdate.createSigned(player1);
          pay.balance.subInPlace(ticketPrice);
          await app.buyTicket(
            tournamentId,
            updatedTournament,
            tournamentWitness,
            participantWitness
          );
        });
        await txn2.prove();
        await txn2.sign([player1Key]).send();
      }).rejects.toThrow();
    });
  });

  describe('Tournament Finalization and Prize Claiming', () => {
    let tournamentId: Field;
    let participantsMap: MerkleMap;
    let winnersMap: MerkleMap;
    let currentTournament: TournamentLeaf;
    let prizePool: UInt64;

    beforeEach(async () => {
      tournamentId = Field(1);
      participantsMap = new MerkleMap();
      winnersMap = new MerkleMap();

      const ticketPrice = UInt64.from(1_000_000_000); // 1 MINA
      const config = makeConfig({ ticketPrice });

      currentTournament = makeLeaf({
        ticketPrice: config.ticketPrice,
        prizePercents: config.prizePercents,
        participantsRoot: participantsMap.getRoot(),
        winnersRoot: winnersMap.getRoot(),
      });

      let witness = tournamentsMap.getWitness(getTournamentKey(tournamentId));
      let txn = await Mina.transaction(admin, async () => {
        await app.createTournament(
          tournamentId,
          config,
          UInt32.from(11_000),
          UInt32.from(12_000),
          witness
        );
      });
      await txn.prove();
      await txn.sign([adminKey]).send();
      tournamentsMap.set(getTournamentKey(tournamentId), currentTournament.hash());

      setSlot(11_000n);

      const feePercent = UInt64.from(500);
      const feeAmount = ticketPrice.mul(feePercent).div(UInt64.from(10000));
      const prizeContribution = ticketPrice.sub(feeAmount);
      prizePool = UInt64.from(0);

      for (const [playerKey, player] of [
        [player1Key, player1],
        [player2Key, player2],
        [player3Key, player3],
      ] as [PrivateKey, PublicKey][]) {
        const tournamentWitness = tournamentsMap.getWitness(
          getTournamentKey(tournamentId)
        );
        const participantWitness = participantsMap.getWitness(getPlayerKey(player));

        txn = await Mina.transaction(player, async () => {
          const pay = AccountUpdate.createSigned(player);
          pay.balance.subInPlace(ticketPrice);
          await app.buyTicket(
            tournamentId,
            currentTournament,
            tournamentWitness,
            participantWitness
          );
        });
        await txn.prove();
        await txn.sign([playerKey]).send();

        participantsMap.set(getPlayerKey(player), Field(1));
        prizePool = prizePool.add(prizeContribution);

        currentTournament = makeLeaf({
          ticketPrice: currentTournament.ticketPrice,
          prizePercents: currentTournament.prizePercents,
          participantsRoot: participantsMap.getRoot(),
          winnersRoot: winnersMap.getRoot(),
          prizePool,
          participantCount: currentTournament.participantCount.add(1),
        });
        tournamentsMap.set(getTournamentKey(tournamentId), currentTournament.hash());
      }
    });

    test('admin can finalize tournament after battle ends', async () => {
      setSlot(12_000n);

      const prize1 = prizePool.mul(UInt64.from(5000)).div(UInt64.from(10000));
      const prize2 = prizePool.mul(UInt64.from(3000)).div(UInt64.from(10000));
      const prize3 = prizePool.mul(UInt64.from(2000)).div(UInt64.from(10000));

      const winner1Leaf = new WinnerLeaf({
        prizeAmount: prize1,
        claimed: Bool(false),
      });
      const winner2Leaf = new WinnerLeaf({
        prizeAmount: prize2,
        claimed: Bool(false),
      });
      const winner3Leaf = new WinnerLeaf({
        prizeAmount: prize3,
        claimed: Bool(false),
      });

      winnersMap.set(getPlayerKey(player1), winner1Leaf.hash());
      winnersMap.set(getPlayerKey(player2), winner2Leaf.hash());
      winnersMap.set(getPlayerKey(player3), winner3Leaf.hash());

      const tournamentWitness = tournamentsMap.getWitness(
        getTournamentKey(tournamentId)
      );

      const txn = await Mina.transaction(admin, async () => {
        await app.finalizeTournament(
          tournamentId,
          currentTournament,
          tournamentWitness,
          makeWinnersInput([player1, player2, player3]),
          makePrizesInput([prize1, prize2, prize3]),
          winnersMap.getRoot()
        );
      });
      await txn.prove();
      await txn.sign([adminKey]).send();

      const finalizedTournament = makeLeaf({
        status: TournamentStatus.Claiming,
        ticketPrice: currentTournament.ticketPrice,
        prizePercents: currentTournament.prizePercents,
        participantsRoot: currentTournament.participantsRoot,
        winnersRoot: winnersMap.getRoot(),
        prizePool: currentTournament.prizePool,
        participantCount: currentTournament.participantCount,
      });
      tournamentsMap.set(getTournamentKey(tournamentId), finalizedTournament.hash());

      expect(app.tournamentsRoot.get()).toEqual(tournamentsMap.getRoot());
    });

    test('winner can claim prize', async () => {
      setSlot(12_000n);

      const prize1 = prizePool.mul(UInt64.from(5000)).div(UInt64.from(10000));
      const prize2 = prizePool.mul(UInt64.from(3000)).div(UInt64.from(10000));
      const prize3 = prizePool.mul(UInt64.from(2000)).div(UInt64.from(10000));

      const winner1Leaf = new WinnerLeaf({
        prizeAmount: prize1,
        claimed: Bool(false),
      });
      const winner2Leaf = new WinnerLeaf({
        prizeAmount: prize2,
        claimed: Bool(false),
      });
      const winner3Leaf = new WinnerLeaf({
        prizeAmount: prize3,
        claimed: Bool(false),
      });

      winnersMap.set(getPlayerKey(player1), winner1Leaf.hash());
      winnersMap.set(getPlayerKey(player2), winner2Leaf.hash());
      winnersMap.set(getPlayerKey(player3), winner3Leaf.hash());

      let tournamentWitness = tournamentsMap.getWitness(
        getTournamentKey(tournamentId)
      );

      let txn = await Mina.transaction(admin, async () => {
        await app.finalizeTournament(
          tournamentId,
          currentTournament,
          tournamentWitness,
          makeWinnersInput([player1, player2, player3]),
          makePrizesInput([prize1, prize2, prize3]),
          winnersMap.getRoot()
        );
      });
      await txn.prove();
      await txn.sign([adminKey]).send();

      currentTournament = makeLeaf({
        status: TournamentStatus.Claiming,
        ticketPrice: currentTournament.ticketPrice,
        prizePercents: currentTournament.prizePercents,
        participantsRoot: currentTournament.participantsRoot,
        winnersRoot: winnersMap.getRoot(),
        prizePool: currentTournament.prizePool,
        participantCount: currentTournament.participantCount,
      });
      tournamentsMap.set(getTournamentKey(tournamentId), currentTournament.hash());

      const player1BalanceBefore = Mina.getBalance(player1);

      tournamentWitness = tournamentsMap.getWitness(getTournamentKey(tournamentId));
      const winnerWitness = winnersMap.getWitness(getPlayerKey(player1));

      txn = await Mina.transaction(player1, async () => {
        await app.claimPrize(
          tournamentId,
          currentTournament,
          tournamentWitness,
          winner1Leaf,
          winnerWitness
        );
      });
      await txn.prove();
      await txn.sign([player1Key]).send();

      const player1BalanceAfter = Mina.getBalance(player1);
      expect(player1BalanceAfter.toBigInt()).toBeGreaterThan(
        player1BalanceBefore.toBigInt()
      );
    });

    test('winner cannot claim prize twice', async () => {
      setSlot(12_000n);

      const prize1 = prizePool.mul(UInt64.from(5000)).div(UInt64.from(10000));
      const prize2 = prizePool.mul(UInt64.from(3000)).div(UInt64.from(10000));
      const prize3 = prizePool.mul(UInt64.from(2000)).div(UInt64.from(10000));

      let winner1Leaf = new WinnerLeaf({
        prizeAmount: prize1,
        claimed: Bool(false),
      });
      const winner2Leaf = new WinnerLeaf({
        prizeAmount: prize2,
        claimed: Bool(false),
      });
      const winner3Leaf = new WinnerLeaf({
        prizeAmount: prize3,
        claimed: Bool(false),
      });

      winnersMap.set(getPlayerKey(player1), winner1Leaf.hash());
      winnersMap.set(getPlayerKey(player2), winner2Leaf.hash());
      winnersMap.set(getPlayerKey(player3), winner3Leaf.hash());

      let tournamentWitness = tournamentsMap.getWitness(
        getTournamentKey(tournamentId)
      );

      let txn = await Mina.transaction(admin, async () => {
        await app.finalizeTournament(
          tournamentId,
          currentTournament,
          tournamentWitness,
          makeWinnersInput([player1, player2, player3]),
          makePrizesInput([prize1, prize2, prize3]),
          winnersMap.getRoot()
        );
      });
      await txn.prove();
      await txn.sign([adminKey]).send();

      currentTournament = makeLeaf({
        status: TournamentStatus.Claiming,
        ticketPrice: currentTournament.ticketPrice,
        prizePercents: currentTournament.prizePercents,
        participantsRoot: currentTournament.participantsRoot,
        winnersRoot: winnersMap.getRoot(),
        prizePool: currentTournament.prizePool,
        participantCount: currentTournament.participantCount,
      });
      tournamentsMap.set(getTournamentKey(tournamentId), currentTournament.hash());

      tournamentWitness = tournamentsMap.getWitness(getTournamentKey(tournamentId));
      let winnerWitness = winnersMap.getWitness(getPlayerKey(player1));

      txn = await Mina.transaction(player1, async () => {
        await app.claimPrize(
          tournamentId,
          currentTournament,
          tournamentWitness,
          winner1Leaf,
          winnerWitness
        );
      });
      await txn.prove();
      await txn.sign([player1Key]).send();

      winner1Leaf = new WinnerLeaf({
        prizeAmount: prize1,
        claimed: Bool(true),
      });
      winnersMap.set(getPlayerKey(player1), winner1Leaf.hash());

      currentTournament = makeLeaf({
        status: TournamentStatus.Claiming,
        ticketPrice: currentTournament.ticketPrice,
        prizePercents: currentTournament.prizePercents,
        participantsRoot: currentTournament.participantsRoot,
        winnersRoot: winnersMap.getRoot(),
        // claim already happened on-chain → prizePool was decremented by prize1
        prizePool: currentTournament.prizePool.sub(prize1),
        participantCount: currentTournament.participantCount,
      });
      tournamentsMap.set(getTournamentKey(tournamentId), currentTournament.hash());

      tournamentWitness = tournamentsMap.getWitness(getTournamentKey(tournamentId));
      winnerWitness = winnersMap.getWitness(getPlayerKey(player1));

      await expect(async () => {
        txn = await Mina.transaction(player1, async () => {
          await app.claimPrize(
            tournamentId,
            currentTournament,
            tournamentWitness,
            winner1Leaf,
            winnerWitness
          );
        });
        await txn.prove();
        await txn.sign([player1Key]).send();
      }).rejects.toThrow();
    });
  });

  describe('Sponsor Funding', () => {
    let tournamentId: Field;
    let currentTournament: TournamentLeaf;

    beforeEach(async () => {
      tournamentId = Field(1);
      const config = makeConfig();

      currentTournament = makeLeaf({
        ticketPrice: config.ticketPrice,
        prizePercents: config.prizePercents,
      });

      const witness = tournamentsMap.getWitness(getTournamentKey(tournamentId));
      const txn = await Mina.transaction(admin, async () => {
        await app.createTournament(
          tournamentId,
          config,
          UInt32.from(11_000),
          UInt32.from(12_000),
          witness
        );
      });
      await txn.prove();
      await txn.sign([adminKey]).send();

      tournamentsMap.set(
        getTournamentKey(tournamentId),
        currentTournament.hash()
      );
      setSlot(11_000n);
    });

    test('sponsor can fund during battle phase', async () => {
      const sponsor = player1;
      const sponsorKey = player1Key;
      const amount = UInt64.from(2_000_000_000); // 2 MINA

      const contractBalanceBefore = Mina.getBalance(appAddr);

      const tournamentWitness = tournamentsMap.getWitness(
        getTournamentKey(tournamentId)
      );

      const txn = await Mina.transaction(sponsor, async () => {
        const pay = AccountUpdate.createSigned(sponsor);
        pay.balance.subInPlace(amount);
        await app.sponsorFund(
          tournamentId,
          currentTournament,
          tournamentWitness,
          amount
        );
      });
      await txn.prove();
      await txn.sign([sponsorKey]).send();

      const updatedTournament = makeLeaf({
        ticketPrice: currentTournament.ticketPrice,
        prizePercents: currentTournament.prizePercents,
        prizePool: amount,
        sponsorContribution: amount,
      });
      tournamentsMap.set(
        getTournamentKey(tournamentId),
        updatedTournament.hash()
      );
      expect(app.tournamentsRoot.get()).toEqual(tournamentsMap.getRoot());

      const contractBalanceAfter = Mina.getBalance(appAddr);
      expect(contractBalanceAfter.sub(contractBalanceBefore)).toEqual(amount);
    });

    test('sponsor funds accumulate across multiple deposits', async () => {
      const amount1 = UInt64.from(1_000_000_000);
      const amount2 = UInt64.from(500_000_000);

      let tournamentWitness = tournamentsMap.getWitness(
        getTournamentKey(tournamentId)
      );

      let txn = await Mina.transaction(player1, async () => {
        const pay = AccountUpdate.createSigned(player1);
        pay.balance.subInPlace(amount1);
        await app.sponsorFund(
          tournamentId,
          currentTournament,
          tournamentWitness,
          amount1
        );
      });
      await txn.prove();
      await txn.sign([player1Key]).send();

      currentTournament = makeLeaf({
        ticketPrice: currentTournament.ticketPrice,
        prizePercents: currentTournament.prizePercents,
        prizePool: amount1,
        sponsorContribution: amount1,
      });
      tournamentsMap.set(
        getTournamentKey(tournamentId),
        currentTournament.hash()
      );

      tournamentWitness = tournamentsMap.getWitness(
        getTournamentKey(tournamentId)
      );

      txn = await Mina.transaction(player2, async () => {
        const pay = AccountUpdate.createSigned(player2);
        pay.balance.subInPlace(amount2);
        await app.sponsorFund(
          tournamentId,
          currentTournament,
          tournamentWitness,
          amount2
        );
      });
      await txn.prove();
      await txn.sign([player2Key]).send();

      const total = amount1.add(amount2);
      const updated = makeLeaf({
        ticketPrice: currentTournament.ticketPrice,
        prizePercents: currentTournament.prizePercents,
        prizePool: total,
        sponsorContribution: total,
      });
      tournamentsMap.set(getTournamentKey(tournamentId), updated.hash());
      expect(app.tournamentsRoot.get()).toEqual(tournamentsMap.getRoot());
    });

    test('sponsor cannot fund after battle ends', async () => {
      setSlot(12_000n);
      const amount = UInt64.from(1_000_000_000);
      const tournamentWitness = tournamentsMap.getWitness(
        getTournamentKey(tournamentId)
      );

      await expect(async () => {
        const txn = await Mina.transaction(player1, async () => {
          const pay = AccountUpdate.createSigned(player1);
          pay.balance.subInPlace(amount);
          await app.sponsorFund(
            tournamentId,
            currentTournament,
            tournamentWitness,
            amount
          );
        });
        await txn.prove();
        await txn.sign([player1Key]).send();
      }).rejects.toThrow();
    });

    test('sponsor cannot fund zero', async () => {
      const tournamentWitness = tournamentsMap.getWitness(
        getTournamentKey(tournamentId)
      );

      await expect(async () => {
        const txn = await Mina.transaction(player1, async () => {
          const pay = AccountUpdate.createSigned(player1);
          pay.balance.subInPlace(UInt64.from(0));
          await app.sponsorFund(
            tournamentId,
            currentTournament,
            tournamentWitness,
            UInt64.from(0)
          );
        });
        await txn.prove();
        await txn.sign([player1Key]).send();
      }).rejects.toThrow();
    });
  });

  describe('Finalize remainder refund', () => {
    let tournamentId: Field;
    let currentTournament: TournamentLeaf;

    beforeEach(async () => {
      tournamentId = Field(1);
      const config = makeConfig();
      currentTournament = makeLeaf({
        ticketPrice: config.ticketPrice,
        prizePercents: config.prizePercents,
      });

      const witness = tournamentsMap.getWitness(getTournamentKey(tournamentId));
      const txn = await Mina.transaction(admin, async () => {
        await app.createTournament(
          tournamentId,
          config,
          UInt32.from(11_000),
          UInt32.from(12_000),
          witness
        );
      });
      await txn.prove();
      await txn.sign([adminKey]).send();

      tournamentsMap.set(
        getTournamentKey(tournamentId),
        currentTournament.hash()
      );
      setSlot(11_000n);

      const sponsorAmount = UInt64.from(10_000_000_000); // 10 MINA
      const tournamentWitness = tournamentsMap.getWitness(
        getTournamentKey(tournamentId)
      );
      const sponsorTxn = await Mina.transaction(player1, async () => {
        const pay = AccountUpdate.createSigned(player1);
        pay.balance.subInPlace(sponsorAmount);
        await app.sponsorFund(
          tournamentId,
          currentTournament,
          tournamentWitness,
          sponsorAmount
        );
      });
      await sponsorTxn.prove();
      await sponsorTxn.sign([player1Key]).send();

      currentTournament = makeLeaf({
        ticketPrice: config.ticketPrice,
        prizePercents: config.prizePercents,
        prizePool: sponsorAmount,
        sponsorContribution: sponsorAmount,
      });
      tournamentsMap.set(
        getTournamentKey(tournamentId),
        currentTournament.hash()
      );
    });

    test('admin receives unallocated remainder when prizes < pool', async () => {
      setSlot(12_000n);
      const adminBalanceBefore = Mina.getBalance(admin);
      const contractBalanceBefore = Mina.getBalance(appAddr);

      const totalAllocated = UInt64.from(3_000_000_000); // 3 MINA out of 10
      const expectedRemainder = currentTournament.prizePool.sub(totalAllocated);

      const winnersMap = new MerkleMap();
      const winner1Leaf = new WinnerLeaf({
        prizeAmount: totalAllocated,
        claimed: Bool(false),
      });
      winnersMap.set(getPlayerKey(player2), winner1Leaf.hash());

      const tournamentWitness = tournamentsMap.getWitness(
        getTournamentKey(tournamentId)
      );

      const txn = await Mina.transaction(admin, async () => {
        await app.finalizeTournament(
          tournamentId,
          currentTournament,
          tournamentWitness,
          makeWinnersInput([player2]),
          makePrizesInput([totalAllocated]),
          winnersMap.getRoot()
        );
      });
      await txn.prove();
      await txn.sign([adminKey]).send();

      const adminBalanceAfter = Mina.getBalance(admin);
      const contractBalanceAfter = Mina.getBalance(appAddr);

      expect(adminBalanceAfter.sub(adminBalanceBefore)).toEqual(
        expectedRemainder
      );
      expect(contractBalanceBefore.sub(contractBalanceAfter)).toEqual(
        expectedRemainder
      );
    });

    test('finalize with full allocation refunds nothing', async () => {
      setSlot(12_000n);
      const adminBalanceBefore = Mina.getBalance(admin);

      const fullAllocation = currentTournament.prizePool;
      const winnersMap = new MerkleMap();
      const winner1Leaf = new WinnerLeaf({
        prizeAmount: fullAllocation,
        claimed: Bool(false),
      });
      winnersMap.set(getPlayerKey(player2), winner1Leaf.hash());

      const tournamentWitness = tournamentsMap.getWitness(
        getTournamentKey(tournamentId)
      );

      const txn = await Mina.transaction(admin, async () => {
        await app.finalizeTournament(
          tournamentId,
          currentTournament,
          tournamentWitness,
          makeWinnersInput([player2]),
          makePrizesInput([fullAllocation]),
          winnersMap.getRoot()
        );
      });
      await txn.prove();
      await txn.sign([adminKey]).send();

      const adminBalanceAfter = Mina.getBalance(admin);
      expect(adminBalanceAfter.sub(adminBalanceBefore)).toEqual(UInt64.from(0));
    });
  });

  describe('Recover Unclaimed', () => {
    let tournamentId: Field;
    let currentTournament: TournamentLeaf;
    let winnersMap: MerkleMap;
    let winner1Leaf: WinnerLeaf;
    let prize1: UInt64;
    let totalPrizePool: UInt64;

    beforeEach(async () => {
      tournamentId = Field(1);
      const config = makeConfig();
      currentTournament = makeLeaf({
        ticketPrice: config.ticketPrice,
        prizePercents: config.prizePercents,
      });

      const witness = tournamentsMap.getWitness(getTournamentKey(tournamentId));
      let txn = await Mina.transaction(admin, async () => {
        await app.createTournament(
          tournamentId,
          config,
          UInt32.from(11_000),
          UInt32.from(12_000),
          witness
        );
      });
      await txn.prove();
      await txn.sign([adminKey]).send();
      tournamentsMap.set(
        getTournamentKey(tournamentId),
        currentTournament.hash()
      );

      setSlot(11_000n);

      // Sponsor funds 10 MINA so we have something to recover.
      totalPrizePool = UInt64.from(10_000_000_000);
      let tournamentWitness = tournamentsMap.getWitness(
        getTournamentKey(tournamentId)
      );
      txn = await Mina.transaction(player1, async () => {
        const pay = AccountUpdate.createSigned(player1);
        pay.balance.subInPlace(totalPrizePool);
        await app.sponsorFund(
          tournamentId,
          currentTournament,
          tournamentWitness,
          totalPrizePool
        );
      });
      await txn.prove();
      await txn.sign([player1Key]).send();

      currentTournament = makeLeaf({
        ticketPrice: config.ticketPrice,
        prizePercents: config.prizePercents,
        prizePool: totalPrizePool,
        sponsorContribution: totalPrizePool,
      });
      tournamentsMap.set(
        getTournamentKey(tournamentId),
        currentTournament.hash()
      );

      // Finalize fully allocated to player2 so claim window matters.
      setSlot(12_000n);
      prize1 = totalPrizePool;
      winnersMap = new MerkleMap();
      winner1Leaf = new WinnerLeaf({
        prizeAmount: prize1,
        claimed: Bool(false),
      });
      winnersMap.set(getPlayerKey(player2), winner1Leaf.hash());

      tournamentWitness = tournamentsMap.getWitness(
        getTournamentKey(tournamentId)
      );
      txn = await Mina.transaction(admin, async () => {
        await app.finalizeTournament(
          tournamentId,
          currentTournament,
          tournamentWitness,
          makeWinnersInput([player2]),
          makePrizesInput([prize1]),
          winnersMap.getRoot()
        );
      });
      await txn.prove();
      await txn.sign([adminKey]).send();

      currentTournament = makeLeaf({
        status: TournamentStatus.Claiming,
        ticketPrice: config.ticketPrice,
        prizePercents: config.prizePercents,
        winnersRoot: winnersMap.getRoot(),
        prizePool: prize1,
        sponsorContribution: totalPrizePool,
      });
      tournamentsMap.set(
        getTournamentKey(tournamentId),
        currentTournament.hash()
      );
    });

    test('admin cannot recover before claim window closes', async () => {
      // Still within claim window (claimDeadline = 12_000 + 20_000 = 32_000)
      setSlot(20_000n);
      const tournamentWitness = tournamentsMap.getWitness(
        getTournamentKey(tournamentId)
      );

      await expect(async () => {
        const txn = await Mina.transaction(admin, async () => {
          await app.recoverUnclaimed(
            tournamentId,
            currentTournament,
            tournamentWitness
          );
        });
        await txn.prove();
        await txn.sign([adminKey]).send();
      }).rejects.toThrow();
    });

    test('admin sweeps unclaimed pool to admin after window closes', async () => {
      setSlot(32_000n); // 12_000 + 20_000 (DEFAULT_CLAIM_WINDOW)
      const adminBalanceBefore = Mina.getBalance(admin);
      const contractBalanceBefore = Mina.getBalance(appAddr);

      const tournamentWitness = tournamentsMap.getWitness(
        getTournamentKey(tournamentId)
      );

      const txn = await Mina.transaction(admin, async () => {
        await app.recoverUnclaimed(
          tournamentId,
          currentTournament,
          tournamentWitness
        );
      });
      await txn.prove();
      await txn.sign([adminKey]).send();

      const adminBalanceAfter = Mina.getBalance(admin);
      const contractBalanceAfter = Mina.getBalance(appAddr);

      // Admin should receive the full unclaimed prize1.
      expect(adminBalanceAfter.sub(adminBalanceBefore)).toEqual(prize1);
      expect(contractBalanceBefore.sub(contractBalanceAfter)).toEqual(prize1);

      // Leaf transitions to Settled with empty pool.
      const settledLeaf = makeLeaf({
        status: TournamentStatus.Settled,
        ticketPrice: currentTournament.ticketPrice,
        prizePercents: currentTournament.prizePercents,
        winnersRoot: winnersMap.getRoot(),
        prizePool: UInt64.from(0),
        sponsorContribution: totalPrizePool,
      });
      tournamentsMap.set(getTournamentKey(tournamentId), settledLeaf.hash());
      expect(app.tournamentsRoot.get()).toEqual(tournamentsMap.getRoot());
    });

    test('recover after partial claim only sweeps remainder', async () => {
      // Player2 claims their full prize first.
      let tournamentWitness = tournamentsMap.getWitness(
        getTournamentKey(tournamentId)
      );
      const winnerWitness = winnersMap.getWitness(getPlayerKey(player2));

      let txn = await Mina.transaction(player2, async () => {
        await app.claimPrize(
          tournamentId,
          currentTournament,
          tournamentWitness,
          winner1Leaf,
          winnerWitness
        );
      });
      await txn.prove();
      await txn.sign([player2Key]).send();

      // Pool fully drained by the claim — recover should be a no-op.
      const claimedLeaf = new WinnerLeaf({
        prizeAmount: prize1,
        claimed: Bool(true),
      });
      winnersMap.set(getPlayerKey(player2), claimedLeaf.hash());

      currentTournament = makeLeaf({
        status: TournamentStatus.Claiming,
        ticketPrice: currentTournament.ticketPrice,
        prizePercents: currentTournament.prizePercents,
        winnersRoot: winnersMap.getRoot(),
        prizePool: UInt64.from(0),
        sponsorContribution: totalPrizePool,
      });
      tournamentsMap.set(
        getTournamentKey(tournamentId),
        currentTournament.hash()
      );

      setSlot(32_000n);
      const adminBalanceBefore = Mina.getBalance(admin);

      tournamentWitness = tournamentsMap.getWitness(
        getTournamentKey(tournamentId)
      );

      txn = await Mina.transaction(admin, async () => {
        await app.recoverUnclaimed(
          tournamentId,
          currentTournament,
          tournamentWitness
        );
      });
      await txn.prove();
      await txn.sign([adminKey]).send();

      const adminBalanceAfter = Mina.getBalance(admin);
      // Pool was 0, so admin receives nothing.
      expect(adminBalanceAfter).toEqual(adminBalanceBefore);
    });
  });
});
