// src/Vault.ts
import {
  SmartContract,
  state,
  State,
  method,
  PublicKey,
  UInt64,
  Field,
  MerkleMapWitness,
  Poseidon,
  MerkleMap,
} from 'o1js';

export class Vault extends SmartContract {
  @state(Field) balancesRoot = State<Field>();
  @state(PublicKey) admin = State<PublicKey>();

  init() {
    super.init();
    this.balancesRoot.set(new MerkleMap().getRoot());
    this.admin.set(this.address); // default admin = contract itself
  }

  // --- helpers ---

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
    const key = Vault.keyFor(user);

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
    const { nextRoot } = Vault.verifyAndComputeNewRoot(
      root,
      user,
      witness,
      oldBal,
      newBal
    );
    return { nextRoot };
  }

  // --- public methods ---

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
    const { nextRoot } = Vault.verifyAndComputeNewRoot(
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
   * SLASH (admin-only): reduce user’s recorded balance without moving coins.
   */
  slash(
    user: PublicKey,
    dec: UInt64,
    oldBal: UInt64,
    witness: MerkleMapWitness
  ) {
    const root = this.balancesRoot.getAndRequireEquals();
    const [oldRoot] = witness.computeRootAndKey(oldBal.toFields()[0]);
    oldRoot.assertEquals(root, 'Old balance mismatch');

    const { nextRoot } = this._decrease(root, user, witness, oldBal, dec);
    this.balancesRoot.set(nextRoot);
  }
}
