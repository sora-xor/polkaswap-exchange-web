import type { LimitOrderType } from '@/consts';
import type { OrderBookStats, OrderBookDealData } from '@/types/orderBook';

import type { PriceVariant, OrderBookPriceVolume, OrderBook } from '@sora-substrate/liquidity-proxy';
import type { AccountBalance } from '@sora-substrate/sdk/build/assets/types';
import type { DexId } from '@sora-substrate/sdk/build/dex/consts';
import type { LimitOrder } from '@sora-substrate/sdk/build/orderBook/types';
import type { Subscription } from 'rxjs';

export type OrderBookState = {
  orderBooks: Record<string, OrderBook>;
  dexId: DexId;
  baseAssetAddress: Nullable<string>;
  quoteAssetAddress: Nullable<string>;
  limitOrderType: LimitOrderType;
  orderBooksStats: Record<string, OrderBookStats>;
  deals: readonly OrderBookDealData[];
  asks: readonly OrderBookPriceVolume[];
  bids: readonly OrderBookPriceVolume[];
  userLimitOrders: readonly LimitOrder[];
  baseValue: string;
  quoteValue: string;
  side: PriceVariant;
  orderBookUpdates: Array<Subscription>;
  orderBookStatsUpdates: Nullable<VoidFunction>;
  userLimitOrderUpdates: Nullable<Subscription>;
  pagedUserLimitOrdersSubscription: Nullable<Subscription>;
  ordersToBeCancelled: Array<LimitOrder>;
  amountSliderValue: number;
  baseAssetBalance: Nullable<AccountBalance>;
};
