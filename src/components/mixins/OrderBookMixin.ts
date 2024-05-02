import { Vue, Component } from 'vue-property-decorator';

import { getter } from '@/store/decorators';

import type { OrderBook } from '@sora-substrate/liquidity-proxy';

@Component
export default class OrderBookMixin extends Vue {
  @getter.orderBook.currentOrderBook currentOrderBook!: Nullable<OrderBook>;

  /**
   * Get price precision based on tickSize.
   * @example
   * 10 -> 0
   * 0.1 -> 1
   * 0.001 -> 3
   */
  get pricePrecision(): number {
    return this.currentOrderBook?.tickSize?.toString()?.split('.')?.[1]?.length ?? 0;
  }

  /**
   * Get amount precision based on stepLotSize.
   * @example
   * 10 -> 0
   * 0.1 -> 1
   * 0.001 -> 3
   */
  get amountPrecision(): number {
    return this.currentOrderBook?.stepLotSize?.toString()?.split('.')?.[1]?.length ?? 0;
  }
}
