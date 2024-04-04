import { Vue, Component } from 'vue-property-decorator';

import { state, getter } from '@/store/decorators';
import type { DepthChartData, DepthChartStep } from '@/types/chart';

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

  calculateChartRange(bids: DepthChartStep[], asks: DepthChartStep[]): DepthChartData {
    const bidsRangeTotal = bids?.[0][0] - bids?.slice(-1)[0][0];
    const asksRangeTotal = Math.abs(asks?.[0][0] - asks?.slice(-1)[0][0]);

    const maxAskPrice = asks?.slice(-1)[0][0];
    const maxAskVolume = asks?.slice(-1)[0][1];

    const leftEdge = bids?.slice(-1)[0][0];
    const difference = Math.abs(bidsRangeTotal - asksRangeTotal);
    const rightEdge = difference + maxAskPrice;

    asks.push([rightEdge, maxAskVolume]);

    return { sell: asks, buy: bids, maxAskPrice: rightEdge, minBidPrice: leftEdge };
  }

  marketDepthRepresentation(side: OrderBookPriceVolume[]): DepthChartStep[] {
    let accumulativeVolume = side[0][1];
    const price = side[0][0];
    const steps: DepthChartStep[] = [];

    steps.push([price.toNumber(), accumulativeVolume.toNumber()]);

    for (let index = 1; index < side.length; index++) {
      const [price, volume] = side[index];
      accumulativeVolume = accumulativeVolume.add(volume);

      steps.push([price.toNumber(), accumulativeVolume.toNumber()]);
    }

    return steps;
  }

  getDepthChartData(): DepthChartData {
    const bids = this.marketDepthRepresentation(this.bids);
    const asks = this.marketDepthRepresentation(this.asks.toReversed());

    const { sell, buy, maxAskPrice, minBidPrice } = this.calculateChartRange(bids, asks);

    return {
      buy,
      sell,
      minBidPrice,
      maxAskPrice,
    };
  }
}
