import { INDEXER_TYPES } from '@soramitsu/soraneo-wallet-web';

import type { OrderBookId, PriceVariant } from '@sora-substrate/liquidity-proxy';
import type { FPNumber } from '@sora-substrate/util';
import type { LimitOrder } from '@sora-substrate/util/build/orderBook/types';

export enum Filter {
  open = 'open',
  all = 'all',
  executed = 'executed',
}

export enum Cancel {
  multiple = 'multiple',
  all = 'all',
}

export const OrderStatus = INDEXER_TYPES.OrderStatus;

export type OrderBookDealData = {
  timestamp: number;
  side: PriceVariant;
  price: FPNumber;
  amount: FPNumber;
};

export type OrderBookStats = {
  price: FPNumber;
  priceChange: FPNumber;
  volume: FPNumber;
  status: string;
};

export type OrderBookWithStats = {
  id: OrderBookId;
  stats: OrderBookStats;
};

export type OrderBookUpdateData = OrderBookWithStats & {
  deals: OrderBookDealData[];
};

export type OrderData = LimitOrder & {
  status: string;
  filled?: number;
  baseAssetSymbol?: string;
  quoteAssetSymbol?: string;
  pair?: string;
  total?: string;
  created: { date: string; time: string };
  expires: string;
};
