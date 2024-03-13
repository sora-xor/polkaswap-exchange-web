import { FPNumber } from '@sora-substrate/util';
import { Vue, Component } from 'vue-property-decorator';

import { getter } from '@/store/decorators';

import type { OrderBook } from '@sora-substrate/liquidity-proxy';

@Component
export default class OrderBookMixin extends Vue {
  @getter.orderBook.currentOrderBook currentOrderBook!: Nullable<OrderBook>;

  get pricePrecision(): number {
    return (
      this.currentOrderBook?.tickSize?.toLocaleString()?.split(FPNumber.DELIMITERS_CONFIG.decimal)?.[1]?.length ?? 0
    );
  }

  get amountPrecision(): number {
    return (
      this.currentOrderBook?.stepLotSize?.toLocaleString()?.split(FPNumber.DELIMITERS_CONFIG.decimal)?.[1]?.length ?? 0
    );
  }
}
