import type { LimitOrderConstraint } from '@/consts';
import type { OrderBookStats, OrderBookDealData } from '@/types/orderBook';

import type { PriceVariant, OrderBookPriceVolume, OrderBook } from '@sora-substrate/liquidity-proxy';
import type { FPNumber } from '@sora-substrate/util';
import type { DexId } from '@sora-substrate/util/build/dex/consts';
import type { Subscription } from 'rxjs';

export type OrderBookState = {
  orderBooks: Record<string, OrderBook>;
  dexId: DexId;
  baseAssetAddress: Nullable<string>;
  quoteAssetAddress: Nullable<string>;
  orderBooksStats: Record<string, OrderBookStats>;
  deals: readonly OrderBookDealData[];
  asks: readonly OrderBookPriceVolume[];
  bids: readonly OrderBookPriceVolume[];
  userLimitOrders: [];
  baseValue: string;
  quoteValue: string;
  side: PriceVariant;
  orderBookUpdates: Array<Subscription>;
  orderBookStatsUpdates: Nullable<VoidFunction>;
  userLimitOrderUpdates: Nullable<Subscription>;
  limitOrderConstraints: LimitOrderConstraint;
  placeOrderNetworkFee: FPNumber;
};
