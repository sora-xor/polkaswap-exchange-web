import type { OrderBook } from '@sora-substrate/liquidity-proxy';

export function serializeKey(base: string, quote: string): string {
  return [base, quote].join(',');
}

export function deserializeKey(key: string) {
  const [base, quote] = key.split(',');
  return { base, quote };
}

export function getBookDecimals(orderBook: Nullable<OrderBook>): number {
  return orderBook?.stepLotSize?.toString().split('.')[1]?.length ?? 2;
}
