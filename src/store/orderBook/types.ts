import type { LimitOrderSide } from '@/consts';

import type { Subscription } from 'rxjs';

export type OrderBookState = {
  orderBooks: any;
  currentOrderBook: any;
  baseAssetAddress: Nullable<string>;
  quoteAssetAddress: Nullable<string>;
  baseValue: string;
  quoteValue: string;
  side: LimitOrderSide;
};
