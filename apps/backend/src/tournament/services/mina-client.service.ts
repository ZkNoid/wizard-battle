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
    totalCurrency: bigint;
  }> {
    const network = Mina.getNetworkState();
    return {
      blockchainLength: network.blockchainLength.toBigint(),
      globalSlotSinceGenesis: network.globalSlotSinceGenesis.toBigint(),
      minWindowDensity: network.minWindowDensity.toBigint(),
      totalCurrency: network.totalCurrency.toBigInt(),
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
      const tx = Mina.Transaction.fromJSON(JSON.parse(signedTxJson));
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
    txHash: string
  ): Promise<'pending' | 'included' | 'failed'> {
    try {
      const response = await fetch(
        process.env.MINA_GRAPHQL_URL ||
          'https://api.minascan.io/node/devnet/v1/graphql',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query GetTransactionStatus($hash: String!) {
                transactionStatus(zkappTransaction: $hash)
              }
            `,
            variables: { hash: txHash },
          }),
        }
      );

      const data = await response.json();
      const status = data?.data?.transactionStatus;

      if (status === 'INCLUDED') return 'included';
      if (status === 'FAILED') return 'failed';
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
