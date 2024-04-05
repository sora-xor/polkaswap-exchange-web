import { FPNumber } from '@sora-substrate/util';
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

  getDeltaPercent = (bestPrice: FPNumber, price: FPNumber) => {
    return bestPrice.sub(price).div(bestPrice).mul(FPNumber.HUNDRED).dp(2);
  };

  calculateChartRange(bids: DepthChartStep[], asks: DepthChartStep[]): DepthChartData {
    const bidsRangeTotal = bids?.[0][0] - bids?.slice(-1)[0][0];
    const asksRangeTotal = Math.abs(asks?.[0][0] - asks?.slice(-1)[0][0]);

    const maxAskPrice = asks?.slice(-1)[0][0];
    const maxAskVolume = asks?.slice(-1)[0][1];

    const leftEdge = bids?.slice(-1)[0][0];
    const difference = Math.abs(bidsRangeTotal - asksRangeTotal);
    const rightEdge = difference + maxAskPrice;

    asks.push([
      rightEdge,
      maxAskVolume,
      this.getDeltaPercent(new FPNumber(maxAskPrice), new FPNumber(rightEdge)).toNumber(),
    ]);

    return { sell: asks, buy: bids, maxAskPrice: rightEdge, minBidPrice: leftEdge };
  }

  marketDepthRepresentation(side: OrderBookPriceVolume[], bidSide = false): DepthChartStep[] {
    let accumulativeVolume = side[0][1];
    const bestPrice = side[0][0];
    const steps: DepthChartStep[] = [];
    const percent = bidSide ? -0.1 : 0.1;

    steps.push([bestPrice.toNumber(), accumulativeVolume.toNumber(), percent]);

    for (let index = 1; index < side.length; index++) {
      const [price, volume] = side[index];
      accumulativeVolume = accumulativeVolume.add(volume);
      const deltaPrice = this.getDeltaPercent(bestPrice, price);

      steps.push([price.toNumber(), accumulativeVolume.toNumber(), deltaPrice.toNumber()]);
    }

    return steps;
  }

  getDepthChartData(): DepthChartData {
    const bids = this.marketDepthRepresentation(this.bids, true);
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
