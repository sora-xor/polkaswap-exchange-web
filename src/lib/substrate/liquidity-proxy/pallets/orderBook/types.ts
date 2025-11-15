import type { FPNumber } from '@sora-substrate/math';

import type { OrderBookStatus } from './consts';

export type OrderBookId = {
  dexId: number;
  base: string;
  quote: string;
};

export type OrderBook = {
  orderBookId: OrderBookId;
  status: OrderBookStatus;
  lastOrderId: number;
  tickSize: FPNumber;
  stepLotSize: FPNumber;
  minLotSize: FPNumber;
  maxLotSize: FPNumber;
};

/**
 * Bid or Ask of Order Book.
 * Represented as [price, amount]
 * */
export type OrderBookPriceVolume = [FPNumber, FPNumber];

export type OrderBookAggregated = OrderBook & {
  aggregated: {
    asks: Array<OrderBookPriceVolume>;
    bids: Array<OrderBookPriceVolume>;
  };
};
