import type { OrderBookId, PriceVariant } from '@sora-substrate/liquidity-proxy';
import type { FPNumber } from '@sora-substrate/util';

export enum Filter {
  open = 'open',
  all = 'all',
  executed = 'executed',
}

export enum Cancel {
  multiple = 'multiple',
  all = 'all',
}

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
