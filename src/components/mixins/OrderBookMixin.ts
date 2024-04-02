import { Vue, Component } from 'vue-property-decorator';

import { state, getter } from '@/store/decorators';

import type { OrderBook, OrderBookPriceVolume } from '@sora-substrate/liquidity-proxy';

@Component
export default class OrderBookMixin extends Vue {
  @state.orderBook.asks asks!: OrderBookPriceVolume[];
  @state.orderBook.bids bids!: OrderBookPriceVolume[];

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

  getDepthChartData(): any {
    const buy = [];
    const sell = [];

    return {
      buy,
      sell,
    };
  }
}
