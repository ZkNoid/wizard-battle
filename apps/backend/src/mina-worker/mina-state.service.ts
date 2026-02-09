import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MerkleMap, Field, Poseidon, PublicKey, UInt32 } from 'o1js';
import { GameManager } from '../../../mina-contracts/src/GameManager';
import { GameLeaf, GameLeafDocument } from './schemas/game-leaf.schema';

/**
 * Game state stored in the local MerkleMap
 * Matches the GameLeaf structure in the smart contract
 */
export interface LocalGameState {
  gameId: number;
  status: 'pending' | 'started' | 'awaiting_challenge' | 'finalized_ok' | 'finalized_fraud';
  setupHash: string;
  resultHash?: string;
  challengeDeadlineSlot?: number;
  // Timestamps for tracking
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  finalizedAt?: number;
  // Transaction hashes
  startGameTxHash?: string;
  finishGameTxHash?: string;
}

// Contract fields
export interface ContractState {
  gameRoot: Field;
  challengeWindowSlots: UInt32;
  admin: string;
  balancesRoot: Field;
}

/**
 * Serialized witness data for transaction submission
 */
export interface SerializedWitness {
  // MerkleMapWitness can't be directly serialized, so we store path data
  isLefts: boolean[];
  siblings: string[]; // Field values as strings
}

/**
 * MinaStateService - Manages MerkleMap state for games
 *
 * Responsibilities:
 * - Maintains in-memory MerkleMap mirroring on-chain gamesRoot
 * - Generates witnesses for game state updates
 * - Persists state to MongoDB for crash recovery
 * - Handles state synchronization with chain
 *
 * IMPORTANT: This service must process updates sequentially to maintain
 * consistency between local state and on-chain state.
 */
@Injectable()
export class MinaStateService implements OnModuleInit {
  private readonly logger = new Logger(MinaStateService.name);

  // In-memory MerkleMap for games (mirrors on-chain gamesRoot)
  private gamesMap: MerkleMap;

  // Local game state cache (for quick lookups without deserializing from MerkleMap)
  private gameStates: Map<number, LocalGameState> = new Map();
  private awaitingFinalizationGames: Set<number> = new Set();
  
  private contractAddress: PublicKey;
  private contract: GameManager;
  private contractState: ContractState;

  private currentSlot: UInt32 | null = null;

  constructor(
    @InjectModel(GameLeaf.name) private gameLeafModel: Model<GameLeafDocument>,
  ) {
    // Initialize empty MerkleMap
    this.gamesMap = new MerkleMap();
    this.contractAddress = PublicKey.fromBase58(process.env.MINA_CONTRACT_ADDRESS!);
    this.contract = new GameManager(this.contractAddress!);
    this.contractState = this.loadContractState();
  }

  async onModuleInit() {
    this.logger.log('Initializing MinaStateService...');

    // Load persisted state from MongoDB on startup
    await this.loadPersistedState();

    // Load contract state
    this.contractState = await this.loadContractState();

    this.logger.log(`Initialized with root: ${this.contractState!.gameRoot.toString()}`);

    this.syncCurrentSlot();
  }

  /**
   * Get the current MerkleMap root
   */
  getRoot(): Field {
    return this.contractState.gameRoot;
  }

  /**
   * Get game state by ID
   */
  async getGameState(gameId: number): Promise<LocalGameState | null> {
    return this.gameStates.get(gameId) || null;
  }
  
  async getAwaitingFinalizationGames(): Promise<LocalGameState[]> {
    return Array.from(this.awaitingFinalizationGames).map(gameId => this.gameStates.get(gameId)!);
  }

  async addAwaitingFinalizationGame(gameId: number): Promise<void> {
    this.awaitingFinalizationGames.add(gameId);
  }

  async removeAwaitingFinalizationGame(gameId: number): Promise<void> {
    this.awaitingFinalizationGames.delete(gameId);
  }

  /**
   * Get witness for a new game slot (should be empty)
   */
  async getWitnessForNewGame(gameId: number): Promise<SerializedWitness> {
    // Verify slot is empty
    const currentValue = this.gamesMap.get(Field(gameId));
    if (!currentValue.equals(Field(0)).toBoolean()) {
      throw new Error(`Game slot ${gameId} is not empty`);
    }

    return this.getWitness(Field(gameId));
  }

  /**
   * Get witness for an existing game
   */
  async getWitnessForGame(gameId: number): Promise<SerializedWitness> {
    return this.getWitness(Field(gameId));
  }

  /**
   * Record that a game has been started on-chain
   * Updates local state to match on-chain state
   */
  async recordGameStarted(gameId: number, setupHash: string): Promise<void> {
    // Compute the leaf hash (matches GameLeaf.hash() in contract)
    // GameLeaf { status: Started, challengeDeadlineSlot: 0, setupHash, resultHash: 0, fraudHash: 0 }
    const leafHash = Poseidon.hash([
      Field(1), // GameStatus.Started
      Field(0), // challengeDeadlineSlot
      Field(setupHash),
      Field(0), // resultHash
      Field(0), // fraudHash
    ]);

    // Update MerkleMap
    this.gamesMap.set(Field(gameId), leafHash);
    this.contractState.gameRoot = this.gamesMap.getRoot();

    // Update local state cache
    const gameState: LocalGameState = {
      gameId,
      status: 'started',
      setupHash,
      createdAt: Date.now(),
      startedAt: Date.now(),
    };
    this.gameStates.set(gameId, gameState);

    // Persist state
    await this.persistState(gameId, gameState);

    this.logger.log(`Recorded game ${gameId} as started. New root: ${this.contractState.gameRoot.toString()}`);
  }

  /**
   * Record that a game has been finished on-chain (now in challenge window)
   */
  async recordGameFinished(gameId: number, resultHash: string, challengeDeadlineSlot: number): Promise<void> {
    const gameState = this.gameStates.get(gameId);
    if (!gameState) {
      throw new Error(`Game ${gameId} not found`);
    }

    // Compute the leaf hash for AwaitingChallenge state
    const leafHash = Poseidon.hash([
      Field(2), // GameStatus.AwaitingChallenge
      Field(challengeDeadlineSlot),
      Field(gameState.setupHash),
      Field(resultHash),
      Field(0), // fraudHash
    ]);

    // Update MerkleMap
    this.gamesMap.set(Field(gameId), leafHash);
    this.contractState.gameRoot = this.gamesMap.getRoot();

    // Update local state cache
    gameState.status = 'awaiting_challenge';
    gameState.resultHash = resultHash;
    gameState.challengeDeadlineSlot = challengeDeadlineSlot;
    gameState.finishedAt = Date.now();
    this.gameStates.set(gameId, gameState);

    // Persist state
    await this.persistState(gameId, gameState);

    // Add game to awaiting finalization games
    await this.addAwaitingFinalizationGame(gameId);

    this.logger.log(`Recorded game ${gameId} as finished. New root: ${this.contractState.gameRoot.toString()}`);
  }

  /**
   * Record that a game has been finalized
   */
  async recordGameFinalized(gameId: number, isFraud: boolean): Promise<void> {
    const gameState = this.gameStates.get(gameId);
    if (!gameState) {
      throw new Error(`Game ${gameId} not found`);
    }

    // Compute the leaf hash for finalized state
    const status = isFraud ? Field(4) : Field(3); // FinalizedFraud : FinalizedOk
    const leafHash = Poseidon.hash([
      status,
      Field(0), // challengeDeadlineSlot cleared
      Field(gameState.setupHash),
      isFraud ? Field(0) : Field(gameState.resultHash || '0'),
      Field(0), // fraudHash (would be set if fraud)
    ]);

    // Update MerkleMap
    this.gamesMap.set(Field(gameId), leafHash);
    this.contractState.gameRoot = this.gamesMap.getRoot();

    // Update local state cache
    gameState.status = isFraud ? 'finalized_fraud' : 'finalized_ok';
    gameState.finalizedAt = Date.now();
    this.gameStates.set(gameId, gameState);

    // Persist state
    await this.persistState(gameId, gameState);

    // Remove game from awaiting finalization games
    await this.removeAwaitingFinalizationGame(gameId);

    this.logger.log(`Recorded game ${gameId} as finalized (fraud: ${isFraud}). New root: ${this.contractState.gameRoot.toString()}`);
  }

  /**
   * Synchronize state with on-chain data
   * Called when we detect our local state might be out of sync
   */
  async syncWithChain(onChainRoot: Field): Promise<boolean> {
    if (this.contractState.gameRoot.equals(onChainRoot).toBoolean()) {
      return true; // Already in sync
    }

    this.logger.warn(
      `State out of sync! Local: ${this.contractState.gameRoot.toString()}, Chain: ${onChainRoot.toString()}`,
    );

    // TODO: Implement recovery logic
    // Options:
    // 1. Rebuild state from chain events
    // 2. Fetch all game states from chain
    // 3. Mark worker as unhealthy until manual intervention

    return false;
  }

  // ============ Private helpers ============


  /**
   * Get witness for a MerkleMap key
   */
  private getWitness(key: Field): SerializedWitness {
    const witness = this.gamesMap.getWitness(key);

    // Serialize the witness for transmission
    // MerkleMapWitness contains isLefts and siblings arrays
    const isLefts: boolean[] = [];
    const siblings: string[] = [];

    // Access internal witness data
    // Note: This depends on o1js internals and may need adjustment
    const witnessData = witness.toJSON() as any;

    // The witness structure in o1js is a MerkleTree witness
    // We need to extract the path information
    if (witnessData && witnessData.path) {
      for (const node of witnessData.path) {
        isLefts.push(node.isLeft);
        siblings.push(node.sibling.toString());
      }
    }

    return { isLefts, siblings };
  }

  /**
   * Load persisted state from storage on startup
   */
  private async loadPersistedState(): Promise<void> {
    this.logger.log('Loading persisted state from MongoDB...');

    const gameLeaves = await this.gameLeafModel.find().exec();

    for (const leaf of gameLeaves) {
      // Reconstruct the leaf hash
      const leafHash = Poseidon.hash([
        Field(leaf.status),
        Field(leaf.challengeDeadlineSlot),
        Field(leaf.setupHash),
        Field(leaf.resultHash),
        Field(leaf.fraudHash),
      ]);

      // Restore MerkleMap entry
      this.gamesMap.set(Field(leaf.gameId), leafHash);

      // Restore local state cache
      const gameState: LocalGameState = {
        gameId: leaf.gameId,
        status: this.statusNumberToString(leaf.status),
        setupHash: leaf.setupHash,
        resultHash: leaf.resultHash !== '0' ? leaf.resultHash : undefined,
        challengeDeadlineSlot: leaf.challengeDeadlineSlot || undefined,
        createdAt: (leaf as any).createdAt?.getTime() || Date.now(),
      };
      this.gameStates.set(leaf.gameId, gameState);

      // If game is awaiting challenge, add to awaiting finalization set
      if (leaf.status === 2) {
        this.awaitingFinalizationGames.add(leaf.gameId);
      }
    }

    this.logger.log(`Loaded ${gameLeaves.length} game leaves from MongoDB`);
  }

  /**
   * Convert status number to status string
   */
  private statusNumberToString(status: number): LocalGameState['status'] {
    switch (status) {
      case 0:
        return 'pending';
      case 1:
        return 'started';
      case 2:
        return 'awaiting_challenge';
      case 3:
        return 'finalized_ok';
      case 4:
        return 'finalized_fraud';
      default:
        return 'pending';
    }
  }

  /**
   * Convert status string to status number
   */
  private statusStringToNumber(status: LocalGameState['status']): number {
    switch (status) {
      case 'pending':
        return 0;
      case 'started':
        return 1;
      case 'awaiting_challenge':
        return 2;
      case 'finalized_ok':
        return 3;
      case 'finalized_fraud':
        return 4;
      default:
        return 0;
    }
  }

  /**
   * Persist state to storage
   */
  private async persistState(gameId: number, state: LocalGameState): Promise<void> {
    const gameLeafData = {
      gameId,
      status: this.statusStringToNumber(state.status),
      challengeDeadlineSlot: state.challengeDeadlineSlot || 0,
      setupHash: state.setupHash,
      resultHash: state.resultHash || '0',
      fraudHash: '0', // Set when fraud is proven
    };

    await this.gameLeafModel.findOneAndUpdate(
      { gameId },
      gameLeafData,
      { upsert: true, new: true },
    );

    this.logger.debug(`Persisted state for game ${gameId}`);
  }

  /**
   * Load contract state from storage
   */
  private loadContractState(): ContractState {
    return {
      gameRoot: this.contract.gamesRoot.get(),
      challengeWindowSlots: this.contract.challengeWindowSlots.get(),
      admin: this.contract.admin.get().toBase58(),
      balancesRoot: this.contract.balancesRoot.get(),
    };
  }

  private syncCurrentSlot(): void {
    const slot = this.contract.network.globalSlotSinceGenesis.get();
    this.currentSlot = slot;
  }

  getCurrentSlot(): UInt32 | null {
    return this.currentSlot;
  }

  /**
   * Compute the challenge deadline slot based on current slot + challenge window
   */
  computeChallengeDeadlineSlot(): number {
    if (!this.currentSlot) {
      throw new Error('Current slot not initialized');
    }
    const currentSlotNumber = Number(this.currentSlot.toBigint());
    const challengeWindow = Number(this.contractState.challengeWindowSlots.toBigint());
    return currentSlotNumber + challengeWindow;
  }
}

