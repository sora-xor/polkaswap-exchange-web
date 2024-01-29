import type { OrderBook } from '@sora-substrate/liquidity-proxy';

export const MAX_ORDERS_PER_SIDE = 1024;
export const MAX_ORDERS_PER_USER = 1024;
export const MAX_ORDERS_PER_SINGLE_PRICE = 1024;

export function getBookDecimals(orderBook: Nullable<OrderBook>): number {
  return orderBook?.stepLotSize?.toString().split('.')[1]?.length ?? 2;
}
