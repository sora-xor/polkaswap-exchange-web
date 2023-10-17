import type { LimitOrderSide, LimitOrderConstraint } from '@/consts';

import type { Subscription } from 'rxjs';

export type OrderBookState = {
  orderBooks: any;
  currentOrderBook: any;
  baseAssetAddress: Nullable<string>;
  quoteAssetAddress: Nullable<string>;
  asks: [];
  bids: [];
  userLimitOrders: [];
  baseValue: string;
  quoteValue: string;
  side: LimitOrderSide;
  orderBookUpdates: Array<Nullable<Subscription>>;
  userLimitOrderUpdates: Nullable<Subscription>;
  limitOrderConstraints: LimitOrderConstraint;
};
