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

/** Decimals for each payment currency. Gold is ERC-1155 with 0 decimals. */
export function getPriceDecimals(currency: 'gold' | 'usdc' | 'eth'): number {
  if (currency === 'gold') return 0;
  if (currency === 'usdc') return 6;
  return 18; // ETH / native
}

export function formatPrice(priceRaw: string, decimals = 0): number {
  const price = BigInt(priceRaw);
  if (decimals === 0) return Number(price);
  const divisor = BigInt(10 ** decimals);
  return Number(price) / Number(divisor);
}

export function mapOrderToBuyItem(
  order: MarketOrder,
  itemMetadata?: { title: string; level: number; image: string; type: string }
): IMarketBuyItem {
  const priceCurrency = getPaymentCurrency(order.paymentToken);
  const priceDecimals = getPriceDecimals(priceCurrency);
  return {
    id: order.orderId.toString(),
    title: order.title || itemMetadata?.title || `Item #${order.tokenId}`,
    level: itemMetadata?.level || 1,
    image: order.image || itemMetadata?.image || 'default.png',
    quantity: parseInt(order.amount, 10),
    type: itemMetadata?.type || 'unknown',
    price: formatPrice(order.price, priceDecimals),
    priceCurrency,
    // Extended fields for contract interaction
    orderId: order.orderId,
    maker: order.maker,
    tokenAddress: order.token,
    tokenId: order.tokenId,
    paymentToken: order.paymentToken,
    paymentTokenId: order.paymentTokenId,
    nameHash: order.nameHash,
  };
}

export function mapOrderToSellingItem(
  order: MarketOrder,
  itemMetadata?: { title: string; level: number; image: string; type: string }
): IMarketSellingItem {
  const priceCurrency = getPaymentCurrency(order.paymentToken) as 'gold' | 'usdc';
  const priceDecimals = getPriceDecimals(priceCurrency);
  return {
    id: order.orderId.toString(),
    title: order.title || itemMetadata?.title || `Item #${order.tokenId}`,
    level: itemMetadata?.level || 1,
    image: order.image || itemMetadata?.image || 'default.png',
    quantity: parseInt(order.amount, 10),
    type: itemMetadata?.type || 'unknown',
    price: formatPrice(order.price, priceDecimals),
    priceCurrency,
    listedAt: new Date(Number(order.createdAtTimestamp) * 1000).toISOString(),
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
  const priceCurrency = getPaymentCurrency(order.paymentToken) as 'gold' | 'usdc';
  const priceDecimals = getPriceDecimals(priceCurrency);

  return {
    id: order.orderId.toString(),
    title: order.title || itemMetadata?.title || `Item #${order.tokenId}`,
    level: itemMetadata?.level || 1,
    image: order.image || itemMetadata?.image || 'default.png',
    quantity: parseInt(order.amount, 10),
    type: itemMetadata?.type || 'unknown',
    price: formatPrice(order.price, priceDecimals),
    priceCurrency,
    date: new Date(Number(order.updatedAtTimestamp) * 1000).toISOString(),
    status: isBuyer ? 'bought' : 'sold',
  };
}

export function parsePrice(price: number, decimals = 0): bigint {
  if (decimals === 0) return BigInt(Math.round(price));
  return BigInt(Math.floor(price * 10 ** decimals));
}
