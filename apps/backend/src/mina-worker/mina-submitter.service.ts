import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  Mina,
  PrivateKey,
  PublicKey,
  Field,
  fetchAccount,
  MerkleMapWitness,
  UInt32,
} from 'o1js';
import { SerializedWitness } from './mina-state.service';

/**
 * MinaSubmitterService - Submits transactions to Mina network
 *
 * Handles:
 * - Connection to Mina network (devnet/mainnet)
 * - Admin key management for signing transactions
 * - Transaction submission and confirmation tracking
 * - Proof compilation (cached for performance)
 */
@Injectable()
export class MinaSubmitterService implements OnModuleInit {
  private readonly logger = new Logger(MinaSubmitterService.name);

  // Admin key for signing transactions (loaded from env)
  private adminPrivateKey: PrivateKey | null = null;
  private adminPublicKey: PublicKey | null = null;

  // Contract address
  private contractAddress: PublicKey | null = null;

  // Compiled contract (lazy loaded)
  private isContractCompiled = false;

  async onModuleInit() {
    this.logger.log('Initializing MinaSubmitterService...');

    // Configure Mina network
    const networkUrl = process.env.MINA_NETWORK_URL;
    if (!networkUrl) {
      this.logger.warn('MINA_NETWORK_URL not set, using local devnet');
      // For local development
      const Local = await Mina.LocalBlockchain({ proofsEnabled: false });
      Mina.setActiveInstance(Local);
    } else {
      // For devnet/mainnet
      const network = Mina.Network(networkUrl);
      Mina.setActiveInstance(network);
      this.logger.log(`Connected to Mina network: ${networkUrl}`);
    }

    // Load admin key
    const adminKeyBase58 = process.env.MINA_ADMIN_PRIVATE_KEY;
    if (adminKeyBase58) {
      try {
        this.adminPrivateKey = PrivateKey.fromBase58(adminKeyBase58);
        this.adminPublicKey = this.adminPrivateKey.toPublicKey();
        this.logger.log(`Admin key loaded: ${this.adminPublicKey.toBase58()}`);
      } catch (error) {
        this.logger.error('Failed to load admin private key:', error);
      }
    } else {
      this.logger.warn('MINA_ADMIN_PRIVATE_KEY not set, submissions will fail');
    }

    // Load contract address
    const contractAddressBase58 = process.env.MINA_CONTRACT_ADDRESS;
    if (contractAddressBase58) {
      try {
        this.contractAddress = PublicKey.fromBase58(contractAddressBase58);
        this.logger.log(`Contract address: ${this.contractAddress.toBase58()}`);
      } catch (error) {
        this.logger.error('Failed to parse contract address:', error);
      }
    } else {
      this.logger.warn('MINA_CONTRACT_ADDRESS not set');
    }
  }

  /**
   * Submit startGame transaction to Mina
   * Calls GameManager.startGame(gameId, setupHash, witness)
   */
  async submitStartGame(
    gameId: number,
    setupHash: string,
    witness: SerializedWitness,
  ): Promise<string> {
    this.assertReady();

    this.logger.log(`Submitting startGame for ${gameId}...`);

    try {
      // Ensure contract is compiled
      await this.ensureContractCompiled();

      // Fetch the account state
      await fetchAccount({ publicKey: this.contractAddress! });
      await fetchAccount({ publicKey: this.adminPublicKey! });

      // Convert gameId to Field
      const gameIdField = Field(gameId);

      // Convert setupHash to Field
      const setupHashField = Field(setupHash);

      // Reconstruct MerkleMapWitness from serialized data
      const merkleWitness = this.deserializeWitness(witness);

      // Import and instantiate the contract
      const { GameManager } = await import(
        '../../../mina-contracts/src/GameManager.js'
      );
      const contract = new GameManager(this.contractAddress!);

      // Create transaction
      const tx = await Mina.transaction(
        { sender: this.adminPublicKey!, fee: 100_000_000 }, // 0.1 MINA fee
        async () => {
          await contract.startGame(gameIdField, setupHashField, merkleWitness);
        },
      );

      // Generate proof
      this.logger.log('Generating proof for startGame...');
      await tx.prove();

      // Sign and send
      tx.sign([this.adminPrivateKey!]);
      const pendingTx = await tx.send();

      this.logger.log(`Transaction sent: ${pendingTx.hash}`);

      // Wait for confirmation (optional, can be done asynchronously)
      // await pendingTx.wait();

      return pendingTx.hash;
    } catch (error) {
      this.logger.error('Failed to submit startGame:', error);
      throw error;
    }
  }

  /**
   * Submit finishGame transaction to Mina
   * Calls GameManager.finishGame(gameId, resultHash, witness, prevStatus, prevSetupHash)
   */
  async submitFinishGame(
    gameId: number,
    resultHash: string,
    witness: SerializedWitness,
    prevSetupHash: string,
  ): Promise<string> {
    this.assertReady();

    this.logger.log(`Submitting finishGame for ${gameId}...`);

    try {
      // Ensure contract is compiled
      await this.ensureContractCompiled();

      // Fetch the account state
      await fetchAccount({ publicKey: this.contractAddress! });
      await fetchAccount({ publicKey: this.adminPublicKey! });

      // Convert parameters to Fields
      const gameIdField = Field(gameId);
      const resultHashField = Field(resultHash);
      const prevSetupHashField = Field(prevSetupHash);

      // Reconstruct MerkleMapWitness
      const merkleWitness = this.deserializeWitness(witness);

      // Import and instantiate the contract
      const { GameManager } = await import(
        '../../../mina-contracts/src/GameManager.js'
      );
      const contract = new GameManager(this.contractAddress!);

      // Create transaction
      const tx = await Mina.transaction(
        { sender: this.adminPublicKey!, fee: 100_000_000 },
        async () => {
          await contract.finishGame(
            gameIdField,
            resultHashField,
            merkleWitness,
            UInt32.from(1), // prevStatus = Started
            prevSetupHashField,
          );
        },
      );

      // Generate proof
      this.logger.log('Generating proof for finishGame...');
      await tx.prove();

      // Sign and send
      tx.sign([this.adminPrivateKey!]);
      const pendingTx = await tx.send();

      this.logger.log(`Transaction sent: ${pendingTx.hash}`);

      return pendingTx.hash;
    } catch (error) {
      this.logger.error('Failed to submit finishGame:', error);
      throw error;
    }
  }

  /**
   * Get current on-chain games root for state synchronization
   */
  async getOnChainGamesRoot(): Promise<Field> {
    this.assertReady();

    await fetchAccount({ publicKey: this.contractAddress! });

    const { GameManager } = await import(
      '../../../mina-contracts/src/GameManager.js'
    );
    const contract = new GameManager(this.contractAddress!);

    return contract.gamesRoot.get();
  }

  // ============ Private helpers ============

  /**
   * Ensure admin key and contract address are configured
   */
  private assertReady(): void {
    if (!this.adminPrivateKey || !this.adminPublicKey) {
      throw new Error('Admin key not configured');
    }
    if (!this.contractAddress) {
      throw new Error('Contract address not configured');
    }
  }

  /**
   * Compile the contract if not already done
   * This is expensive (~1-2 minutes) so we cache it
   */
  private async ensureContractCompiled(): Promise<void> {
    if (this.isContractCompiled) {
      return;
    }

    this.logger.log('Compiling GameManager contract...');
    const startTime = Date.now();

    const { GameManager } = await import(
      '../../../mina-contracts/src/GameManager.js'
    );
    await GameManager.compile();

    const duration = Date.now() - startTime;
    this.logger.log(`Contract compiled in ${duration}ms`);

    this.isContractCompiled = true;
  }


  /**
   * Deserialize witness from serialized format
   * Note: This is a simplified implementation - the actual deserialization
   * depends on o1js internals
   */
  private deserializeWitness(serialized: SerializedWitness): MerkleMapWitness {
    // TODO: Implement proper deserialization
    // For now, we need to reconstruct the MerkleMapWitness from path data
    // This requires understanding o1js internals

    // Placeholder - in production, you'd reconstruct from isLefts and siblings
    throw new Error(
      'MerkleMapWitness deserialization not yet implemented. ' +
        'The witness should be generated fresh from MinaStateService.',
    );
  }
}

