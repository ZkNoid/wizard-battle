import {
  AccountUpdate,
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

import {
  TournamentManager,
  TournamentConfig,
  TournamentLeaf,
  TournamentStatus,
  WinnerLeaf,
} from './TournamentManager';

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

    await TournamentManager.compile();
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
      const config = new TournamentConfig({
        ticketPrice: UInt64.from(1_000_000_000), // 1 MINA
        prize1Percent: UInt32.from(5000), // 50%
        prize2Percent: UInt32.from(3000), // 30%
        prize3Percent: UInt32.from(2000), // 20%
      });

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

      const newTournament = new TournamentLeaf({
        status: TournamentStatus.Battle,
        battleStartSlot: UInt32.from(11_000),
        battleEndSlot: UInt32.from(12_000),
        ticketPrice: config.ticketPrice,
        prize1Percent: config.prize1Percent,
        prize2Percent: config.prize2Percent,
        prize3Percent: config.prize3Percent,
        participantsRoot: new MerkleMap().getRoot(),
        winnersRoot: new MerkleMap().getRoot(),
        prizePool: UInt64.from(0),
        participantCount: UInt32.from(0),
      });
      tournamentsMap.set(getTournamentKey(tournamentId), newTournament.hash());

      expect(app.tournamentsRoot.get()).toEqual(tournamentsMap.getRoot());
    });

    test('prize distribution must sum to 100%', async () => {
      const tournamentId = Field(1);
      const invalidConfig = new TournamentConfig({
        ticketPrice: UInt64.from(1_000_000_000),
        prize1Percent: UInt32.from(5000),
        prize2Percent: UInt32.from(3000),
        prize3Percent: UInt32.from(1000), // Total: 90%, not 100%
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

      const config = new TournamentConfig({
        ticketPrice: UInt64.from(1_000_000_000), // 1 MINA
        prize1Percent: UInt32.from(5000),
        prize2Percent: UInt32.from(3000),
        prize3Percent: UInt32.from(2000),
      });

      currentTournament = new TournamentLeaf({
        status: TournamentStatus.Battle,
        battleStartSlot: UInt32.from(11_000),
        battleEndSlot: UInt32.from(12_000),
        ticketPrice: config.ticketPrice,
        prize1Percent: config.prize1Percent,
        prize2Percent: config.prize2Percent,
        prize3Percent: config.prize3Percent,
        participantsRoot: participantsMap.getRoot(),
        winnersRoot: new MerkleMap().getRoot(),
        prizePool: UInt64.from(0),
        participantCount: UInt32.from(0),
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

      const updatedTournament = new TournamentLeaf({
        status: TournamentStatus.Battle,
        battleStartSlot: currentTournament.battleStartSlot,
        battleEndSlot: currentTournament.battleEndSlot,
        ticketPrice: currentTournament.ticketPrice,
        prize1Percent: currentTournament.prize1Percent,
        prize2Percent: currentTournament.prize2Percent,
        prize3Percent: currentTournament.prize3Percent,
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

      const updatedTournament = new TournamentLeaf({
        status: TournamentStatus.Battle,
        battleStartSlot: currentTournament.battleStartSlot,
        battleEndSlot: currentTournament.battleEndSlot,
        ticketPrice: currentTournament.ticketPrice,
        prize1Percent: currentTournament.prize1Percent,
        prize2Percent: currentTournament.prize2Percent,
        prize3Percent: currentTournament.prize3Percent,
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
      const config = new TournamentConfig({
        ticketPrice,
        prize1Percent: UInt32.from(5000),
        prize2Percent: UInt32.from(3000),
        prize3Percent: UInt32.from(2000),
      });

      currentTournament = new TournamentLeaf({
        status: TournamentStatus.Battle,
        battleStartSlot: UInt32.from(11_000),
        battleEndSlot: UInt32.from(12_000),
        ticketPrice: config.ticketPrice,
        prize1Percent: config.prize1Percent,
        prize2Percent: config.prize2Percent,
        prize3Percent: config.prize3Percent,
        participantsRoot: participantsMap.getRoot(),
        winnersRoot: winnersMap.getRoot(),
        prizePool: UInt64.from(0),
        participantCount: UInt32.from(0),
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

        currentTournament = new TournamentLeaf({
          status: TournamentStatus.Battle,
          battleStartSlot: currentTournament.battleStartSlot,
          battleEndSlot: currentTournament.battleEndSlot,
          ticketPrice: currentTournament.ticketPrice,
          prize1Percent: currentTournament.prize1Percent,
          prize2Percent: currentTournament.prize2Percent,
          prize3Percent: currentTournament.prize3Percent,
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
          player1,
          player2,
          player3,
          prize1,
          prize2,
          prize3,
          winnersMap.getRoot()
        );
      });
      await txn.prove();
      await txn.sign([adminKey]).send();

      const finalizedTournament = new TournamentLeaf({
        status: TournamentStatus.Claiming,
        battleStartSlot: currentTournament.battleStartSlot,
        battleEndSlot: currentTournament.battleEndSlot,
        ticketPrice: currentTournament.ticketPrice,
        prize1Percent: currentTournament.prize1Percent,
        prize2Percent: currentTournament.prize2Percent,
        prize3Percent: currentTournament.prize3Percent,
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
          player1,
          player2,
          player3,
          prize1,
          prize2,
          prize3,
          winnersMap.getRoot()
        );
      });
      await txn.prove();
      await txn.sign([adminKey]).send();

      currentTournament = new TournamentLeaf({
        status: TournamentStatus.Claiming,
        battleStartSlot: currentTournament.battleStartSlot,
        battleEndSlot: currentTournament.battleEndSlot,
        ticketPrice: currentTournament.ticketPrice,
        prize1Percent: currentTournament.prize1Percent,
        prize2Percent: currentTournament.prize2Percent,
        prize3Percent: currentTournament.prize3Percent,
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
          player1,
          player2,
          player3,
          prize1,
          prize2,
          prize3,
          winnersMap.getRoot()
        );
      });
      await txn.prove();
      await txn.sign([adminKey]).send();

      currentTournament = new TournamentLeaf({
        status: TournamentStatus.Claiming,
        battleStartSlot: currentTournament.battleStartSlot,
        battleEndSlot: currentTournament.battleEndSlot,
        ticketPrice: currentTournament.ticketPrice,
        prize1Percent: currentTournament.prize1Percent,
        prize2Percent: currentTournament.prize2Percent,
        prize3Percent: currentTournament.prize3Percent,
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

      currentTournament = new TournamentLeaf({
        status: TournamentStatus.Claiming,
        battleStartSlot: currentTournament.battleStartSlot,
        battleEndSlot: currentTournament.battleEndSlot,
        ticketPrice: currentTournament.ticketPrice,
        prize1Percent: currentTournament.prize1Percent,
        prize2Percent: currentTournament.prize2Percent,
        prize3Percent: currentTournament.prize3Percent,
        participantsRoot: currentTournament.participantsRoot,
        winnersRoot: winnersMap.getRoot(),
        prizePool: currentTournament.prizePool,
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
});
