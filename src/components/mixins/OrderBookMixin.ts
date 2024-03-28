import { FPNumber } from '@sora-substrate/util';
import { Vue, Component } from 'vue-property-decorator';

import { getter } from '@/store/decorators';

import type { OrderBook } from '@sora-substrate/liquidity-proxy';

@Component
export default class OrderBookMixin extends Vue {
  @getter.orderBook.currentOrderBook currentOrderBook!: Nullable<OrderBook>;

  /**
   * Get price and amount precisions based on tickSize and stepLotSize.
   *
   * # Example
   * 10 -> 0
   * 1 -> 0
   * 0.1 -> 1
   * 0.001 -> 3
   *
   */
  get pricePrecision(): number {
    return this.currentOrderBook?.tickSize?.toString()?.split('.')?.[1]?.length ?? 0;
  }

  get amountPrecision(): number {
    return this.currentOrderBook?.stepLotSize?.toString()?.split('.')?.[1]?.length ?? 0;
  }
}
