import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ethers, getAddress, keccak256, toUtf8Bytes } from 'ethers';
import {
  MarketOrder,
  MarketOrderDocument,
  OrderStatus,
} from '../schemas/market-order.schema';
import {
  FulfilledOrderTx,
  FulfilledOrderTxDocument,
} from '../schemas/fulfilled-order-tx.schema';
import { GetOrdersDto } from '../dto/get-orders.dto';
import { UserInventoryService } from '../../user-inventory/services/user-inventory.service';
import { UserService } from '../../user/user.service';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const DEFAULT_MIN_CONFIRMATIONS = 1;
/** JS `Number` is safe up to 2^53-1 (~9e15). Beyond that we lose precision. */
const MAX_SAFE_AMOUNT = BigInt(Number.MAX_SAFE_INTEGER);

const ORDER_FILLED_ABI = [
  'event OrderFilled(uint256 indexed orderId, address indexed maker, address indexed taker, address token, uint256 tokenId, uint256 price, uint256 amount, address paymentToken, uint256 paymentTokenId, bytes32 nameHash)',
];

export interface FulfillOrderDto {
  txHash: string;
  orderId: string;
  buyerEvmAddress: string;
  buyerMinaAddress: string;
  /** Human-readable item name (e.g. "Iron Ore"). Backend verifies keccak256(itemId) === nameHash. */
  itemId: string;
}

interface OrderFilledArgs {
  orderId: bigint;
  maker: string;
  taker: string;
  token: string;
  tokenId: bigint;
  price: bigint;
  amount: bigint;
  paymentToken: string;
  paymentTokenId: bigint;
  nameHash: string;
}

@Injectable()
export class MarketService implements OnModuleInit {
  private readonly logger = new Logger(MarketService.name);
  private readonly provider: ethers.JsonRpcProvider;
  private readonly marketIface: ethers.Interface;
  private readonly gameMarketAddress: string;
  private readonly minConfirmations: number;
  /** Maps lowercase payment-token address → game inventory item ID */
  private readonly paymentTokenMap: Map<string, string>;

  constructor(
    @InjectModel(MarketOrder.name)
    private readonly orderModel: Model<MarketOrderDocument>,
    @InjectModel(FulfilledOrderTx.name)
    private readonly fulfilledTxModel: Model<FulfilledOrderTxDocument>,
    private readonly userInventoryService: UserInventoryService,
    private readonly userService: UserService,
  ) {
    const rpcUrl = process.env.EVM_RPC_URL ?? 'http://localhost:8545';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.marketIface = new ethers.Interface(ORDER_FILLED_ABI);

    const rawMarketAddr = process.env.GAME_MARKET_ADDRESS ?? '';
    this.gameMarketAddress = rawMarketAddr ? rawMarketAddr.toLowerCase() : '';

    const rawConfs = process.env.MARKET_MIN_CONFIRMATIONS;
    const parsedConfs = rawConfs ? Number(rawConfs) : DEFAULT_MIN_CONFIRMATIONS;
    this.minConfirmations =
      Number.isFinite(parsedConfs) && parsedConfs >= 0
        ? parsedConfs
        : DEFAULT_MIN_CONFIRMATIONS;

    this.paymentTokenMap = new Map<string, string>();
    const wbCoinAddress = process.env.WB_COIN_ADDRESS;
    if (wbCoinAddress) {
      this.paymentTokenMap.set(wbCoinAddress.toLowerCase(), 'Gold');
    }
    // Additional mappings via env: "0xADDR1:ItemId1,0xADDR2:ItemId2"
    const extraMap = process.env.PAYMENT_TOKEN_MAP ?? '';
    for (const pair of extraMap.split(',')) {
      const [addr, itemId] = pair.split(':');
      if (addr && itemId) {
        this.paymentTokenMap.set(addr.trim().toLowerCase(), itemId.trim());
      }
    }
  }

  onModuleInit(): void {
    if (!this.gameMarketAddress) {
      // Fail loudly so misconfiguration is caught at startup, not silently
      // dropping every fulfillment as "no event found".
      this.logger.error(
        'GAME_MARKET_ADDRESS env var is not set; fulfillOrder will reject all requests',
      );
    }
  }

  /**
   * Verify an on-chain fillOrder transaction and update the buyer's inventory:
   *  – adds the purchased item
   *  – removes the payment currency (if it is a game inventory token)
   *
   * Security checks (in order):
   *   1. Transaction exists, is mined and successful with N confirmations
   *   2. An `OrderFilled` event is emitted by the configured GameMarket contract
   *   3. The on-chain `taker` matches `buyerEvmAddress`
   *   4. `keccak256(itemId)` matches the `nameHash` from the event
   *   5. The buyerMinaAddress is the registered Mina address for this EVM address
   *   6. txHash hasn't been processed before (unique-index idempotency)
   */
  async fulfillOrder(dto: FulfillOrderDto): Promise<void> {
    if (!this.gameMarketAddress) {
      throw new InternalServerErrorException(
        'Market service is not configured (GAME_MARKET_ADDRESS missing)',
      );
    }

    let evmChecksum: string;
    try {
      evmChecksum = getAddress(dto.buyerEvmAddress);
    } catch {
      throw new BadRequestException('Invalid buyerEvmAddress');
    }
    const evmLower = evmChecksum.toLowerCase();
    const txHashLower = dto.txHash.toLowerCase();

    // 1. Fetch and validate transaction receipt
    const receipt = await this.provider
      .getTransactionReceipt(txHashLower)
      .catch((err: unknown) => {
        this.logger.warn(
          `fulfillOrder: RPC error for ${txHashLower}: ${(err as Error).message}`,
        );
        return null;
      });

    if (!receipt) {
      throw new NotFoundException(
        `Transaction ${txHashLower} not found on chain`,
      );
    }
    if (receipt.status !== 1) {
      throw new BadRequestException(
        `Transaction ${txHashLower} reverted on chain`,
      );
    }

    if (this.minConfirmations > 0) {
      const currentBlock = await this.provider.getBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber + 1;
      if (confirmations < this.minConfirmations) {
        throw new BadRequestException(
          `Transaction has ${confirmations} confirmation(s); need ${this.minConfirmations}`,
        );
      }
    }

    // 2. Find and decode the OrderFilled event
    const eventArgs = this.findOrderFilledEvent(receipt);
    if (!eventArgs) {
      throw new BadRequestException(
        `No OrderFilled event found in transaction ${txHashLower}`,
      );
    }

    // 3. Validate orderId and taker match the request
    const onChainOrderId = eventArgs.orderId.toString();
    const onChainTakerLower = eventArgs.taker.toLowerCase();

    if (onChainOrderId !== dto.orderId) {
      throw new BadRequestException(
        `Order ID mismatch: expected ${dto.orderId}, got ${onChainOrderId}`,
      );
    }
    if (onChainTakerLower !== evmLower) {
      throw new ForbiddenException(
        `Taker mismatch: tx was filled by ${onChainTakerLower}`,
      );
    }

    // 4. Verify the item name preimage matches the on-chain hash
    const expectedNameHash = keccak256(toUtf8Bytes(dto.itemId));
    if (expectedNameHash.toLowerCase() !== eventArgs.nameHash.toLowerCase()) {
      throw new BadRequestException(
        `Item name hash mismatch for "${dto.itemId}"`,
      );
    }

    // 5. Verify Mina ↔ EVM binding so an attacker cannot credit / drain a third party
    await this.assertMinaEvmBinding(dto.buyerMinaAddress, evmLower);

    // 6. Idempotency guard – atomic insert; duplicate-key error means already processed
    try {
      await this.fulfilledTxModel.create({
        txHash: txHashLower,
        orderId: onChainOrderId,
        taker: evmLower,
      });
    } catch (err: unknown) {
      const mongoErr = err as { code?: number };
      if (mongoErr?.code === 11000) {
        this.logger.log(
          `fulfillOrder: tx ${txHashLower} already processed, skipping`,
        );
        throw new ConflictException(
          `Transaction ${txHashLower} has already been processed`,
        );
      }
      throw err;
    }

    // 7. Apply inventory mutations.
    //    The chain is the source of truth.  Add the purchased item first so
    //    the buyer always sees what they paid for; cost deduction is
    //    best-effort and any DB drift is reconciled by the inventory sync job.
    const purchasedAmount = this.bigintToSafeNumber(eventArgs.amount, 'amount');

    this.logger.log(
      `fulfillOrder: adding ${purchasedAmount}x "${dto.itemId}" to ${dto.buyerMinaAddress}`,
    );
    await this.userInventoryService.addItem({
      userId: dto.buyerMinaAddress,
      itemId: dto.itemId,
      quantity: purchasedAmount,
      acquiredFrom: 'trade',
    });

    if (eventArgs.paymentToken.toLowerCase() !== ZERO_ADDRESS) {
      await this.deductCurrency(
        dto.buyerMinaAddress,
        eventArgs.paymentToken,
        eventArgs.paymentTokenId,
        eventArgs.price,
      );
    }

    // 8. Mark order as filled in our local DB (best-effort)
    await this.orderModel
      .findOneAndUpdate(
        { orderId: Number(onChainOrderId) },
        {
          $set: {
            status: OrderStatus.FILLED,
            taker: evmLower,
            filledAt: new Date(),
          },
        },
      )
      .catch((err: unknown) => {
        this.logger.warn(
          `fulfillOrder: could not update local order ${onChainOrderId}: ${(err as Error).message}`,
        );
      });
  }

  private findOrderFilledEvent(
    receipt: ethers.TransactionReceipt,
  ): OrderFilledArgs | null {
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== this.gameMarketAddress) continue;
      try {
        const parsed = this.marketIface.parseLog({
          topics: [...log.topics],
          data: log.data,
        });
        if (!parsed || parsed.name !== 'OrderFilled') continue;
        const a = parsed.args;
        return {
          orderId: a.getValue('orderId') as bigint,
          maker: a.getValue('maker') as string,
          taker: a.getValue('taker') as string,
          token: a.getValue('token') as string,
          tokenId: a.getValue('tokenId') as bigint,
          price: a.getValue('price') as bigint,
          amount: a.getValue('amount') as bigint,
          paymentToken: a.getValue('paymentToken') as string,
          paymentTokenId: a.getValue('paymentTokenId') as bigint,
          nameHash: a.getValue('nameHash') as string,
        };
      } catch {
        // not our event – skip
      }
    }
    return null;
  }

  private async assertMinaEvmBinding(
    minaAddress: string,
    evmAddressLower: string,
  ): Promise<void> {
    const user = await this.userService.findByAddress(minaAddress);
    if (!user) {
      throw new ForbiddenException(
        `No user registered for Mina address ${minaAddress}`,
      );
    }
    if (!user.address_evm) {
      throw new ForbiddenException(
        `Mina address ${minaAddress} has no linked EVM address`,
      );
    }
    if (user.address_evm.toLowerCase() !== evmAddressLower) {
      throw new ForbiddenException(
        `EVM address ${evmAddressLower} is not linked to Mina address ${minaAddress}`,
      );
    }
  }

  private async deductCurrency(
    minaAddress: string,
    paymentToken: string,
    paymentTokenId: bigint,
    price: bigint,
  ): Promise<void> {
    const currencyItemId = this.resolveCurrencyItemId(
      paymentToken,
      paymentTokenId,
    );
    if (!currencyItemId) {
      this.logger.warn(
        `fulfillOrder: unknown payment token ${paymentToken}#${paymentTokenId} – skipping currency deduction`,
      );
      return;
    }
    const costAmount = this.bigintToSafeNumber(price, 'price');
    this.logger.log(
      `fulfillOrder: removing ${costAmount}x "${currencyItemId}" from ${minaAddress}`,
    );
    try {
      await this.userInventoryService.removeItem(
        minaAddress,
        currencyItemId,
        costAmount,
      );
    } catch (err) {
      // Chain is the source of truth.  DB may be stale (e.g. user never had
      // gold tracked locally).  Log and continue – sync will reconcile later.
      this.logger.warn(
        `fulfillOrder: could not deduct currency "${currencyItemId}" – ${(err as Error).message}`,
      );
    }
  }

  private bigintToSafeNumber(value: bigint, label: string): number {
    if (value < 0n) {
      throw new InternalServerErrorException(`Negative ${label} from chain`);
    }
    if (value > MAX_SAFE_AMOUNT) {
      throw new InternalServerErrorException(
        `${label} ${value} exceeds JS safe integer range`,
      );
    }
    return Number(value);
  }

  private resolveCurrencyItemId(
    paymentTokenAddress: string,
    paymentTokenId: bigint,
  ): string | null {
    const mapped = this.paymentTokenMap.get(paymentTokenAddress.toLowerCase());
    if (mapped) return mapped;

    // Fallback: check if it is a known resource address with a specific token ID
    const wbResources = process.env.WB_RESOURCES_ADDRESS ?? '';
    if (
      wbResources &&
      paymentTokenAddress.toLowerCase() === wbResources.toLowerCase() &&
      paymentTokenId === 1n
    ) {
      return 'Gold'; // adjust based on your actual resource IDs
    }

    return null;
  }

  async getOrders(filters: GetOrdersDto = {}): Promise<MarketOrder[]> {
    const query: any = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.paymentToken) {
      query.paymentToken = filters.paymentToken.toLowerCase();
    }

    if (filters.nameHash) {
      query.nameHash = filters.nameHash;
    }

    if (filters.minPrice || filters.maxPrice) {
      query.price = {};
      if (filters.minPrice) {
        query.price.$gte = filters.minPrice;
      }
      if (filters.maxPrice) {
        query.price.$lte = filters.maxPrice;
      }
    }

    const sortField = filters.sortBy || 'createdAt';
    const sortDirection = filters.sortOrder === 'asc' ? 1 : -1;

    return this.orderModel
      .find(query)
      .sort({ [sortField]: sortDirection } as any)
      .skip(filters.offset || 0)
      .limit(filters.limit || 50)
      .exec();
  }

  async getOpenOrders(
    filters: Omit<GetOrdersDto, 'status'> = {}
  ): Promise<MarketOrder[]> {
    return this.getOrders({ ...filters, status: OrderStatus.OPEN });
  }

  async getOrderById(orderId: number): Promise<MarketOrder> {
    const order = await this.orderModel.findOne({ orderId }).exec();

    if (!order) {
      throw new NotFoundException(`Order #${orderId} not found`);
    }

    return order;
  }

  async getUserOrders(
    userAddress: string,
    status?: OrderStatus
  ): Promise<MarketOrder[]> {
    const query: any = {
      maker: userAddress.toLowerCase(),
    };

    if (status) {
      query.status = status;
    }

    return this.orderModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async getUserActiveOrders(userAddress: string): Promise<MarketOrder[]> {
    return this.orderModel
      .find({
        maker: userAddress.toLowerCase(),
        status: { $in: [OrderStatus.OPEN, OrderStatus.PAUSED] },
      } as any)
      .sort({ createdAt: -1 })
      .exec();
  }

  async getUserHistory(userAddress: string): Promise<MarketOrder[]> {
    const address = userAddress.toLowerCase();

    return this.orderModel
      .find({
        $or: [{ maker: address }, { taker: address }],
        status: OrderStatus.FILLED,
      } as any)
      .sort({ filledAt: -1 })
      .exec();
  }

  async getUserPurchases(userAddress: string): Promise<MarketOrder[]> {
    return this.orderModel
      .find({
        taker: userAddress.toLowerCase(),
        status: OrderStatus.FILLED,
      })
      .sort({ filledAt: -1 })
      .exec();
  }

  async getUserSales(userAddress: string): Promise<MarketOrder[]> {
    return this.orderModel
      .find({
        maker: userAddress.toLowerCase(),
        status: OrderStatus.FILLED,
      })
      .sort({ filledAt: -1 })
      .exec();
  }

  async getOrdersByNameHash(
    nameHash: string,
    status?: OrderStatus
  ): Promise<MarketOrder[]> {
    const query: any = { nameHash };

    if (status) {
      query.status = status;
    }

    return this.orderModel.find(query).sort({ price: 1 }).exec();
  }

  async getOrderStats(): Promise<{
    totalOrders: number;
    openOrders: number;
    filledOrders: number;
    canceledOrders: number;
  }> {
    const [totalOrders, openOrders, filledOrders, canceledOrders] =
      await Promise.all([
        this.orderModel.countDocuments(),
        this.orderModel.countDocuments({ status: OrderStatus.OPEN }),
        this.orderModel.countDocuments({ status: OrderStatus.FILLED }),
        this.orderModel.countDocuments({ status: OrderStatus.CANCELED }),
      ]);

    return {
      totalOrders,
      openOrders,
      filledOrders,
      canceledOrders,
    };
  }

  async getFloorPrice(nameHash: string): Promise<string | null> {
    const order = await this.orderModel
      .findOne({
        nameHash,
        status: OrderStatus.OPEN,
      })
      .sort({ price: 1 })
      .exec();

    return order?.price || null;
  }

  async searchOrders(params: {
    nameHashes?: string[];
    paymentTokens?: string[];
    status?: OrderStatus;
    minPrice?: string;
    maxPrice?: string;
    sortBy?: 'price' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<MarketOrder[]> {
    const query: any = {};

    if (params.nameHashes?.length) {
      query.nameHash = { $in: params.nameHashes };
    }

    if (params.paymentTokens?.length) {
      query.paymentToken = {
        $in: params.paymentTokens.map((t) => t.toLowerCase()),
      };
    }

    if (params.status) {
      query.status = params.status;
    }

    if (params.minPrice || params.maxPrice) {
      query.price = {};
      if (params.minPrice) query.price.$gte = params.minPrice;
      if (params.maxPrice) query.price.$lte = params.maxPrice;
    }

    const sortField = params.sortBy || 'createdAt';
    const sortDirection = params.sortOrder === 'asc' ? 1 : -1;

    return this.orderModel
      .find(query)
      .sort({ [sortField]: sortDirection } as any)
      .skip(params.offset || 0)
      .limit(params.limit || 50)
      .exec();
  }
}
