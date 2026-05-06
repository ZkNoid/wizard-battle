import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Mina, PublicKey, fetchAccount, Field } from 'o1js';

export interface MinaNetworkConfig {
  networkUrl: string;
  archiveUrl?: string;
}

export interface AccountState {
  balance: bigint;
  nonce: number;
  zkappState?: Field[];
}

export interface TransactionResult {
  hash: string;
  status: 'pending' | 'included' | 'failed';
}

@Injectable()
export class MinaClientService implements OnModuleInit {
  private readonly logger = new Logger(MinaClientService.name);
  private network: ReturnType<typeof Mina.Network> | null = null;
  private contractAddress: PublicKey | null = null;

  async onModuleInit() {
    await this.connect();
  }

  async connect(): Promise<void> {
    const networkUrl =
      process.env.MINA_GRAPHQL_URL ||
      'https://api.minascan.io/node/devnet/v1/graphql';

    this.logger.log(`Connecting to Mina network: ${networkUrl}`);

    try {
      this.network = Mina.Network({
        mina: networkUrl,
        archive:
          process.env.MINA_ARCHIVE_URL ||
          'https://api.minascan.io/archive/devnet/v1/graphql',
      });
      Mina.setActiveInstance(this.network);

      const contractAddressStr = process.env.TOURNAMENT_CONTRACT_ADDRESS;
      if (contractAddressStr) {
        this.contractAddress = PublicKey.fromBase58(contractAddressStr);
        this.logger.log(
          `Tournament contract address: ${this.contractAddress.toBase58()}`
        );
      } else {
        this.logger.warn(
          'TOURNAMENT_CONTRACT_ADDRESS not set - contract interactions will fail'
        );
      }

      this.logger.log('Connected to Mina network');
    } catch (error) {
      this.logger.error('Failed to connect to Mina network', error);
      throw error;
    }
  }

  getContractAddress(): PublicKey {
    if (!this.contractAddress) {
      throw new Error('Contract address not configured');
    }
    return this.contractAddress;
  }

  async getCurrentSlot(): Promise<number> {
    try {
      const networkState = await this.fetchNetworkState();
      return Number(networkState.globalSlotSinceGenesis);
    } catch (error) {
      this.logger.error('Failed to get current slot', error);
      throw error;
    }
  }

  async fetchNetworkState(): Promise<{
    blockchainLength: bigint;
    globalSlotSinceGenesis: bigint;
    minWindowDensity: bigint;
  }> {
    const graphqlUrl =
      process.env.MINA_GRAPHQL_URL ||
      'https://api.minascan.io/node/devnet/v1/graphql';

    const response = await fetch(graphqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{
          bestChain(maxLength: 1) {
            protocolState {
              consensusState {
                blockHeight
                slotSinceGenesis
                minWindowDensity
              }
            }
          }
        }`,
      }),
    });

    const data = await response.json();
    const block = data?.data?.bestChain?.[0];
    if (!block) {
      throw new Error('Failed to fetch network state from GraphQL endpoint');
    }

    const { consensusState, blockchainState } = block.protocolState;
    return {
      blockchainLength: BigInt(consensusState.blockHeight),
      globalSlotSinceGenesis: BigInt(consensusState.slotSinceGenesis),
      minWindowDensity: BigInt(consensusState.minWindowDensity),
    };
  }

  async fetchAccount(address: PublicKey): Promise<AccountState | null> {
    try {
      const result = await fetchAccount({ publicKey: address });
      if (result.account) {
        return {
          balance: result.account.balance.toBigInt(),
          nonce: Number(result.account.nonce.toBigint()),
          zkappState: result.account.zkapp?.appState,
        };
      }
      return null;
    } catch (error) {
      this.logger.error(`Failed to fetch account ${address.toBase58()}`, error);
      return null;
    }
  }

  async fetchContractState(): Promise<{
    tournamentsRoot: Field;
    admin: PublicKey;
    platformFeePercent: number;
    gameManagerAddress: PublicKey;
  } | null> {
    if (!this.contractAddress) {
      throw new Error('Contract address not configured');
    }

    const account = await this.fetchAccount(this.contractAddress);
    if (!account || !account.zkappState) {
      return null;
    }

    const [
      tournamentsRoot,
      adminX,
      adminIsOdd,
      platformFeePercent,
      gmX,
      gmIsOdd,
    ] = account.zkappState;

    if (
      !tournamentsRoot ||
      !adminX ||
      !adminIsOdd ||
      !platformFeePercent ||
      !gmX ||
      !gmIsOdd
    ) {
      throw new Error('Invalid contract state');
    }

    return {
      tournamentsRoot,
      admin: PublicKey.fromFields([adminX, adminIsOdd]),
      platformFeePercent: Number(platformFeePercent.toBigInt()),
      gameManagerAddress: PublicKey.fromFields([gmX, gmIsOdd]),
    };
  }

  async submitTransaction(signedTxJson: string): Promise<TransactionResult> {
    try {
      const parsed: unknown = JSON.parse(signedTxJson);
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error(
          'signedTxJson must be JSON text of a zkApp command object (not a JSON string, array, or primitive)'
        );
      }
      const tx = Mina.Transaction.fromJSON(parsed['zkappCommand']);
      const pendingTx = await tx.send();

      this.logger.log(`Transaction submitted: ${pendingTx.hash}`);

      return {
        hash: pendingTx.hash,
        status: 'pending',
      };
    } catch (error) {
      this.logger.error('Failed to submit transaction', error);
      throw error;
    }
  }

  async waitForTransaction(
    txHash: string,
    timeoutMs: number = 60000
  ): Promise<TransactionResult> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const status = await this.getTransactionStatus(txHash);
        if (status === 'included') {
          return { hash: txHash, status: 'included' };
        }
        if (status === 'failed') {
          return { hash: txHash, status: 'failed' };
        }
      } catch {
        // Continue polling
      }
      await this.sleep(5000);
    }

    this.logger.warn(`Transaction ${txHash} timed out after ${timeoutMs}ms`);
    return { hash: txHash, status: 'pending' };
  }

  async getTransactionStatus(
    txHash: string,
    blockLength: number = 40
  ): Promise<'pending' | 'included' | 'failed' | 'unknown'> {
    const graphqlUrl =
      process.env.MINA_GRAPHQL_URL ||
      'https://api.minascan.io/node/devnet/v1/graphql';

    // Mirrors o1js checkZkappTransaction() — scans bestChain blocks for the
    // hash instead of using transactionStatus(), which expects the full encoded
    // zkapp command rather than just a hash and returns "address is invalid".
    try {
      const response = await fetch(graphqlUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `{
            bestChain(maxLength: ${blockLength}) {
              transactions {
                zkappCommands {
                  hash
                  failureReason {
                    failures
                    index
                  }
                }
              }
            }
          }`,
        }),
      });

      if (!response.ok) {
        this.logger.warn(
          `GraphQL endpoint returned HTTP ${response.status} for tx ${txHash}`
        );
        return 'pending';
      }

      const data = await response.json();

      if (data?.errors?.length) {
        this.logger.warn(
          `GraphQL errors while scanning bestChain for tx ${txHash}: ${JSON.stringify(data.errors)}`
        );
        return 'pending';
      }

      const bestChain: Array<{
        transactions: {
          zkappCommands: Array<{
            hash: string;
            failureReason: Array<{ failures: string[]; index: number }> | null;
          }>;
        };
      }> = data?.data?.bestChain ?? [];

      for (const block of bestChain) {
        for (const cmd of block.transactions.zkappCommands) {
          if (cmd.hash === txHash) {
            if (cmd.failureReason !== null && cmd.failureReason.length > 0) {
              this.logger.warn(
                `Transaction ${txHash} failed: ${JSON.stringify(cmd.failureReason)}`
              );
              return 'failed';
            }
            return 'included';
          }
        }
      }

      // Not found in the last blockLength blocks — still pending (or unknown)
      return 'pending';
    } catch (error) {
      this.logger.error(
        `Failed to get transaction status for ${txHash}`,
        error
      );
      return 'pending';
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
