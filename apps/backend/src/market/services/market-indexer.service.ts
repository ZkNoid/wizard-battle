import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ethers } from 'ethers';
import {
  MarketOrder,
  MarketOrderDocument,
  OrderStatus,
} from '../schemas/market-order.schema';
import {
  IndexerState,
  IndexerStateDocument,
} from '../schemas/indexer-state.schema';

const GAME_MARKET_ABI = [
  'event CreateOrder(uint256 indexed orderId, address indexed token, uint256 indexed tokenId, uint256 price, uint256 amount)',
  'event OrderFilled(uint256 indexed orderId, address indexed maker, address indexed taker, address token, uint256 tokenId, uint256 amount, bytes32 nameHash)',
  'event CancelOrder(uint256 indexed orderId)',
  'event PauseOrder(uint256 indexed orderId)',
  'event UnpauseOrder(uint256 indexed orderId)',
  'function getOrder(uint256 orderId) view returns (tuple(address maker, address taker, address token, uint256 tokenId, address paymentToken, uint256 amount, uint256 price, uint8 status, bytes32 nameHash))',
  'function getOrderCount() view returns (uint256)',
];

@Injectable()
export class MarketIndexerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MarketIndexerService.name);
  private provider?: ethers.WebSocketProvider;
  private contract?: ethers.Contract;
  private isRunning = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private readonly reconnectDelay = 5000;

  private readonly gameMarketAddress: string;
  private readonly rpcWsUrl: string;
  private readonly deploymentBlock: number;

  constructor(
    @InjectModel(MarketOrder.name)
    private readonly orderModel: Model<MarketOrderDocument>,
    @InjectModel(IndexerState.name)
    private readonly stateModel: Model<IndexerStateDocument>
  ) {
    this.gameMarketAddress = process.env.GAME_MARKET_ADDRESS || '';
    this.rpcWsUrl = process.env.RPC_WS_URL || '';
    this.deploymentBlock = parseInt(
      process.env.GAME_MARKET_DEPLOYMENT_BLOCK || '0',
      10
    );
  }

  async onModuleInit() {
    if (!this.gameMarketAddress || !this.rpcWsUrl) {
      this.logger.warn(
        '⚠️ GAME_MARKET_ADDRESS or RPC_WS_URL not set, market indexer disabled'
      );
      return;
    }

    await this.initialize();
  }

  async onModuleDestroy() {
    await this.cleanup();
  }

  private async initialize() {
    try {
      this.logger.log('🚀 Initializing market indexer...');

      this.provider = new ethers.WebSocketProvider(this.rpcWsUrl);

      this.provider.websocket.onerror = (error) => {
        this.logger.error('WebSocket error:', error);
      };

      // this.provider.websocket.on('close', () => {
      //   this.logger.warn('WebSocket closed, attempting reconnect...');
      //   this.handleDisconnect();
      // });

      this.contract = new ethers.Contract(
        this.gameMarketAddress,
        GAME_MARKET_ABI,
        this.provider
      );

      await this.syncHistoricalEvents();
      this.subscribeToEvents();

      this.isRunning = true;
      this.reconnectAttempts = 0;
      this.logger.log('✅ Market indexer started successfully');
    } catch (error) {
      this.logger.error('Failed to initialize indexer:', error);
      this.handleDisconnect();
    }
  }

  private async syncHistoricalEvents() {
    if (!this.provider || !this.contract) return;

    const state = await this.stateModel.findOne({
      contractAddress: this.gameMarketAddress.toLowerCase(),
    });

    const fromBlock = state?.lastProcessedBlock
      ? state.lastProcessedBlock + 1
      : this.deploymentBlock;

    const currentBlock = await this.provider.getBlockNumber();

    if (fromBlock > currentBlock) {
      this.logger.log('📦 Already synced to latest block');
      return;
    }

    this.logger.log(
      `📦 Syncing historical events from block ${fromBlock} to ${currentBlock}`
    );

    const CHUNK_SIZE = 5000;

    for (let start = fromBlock; start <= currentBlock; start += CHUNK_SIZE) {
      const end = Math.min(start + CHUNK_SIZE - 1, currentBlock);

      const [
        createEvents,
        fillEvents,
        cancelEvents,
        pauseEvents,
        unpauseEvents,
      ] = await Promise.all([
        this.contract.queryFilter('CreateOrder', start, end),
        this.contract.queryFilter('OrderFilled', start, end),
        this.contract.queryFilter('CancelOrder', start, end),
        this.contract.queryFilter('PauseOrder', start, end),
        this.contract.queryFilter('UnpauseOrder', start, end),
      ]);

      for (const event of createEvents) {
        await this.handleCreateOrderEvent(event as ethers.EventLog);
      }

      for (const event of fillEvents) {
        await this.handleOrderFilledEvent(event as ethers.EventLog);
      }

      for (const event of cancelEvents) {
        await this.handleCancelOrderEvent(event as ethers.EventLog);
      }

      for (const event of pauseEvents) {
        await this.handlePauseOrderEvent(event as ethers.EventLog);
      }

      for (const event of unpauseEvents) {
        await this.handleUnpauseOrderEvent(event as ethers.EventLog);
      }

      await this.updateState(end);

      this.logger.log(`📦 Synced blocks ${start} to ${end}`);
    }

    await this.stateModel.updateOne(
      { contractAddress: this.gameMarketAddress.toLowerCase() },
      { isFullySynced: true },
      { upsert: true }
    );

    this.logger.log('✅ Historical sync complete');
  }

  private subscribeToEvents() {
    if (!this.contract) return;

    this.contract.on('CreateOrder', async (...args) => {
      const event = args[args.length - 1] as ethers.EventLog;
      await this.handleCreateOrderEvent(event);
    });

    this.contract.on('OrderFilled', async (...args) => {
      const event = args[args.length - 1] as ethers.EventLog;
      await this.handleOrderFilledEvent(event);
    });

    this.contract.on('CancelOrder', async (...args) => {
      const event = args[args.length - 1] as ethers.EventLog;
      await this.handleCancelOrderEvent(event);
    });

    this.contract.on('PauseOrder', async (...args) => {
      const event = args[args.length - 1] as ethers.EventLog;
      await this.handlePauseOrderEvent(event);
    });

    this.contract.on('UnpauseOrder', async (...args) => {
      const event = args[args.length - 1] as ethers.EventLog;
      await this.handleUnpauseOrderEvent(event);
    });

    this.logger.log('📡 Subscribed to contract events');
  }

  private async handleCreateOrderEvent(event: ethers.EventLog) {
    const contract = this.contract;
    if (!contract) return;

    try {
      const orderId = Number(event.args[0]);

      const existingOrder = await this.orderModel.findOne({ orderId });
      if (existingOrder) {
        this.logger.debug(`Order ${orderId} already exists, skipping`);
        return;
      }

      const order = await (contract as any).getOrder(orderId);

      await this.orderModel.create({
        orderId,
        maker: order.maker.toLowerCase(),
        taker: undefined,
        token: order.token.toLowerCase(),
        tokenId: order.tokenId.toString(),
        paymentToken: order.paymentToken.toLowerCase(),
        amount: order.amount.toString(),
        price: order.price.toString(),
        status: OrderStatus.OPEN,
        nameHash: order.nameHash,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
      });

      await this.updateState(event.blockNumber);

      this.logger.log(`✅ Indexed CreateOrder #${orderId}`);
    } catch (error) {
      this.logger.error(`Error handling CreateOrder event:`, error);
    }
  }

  private async handleOrderFilledEvent(event: ethers.EventLog) {
    try {
      const orderId = Number(event.args[0]);
      const taker = (event.args[2] as string).toLowerCase();

      await this.orderModel.updateOne(
        { orderId },
        {
          status: OrderStatus.FILLED,
          taker,
          filledAt: new Date(),
          blockNumber: event.blockNumber,
        }
      );

      await this.updateState(event.blockNumber);

      this.logger.log(`✅ Indexed OrderFilled #${orderId}`);
    } catch (error) {
      this.logger.error(`Error handling OrderFilled event:`, error);
    }
  }

  private async handleCancelOrderEvent(event: ethers.EventLog) {
    try {
      const orderId = Number(event.args[0]);

      await this.orderModel.updateOne(
        { orderId },
        {
          status: OrderStatus.CANCELED,
          canceledAt: new Date(),
          blockNumber: event.blockNumber,
        }
      );

      await this.updateState(event.blockNumber);

      this.logger.log(`✅ Indexed CancelOrder #${orderId}`);
    } catch (error) {
      this.logger.error(`Error handling CancelOrder event:`, error);
    }
  }

  private async handlePauseOrderEvent(event: ethers.EventLog) {
    try {
      const orderId = Number(event.args[0]);

      await this.orderModel.updateOne(
        { orderId },
        {
          status: OrderStatus.PAUSED,
          pausedAt: new Date(),
          blockNumber: event.blockNumber,
        }
      );

      await this.updateState(event.blockNumber);

      this.logger.log(`✅ Indexed PauseOrder #${orderId}`);
    } catch (error) {
      this.logger.error(`Error handling PauseOrder event:`, error);
    }
  }

  private async handleUnpauseOrderEvent(event: ethers.EventLog) {
    try {
      const orderId = Number(event.args[0]);

      await this.orderModel.updateOne(
        { orderId },
        {
          status: OrderStatus.OPEN,
          pausedAt: undefined,
          blockNumber: event.blockNumber,
        }
      );

      await this.updateState(event.blockNumber);

      this.logger.log(`✅ Indexed UnpauseOrder #${orderId}`);
    } catch (error) {
      this.logger.error(`Error handling UnpauseOrder event:`, error);
    }
  }

  private async updateState(blockNumber: number) {
    const totalOrders = await this.orderModel.countDocuments();

    await this.stateModel.updateOne(
      { contractAddress: this.gameMarketAddress.toLowerCase() },
      {
        lastProcessedBlock: blockNumber,
        lastUpdated: new Date(),
        totalOrdersIndexed: totalOrders,
      },
      { upsert: true }
    );
  }

  private async handleDisconnect() {
    this.isRunning = false;
    await this.cleanup();

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.logger.log(
        `🔄 Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`
      );
      setTimeout(() => this.initialize(), this.reconnectDelay);
    } else {
      this.logger.error(
        '❌ Max reconnect attempts reached, indexer stopped. Manual restart required.'
      );
    }
  }

  private async cleanup() {
    if (this.contract) {
      this.contract.removeAllListeners();
      this.contract = undefined;
    }

    if (this.provider) {
      await this.provider.destroy();
      this.provider = undefined;
    }

    this.isRunning = false;
  }

  getStatus(): {
    isRunning: boolean;
    reconnectAttempts: number;
    contractAddress: string;
  } {
    return {
      isRunning: this.isRunning,
      reconnectAttempts: this.reconnectAttempts,
      contractAddress: this.gameMarketAddress,
    };
  }

  async getIndexerState(): Promise<IndexerState | null> {
    return this.stateModel.findOne({
      contractAddress: this.gameMarketAddress.toLowerCase(),
    });
  }
}
