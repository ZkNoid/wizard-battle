import {
  AccountUpdate,
  Mina,
  PrivateKey,
  PublicKey,
  UInt64,
  MerkleMap,
  Field,
  Poseidon,
} from 'o1js';
import { Vault } from './Vault';

/*
 * Tests for the Vault smart contract
 */

let proofsEnabled = false;

describe('Vault', () => {
  let deployerAccount: Mina.TestPublicKey,
    deployerKey: PrivateKey,
    senderAccount: Mina.TestPublicKey,
    senderKey: PrivateKey,
    recipientAccount: Mina.TestPublicKey,
    recipientKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: Vault,
    balancesMap: MerkleMap;

  beforeAll(async () => {
    if (proofsEnabled) await Vault.compile();
  });

  beforeEach(async () => {
    const Local = await Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    [deployerAccount, senderAccount, recipientAccount] = Local.testAccounts;
    deployerKey = deployerAccount.key;
    senderKey = senderAccount.key;
    recipientKey = recipientAccount.key;

    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new Vault(zkAppAddress);
    balancesMap = new MerkleMap();
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, async () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      await zkApp.deploy();
    });
    await txn.prove();
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  }

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

  it('generates and deploys the Vault smart contract', async () => {
    await localDeploy();
    const root = zkApp.balancesRoot.get();
    expect(root).toEqual(balancesMap.getRoot());
  });

  it('correctly handles deposit into the vault', async () => {
    await localDeploy();

    const depositAmount = UInt64.from(1_000_000_000); // 1 MINA
    const oldBal = UInt64.from(0);
    const witness = balancesMap.getWitness(getUserKey(senderAccount));

    // Get initial zkApp balance
    const initialZkAppBalance = Mina.getBalance(zkAppAddress);

    // Deposit transaction
    // Note: this.balance.addInPlace() requires zkApp balance to increase,
    // but we need to balance it with a payment from someone
    const txn = await Mina.transaction(senderAccount, async () => {
      const pay = AccountUpdate.createSigned(senderAccount);
      pay.balance.subInPlace(depositAmount);
      await zkApp.deposit(senderAccount, depositAmount, oldBal, witness);
    });
    await txn.prove();
    await txn.sign([senderKey]).send();

    // Update our local map
    setBalance(senderAccount, depositAmount);

    // Verify state
    const updatedRoot = zkApp.balancesRoot.get();
    expect(updatedRoot).toEqual(balancesMap.getRoot());

    // Verify zkApp received the funds
    const finalZkAppBalance = Mina.getBalance(zkAppAddress);
    expect(finalZkAppBalance).toEqual(initialZkAppBalance.add(depositAmount));
  });

  it('correctly handles withdrawal from the vault', async () => {
    await localDeploy();

    const depositAmount = UInt64.from(2_000_000_000); // 2 MINA
    const withdrawAmount = UInt64.from(500_000_000); // 0.5 MINA

    // First deposit
    let witness = balancesMap.getWitness(getUserKey(senderAccount));
    const depositTxn = await Mina.transaction(senderAccount, async () => {
      const pay = AccountUpdate.createSigned(senderAccount);
      pay.balance.subInPlace(depositAmount);
      await zkApp.deposit(
        senderAccount,
        depositAmount,
        UInt64.from(0),
        witness
      );
    });
    await depositTxn.prove();
    await depositTxn.sign([senderKey]).send();
    setBalance(senderAccount, depositAmount);

    // Get sender's balance before withdrawal
    const senderBalanceBefore = Mina.getBalance(senderAccount);

    // Then withdraw
    witness = balancesMap.getWitness(getUserKey(senderAccount));
    const withdrawTxn = await Mina.transaction(senderAccount, async () => {
      await zkApp.withdraw(
        senderAccount,
        withdrawAmount,
        depositAmount,
        witness
      );
    });
    await withdrawTxn.prove();
    await withdrawTxn.sign([senderKey]).send();
    setBalance(senderAccount, depositAmount.sub(withdrawAmount));

    // Verify state
    const finalRoot = zkApp.balancesRoot.get();
    expect(finalRoot).toEqual(balancesMap.getRoot());

    // Verify sender received the funds (accounting for transaction fee)
    const senderBalanceAfter = Mina.getBalance(senderAccount);
    expect(senderBalanceAfter.toBigInt()).toBeGreaterThan(
      senderBalanceBefore.toBigInt()
    );
  });

  it('correctly handles multiple deposits from different accounts', async () => {
    await localDeploy();

    const deposit1 = UInt64.from(1_000_000_000); // 1 MINA
    const deposit2 = UInt64.from(500_000_000); // 0.5 MINA

    // First user deposits
    let witness1 = balancesMap.getWitness(getUserKey(senderAccount));
    const txn1 = await Mina.transaction(senderAccount, async () => {
      const pay = AccountUpdate.createSigned(senderAccount);
      pay.balance.subInPlace(deposit1);
      await zkApp.deposit(senderAccount, deposit1, UInt64.from(0), witness1);
    });
    await txn1.prove();
    await txn1.sign([senderKey]).send();
    setBalance(senderAccount, deposit1);

    // Second user deposits
    let witness2 = balancesMap.getWitness(getUserKey(recipientAccount));
    const txn2 = await Mina.transaction(recipientAccount, async () => {
      const pay = AccountUpdate.createSigned(recipientAccount);
      pay.balance.subInPlace(deposit2);
      await zkApp.deposit(recipientAccount, deposit2, UInt64.from(0), witness2);
    });
    await txn2.prove();
    await txn2.sign([recipientKey]).send();
    setBalance(recipientAccount, deposit2);

    // Verify state
    const finalRoot = zkApp.balancesRoot.get();
    expect(finalRoot).toEqual(balancesMap.getRoot());

    // Verify total balance
    const totalBalance = Mina.getBalance(zkAppAddress);
    expect(totalBalance).toEqual(deposit1.add(deposit2));
  });

  it('prevents withdrawal of more than deposited', async () => {
    await localDeploy();

    const depositAmount = UInt64.from(1_000_000_000); // 1 MINA
    const withdrawAmount = UInt64.from(2_000_000_000); // 2 MINA (more than deposited)

    // First deposit
    let witness = balancesMap.getWitness(getUserKey(senderAccount));
    const depositTxn = await Mina.transaction(senderAccount, async () => {
      const pay = AccountUpdate.createSigned(senderAccount);
      pay.balance.subInPlace(depositAmount);
      await zkApp.deposit(
        senderAccount,
        depositAmount,
        UInt64.from(0),
        witness
      );
    });
    await depositTxn.prove();
    await depositTxn.sign([senderKey]).send();
    setBalance(senderAccount, depositAmount);

    // Try to withdraw more than deposited
    witness = balancesMap.getWitness(getUserKey(senderAccount));
    await expect(async () => {
      const withdrawTxn = await Mina.transaction(senderAccount, async () => {
        await zkApp.withdraw(
          senderAccount,
          withdrawAmount,
          depositAmount,
          witness
        );
      });
      await withdrawTxn.prove();
      await withdrawTxn.sign([senderKey]).send();
    }).rejects.toThrow();
  });
});
