import type { LimitOrderSide, LimitOrderConstraint } from '@/consts';
import type { OrderBookStats, OrderBookDealData } from '@/types/orderBook';

import type { FPNumber } from '@sora-substrate/util';
import type { Subscription } from 'rxjs';

export type OrderBookState = {
  orderBooks: any;
  currentOrderBook: any;
  baseAssetAddress: Nullable<string>;
  quoteAssetAddress: Nullable<string>;
  orderBooksStats: Record<string, OrderBookStats>;
  deals: readonly OrderBookDealData[];
  asks: [];
  bids: [];
  userLimitOrders: [];
  baseValue: string;
  quoteValue: string;
  side: LimitOrderSide;
  orderBookUpdates: Array<Nullable<Subscription | VoidFunction>>;
  userLimitOrderUpdates: Nullable<Subscription>;
  limitOrderConstraints: LimitOrderConstraint;
  placeOrderNetworkFee: FPNumber;
};
