import type { MarketOrder } from '@/server/api/routers/market';
import type {
  IMarketBuyItem,
  IMarketSellingItem,
  IMarketHistoryItem,
} from '@/lib/types/IMarket';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function getPaymentCurrency(
  paymentToken: string
): 'gold' | 'usdc' | 'eth' {
  if (paymentToken === ZERO_ADDRESS) return 'eth';
  // TODO: Add actual token address checks
  // For now, assume non-zero addresses are gold or usdc based on some logic
  return 'gold';
}

export function formatPrice(priceWei: string, decimals: number = 18): number {
  const price = BigInt(priceWei);
  const divisor = BigInt(10 ** decimals);
  return Number(price) / Number(divisor);
}

export function mapOrderToBuyItem(
  order: MarketOrder,
  itemMetadata?: { title: string; level: number; image: string; type: string }
): IMarketBuyItem {
  return {
    id: order.orderId.toString(),
    title: itemMetadata?.title || `Item #${order.tokenId}`,
    level: itemMetadata?.level || 1,
    image: itemMetadata?.image || 'default.png',
    quantity: parseInt(order.amount, 10),
    type: itemMetadata?.type || 'unknown',
    price: formatPrice(order.price),
    priceCurrency: getPaymentCurrency(order.paymentToken),
    // Extended fields for contract interaction
    orderId: order.orderId,
    maker: order.maker,
    tokenAddress: order.token,
    tokenId: order.tokenId,
    paymentToken: order.paymentToken,
    nameHash: order.nameHash,
  };
}

export function mapOrderToSellingItem(
  order: MarketOrder,
  itemMetadata?: { title: string; level: number; image: string; type: string }
): IMarketSellingItem {
  return {
    id: order.orderId.toString(),
    title: itemMetadata?.title || `Item #${order.tokenId}`,
    level: itemMetadata?.level || 1,
    image: itemMetadata?.image || 'default.png',
    quantity: parseInt(order.amount, 10),
    type: itemMetadata?.type || 'unknown',
    price: formatPrice(order.price),
    priceCurrency: getPaymentCurrency(order.paymentToken) as 'gold' | 'usdc',
    listedAt: order.createdAt || new Date().toISOString(),
    status: order.status === 'FILLED' ? 'sold' : 'on_sale',
    // Extended fields
    orderId: order.orderId,
    orderStatus: order.status,
  };
}

export function mapOrderToHistoryItem(
  order: MarketOrder,
  userAddress: string,
  itemMetadata?: { title: string; level: number; image: string; type: string }
): IMarketHistoryItem {
  const isBuyer = order.taker?.toLowerCase() === userAddress.toLowerCase();

  return {
    id: order.orderId.toString(),
    title: itemMetadata?.title || `Item #${order.tokenId}`,
    level: itemMetadata?.level || 1,
    image: itemMetadata?.image || 'default.png',
    quantity: parseInt(order.amount, 10),
    type: itemMetadata?.type || 'unknown',
    price: formatPrice(order.price),
    priceCurrency: getPaymentCurrency(order.paymentToken) as 'gold' | 'usdc',
    date: order.filledAt || order.createdAt || new Date().toISOString(),
    status: isBuyer ? 'bought' : 'sold',
  };
}

export function parsePrice(price: number, decimals: number = 18): bigint {
  return BigInt(Math.floor(price * 10 ** decimals));
}
