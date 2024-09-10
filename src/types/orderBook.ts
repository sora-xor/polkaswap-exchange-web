import { INDEXER_TYPES } from '@soramitsu/soraneo-wallet-web';

import type { OrderBookId, PriceVariant } from '@sora-substrate/liquidity-proxy';
import type { FPNumber, CodecString } from '@sora-substrate/sdk';
import type { LimitOrder } from '@sora-substrate/sdk/build/orderBook/types';

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
  baseAssetReserves?: CodecString;
  quoteAssetReserves?: CodecString;
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
};
