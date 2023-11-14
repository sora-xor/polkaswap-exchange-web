import type { LimitOrderSide, LimitOrderConstraint } from '@/consts';

import type { FPNumber } from '@sora-substrate/util';
import type { Subscription } from 'rxjs';

export type OrderBookState = {
  orderBooks: any;
  currentOrderBook: any;
  baseAssetAddress: Nullable<string>;
  quoteAssetAddress: Nullable<string>;
  asks: [];
  bids: [];
  volume: string;
  userLimitOrders: [];
  baseValue: string;
  quoteValue: string;
  side: LimitOrderSide;
  orderBookUpdates: Array<Nullable<Subscription>>;
  userLimitOrderUpdates: Nullable<Subscription>;
  limitOrderConstraints: LimitOrderConstraint;
  placeOrderNetworkFee: FPNumber;
};
