<template>
  <div v-loading="loading" class="order-book-widget stock-book book">
    <div class="stock-book__title">
      <div>
        <span>Orderbook</span>
        <s-tooltip slot="suffix" border-radius="mini" :content="orderBookTooltip" placement="top" tabindex="-1">
          <s-icon name="info-16" size="14px" />
        </s-tooltip>
      </div>
      <s-dropdown
        v-if="false"
        class="stock-book__switcher"
        trigger="click"
        :size="18"
        popper-class="stock-book-switcher"
      >
        {{ '0.001' }}
        <template slot="menu">
          <s-dropdown-item v-for="value in steps" :key="value">{{ value }}</s-dropdown-item>
        </template>
      </s-dropdown>
    </div>
    <div class="book-columns">
      <div>price</div>
      <div>amount</div>
      <div>total</div>
    </div>
    <div v-if="asksFormatted.length" class="stock-book-sell">
      <div class="margin" :style="getHeight()" />
      <div v-for="order in getSellOrders()" :key="order.price" class="row">
        <span class="order-info">{{ order.total }}</span>
        <span class="order-info amount">{{ order.amount }}</span>
        <span class="order-info price">{{ order.price }}</span>
        <div class="bar" :style="getStyles(order.filled)" />
      </div>
    </div>
    <div v-else class="stock-book-sell--no-asks">No opened asks</div>
    <div :class="getComputedClassTrend()">
      <div>
        <span class="mark-price">{{ lastPriceFormatted }}</span>
        <s-icon class="trend-icon" :name="iconTrend" size="18" />
        <span class="last-traded-price">{{ fiatValue }}</span>
      </div>
    </div>
    <div v-if="bidsFormatted.length" class="stock-book-buy">
      <div v-for="order in getBuyOrders()" :key="order.price" class="row">
        <span class="order-info">{{ order.total }}</span>
        <span class="order-info amount">{{ order.amount }}</span>
        <span class="order-info price">{{ order.price }}</span>
        <div class="bar" :style="getStyles(order.filled)" />
      </div>
    </div>
    <div v-else class="stock-book-buy--no-bids">No opened bids</div>
  </div>
</template>

<script lang="ts">
import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import { FPNumber } from '@sora-substrate/util';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { ZeroStringValue } from '@/consts';
import { action, getter, state } from '@/store/decorators';
import type { OrderBookDealData } from '@/types/orderBook';

import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

interface LimitOrderForm {
  price: number;
  amount: number;
  total: number;
  filled?: number;
}

@Component
export default class BookWidget extends Mixins(TranslationMixin, mixins.LoadingMixin, mixins.FormattedAmountMixin) {
  @state.orderBook.asks asks!: any;
  @state.orderBook.bids bids!: any;

  @getter.orderBook.quoteAsset quoteAsset!: AccountAsset;
  @getter.orderBook.orderBookLastDeal orderBookLastDeal!: Nullable<OrderBookDealData>;

  volumeAsks = FPNumber.ZERO;
  volumeBids = FPNumber.ZERO;

  maxRowsNumber = 10;

  scalerOpen = false;

  steps: Array<string> = [];

  asksFormatted: Array<LimitOrderForm> = [];
  bidsFormatted: Array<LimitOrderForm> = [];

  // Widget subscription data
  @getter.orderBook.currentOrderBook currentOrderBook!: any;

  @getter.orderBook.orderBookId private orderBookId!: string;
  @getter.settings.nodeIsConnected private nodeIsConnected!: boolean;
  @action.orderBook.subscribeToBidsAndAsks private subscribeToBidsAndAsks!: AsyncFnWithoutArgs;
  @action.orderBook.unsubscribeFromBidsAndAsks private unsubscribeFromBidsAndAsks!: FnWithoutArgs;

  // Widget subscription creation
  @Watch('orderBookId', { immediate: true })
  @Watch('nodeIsConnected')
  private async updateSubscription(): Promise<void> {
    await this.withLoading(async () => {
      await this.withParentLoading(async () => {
        await this.subscribeToBidsAndAsks();
      });
    });
  }

  calculateScalerStep(): void {
    const min = this.currentOrderBook?.tickSize;

    if (this.bids.length) {
      const averagePrice: FPNumber = this.bids[0][0];
      this.steps = [];

      if (averagePrice.isLessThan(FPNumber.ONE)) {
        let max = new FPNumber(0.1);
        let result = averagePrice;

        while (result.isLessThan(FPNumber.ONE)) {
          result = averagePrice.div(max);
          if (result.isGreaterThan(FPNumber.ONE)) break;
          max = max.mul(max);
        }

        for (let inBetweenStep = max; inBetweenStep.isGreaterThanOrEqualTo(min); ) {
          this.steps.push(inBetweenStep.toString());
          inBetweenStep = inBetweenStep.div(FPNumber.TEN);
        }

        // this.steps.map((value) => console.log(value.toString()));
      }
    }
  }

  // Widget subscription close
  beforeDestroy(): void {
    this.unsubscribeFromBidsAndAsks();
  }

  get lastDealTrendsUp(): boolean {
    return this.orderBookLastDeal?.side === PriceVariant.Buy;
  }

  get iconTrend(): string {
    return this.lastDealTrendsUp ? 'arrows-arrow-bold-top-24' : 'arrows-arrow-bold-bottom-24';
  }

  get lastDealPrice(): FPNumber {
    return this.orderBookLastDeal?.price ?? FPNumber.ZERO;
  }

  get lastPriceFormatted(): string {
    return this.lastDealPrice.toLocaleString();
  }

  get fiatValue(): string {
    if (!this.quoteAsset) return ZeroStringValue;

    const fiat = this.getFiatAmount(this.lastDealPrice.toString(), this.quoteAsset);

    return fiat ? `$${fiat}` : '';
  }

  get orderBookTooltip() {
    return 'A live, constantly updating record of buy (bid) and sell (ask) orders for a specific asset, organized by price level. The order book displays the depth of the market, including the quantities of assets being offered at various prices. Traders utilize this detailed view to gauge market sentiment, identify potential resistance and support levels, and anticipate price movements based on existing demand and supply';
  }

  getComputedClassTrend(): string {
    const base = ['stock-book-delimiter'];

    if (this.lastDealTrendsUp) {
      base.push('stock-book-delimiter--up');
    } else {
      base.push('stock-book-delimiter--down');
    }

    return base.join(' ');
  }

  getSellOrders() {
    return this.asksFormatted.slice(-this.maxRowsNumber);
  }

  getBuyOrders() {
    return this.bidsFormatted.slice(0, this.maxRowsNumber);
  }

  getHeight() {
    const margin = this.asks.length < 10 ? this.maxRowsNumber - this.asks.length : 0;
    return `height: ${24 * margin}px`;
  }

  getStyles(filled) {
    return `width: ${filled}%`;
  }

  calculateStepsDistribution(orders): any {
    if (!orders.length) return;

    const maxPrice = FPNumber.max(...orders.map(([price]) => price)) as FPNumber;
    const minPrice = FPNumber.min(...orders.map(([price]) => price)) as FPNumber;

    const difference = maxPrice.sub(minPrice);
    const step = difference.div(FPNumber.TEN);

    // debug info:
    // let currentPrice = maxPrice;
    // const setPrices = [] as any;

    // while (FPNumber.gt(currentPrice, minPrice)) {
    //   setPrices.push(currentPrice.toString());

    //   currentPrice = currentPrice.sub(step);
    // }

    const aggregatedOrders = [] as any;

    let accumulatedAmount = FPNumber.ZERO;
    let accumulatedTotal = FPNumber.ZERO;
    let edge = maxPrice;

    for (let index = 0; index < orders.length; index++) {
      const [price, amount] = orders[index];

      if (FPNumber.lte(edge, minPrice)) break;
      if (FPNumber.lte(price, edge) && FPNumber.gt(price, edge.sub(step))) {
        accumulatedAmount = accumulatedAmount.add(amount);
        accumulatedTotal = price.mul(amount).add(accumulatedTotal);
      } else {
        aggregatedOrders.push([edge, accumulatedAmount, accumulatedTotal]);
        edge = edge.sub(step);
        accumulatedAmount = FPNumber.ZERO;
        accumulatedTotal = FPNumber.ZERO;
        index -= 1;
      }
    }

    return aggregatedOrders;
  }

  getAmountProportion(currentAmount: FPNumber, maxAmount: FPNumber): number {
    return currentAmount.div(maxAmount).mul(FPNumber.HUNDRED).toNumber();
  }

  @Watch('asks', { immediate: true })
  @Watch('bids', { immediate: true })
  async prepareLimitOrders(): Promise<void> {
    // this.calculateScalerStep();

    this.asksFormatted = [];
    this.bidsFormatted = [];
    this.volumeAsks = FPNumber.ZERO;
    this.volumeBids = FPNumber.ZERO;

    // if (this.asks?.length > this.maxRowsNumber || this.bids?.length < this.maxRowsNumber) {
    if (this.asks?.length) {
      const maxAskAmount = FPNumber.max(...this.asks.map((order) => order[1])) as FPNumber;

      this.asks.forEach((row: [FPNumber, FPNumber]) => {
        const price = row[0].toNumber();
        const amount = row[1].toNumber();
        const total = row[0].mul(row[1]);

        this.volumeAsks = this.volumeAsks.add(total);

        this.asksFormatted.push({
          price,
          amount,
          total: total.toNumber(),
          filled: this.getAmountProportion(row[1], maxAskAmount),
        });
      });
    }

    if (this.bids?.length) {
      const maxBidAmount = FPNumber.max(...this.bids.map((order) => order[1])) as FPNumber;

      this.bids.forEach((row: [FPNumber, FPNumber]) => {
        const price = row[0].toNumber();
        const amount = row[1].toNumber();
        const total = row[0].mul(row[1]);

        this.volumeBids = this.volumeBids.add(total);

        this.bidsFormatted.push({
          price,
          amount,
          total: total.toNumber(),
          filled: this.getAmountProportion(row[1], maxBidAmount),
        });
      });
      // }
      // } else {
      //   const aggregatedAsks = this.calculateStepsDistribution(this.asks);
      //   const aggregatedBids = this.calculateStepsDistribution(this.bids);

      //   if (aggregatedAsks?.length) {
      //     const maxAskAmount = FPNumber.max(...aggregatedAsks.map((order) => order[1])) as FPNumber;

      //     aggregatedAsks.forEach((row: [FPNumber, FPNumber, FPNumber]) => {
      //       // ignore void amount record, do not push
      //       if (row[1].isZero()) return;

      //       const price = row[0].toNumber();
      //       const amount = row[1].toNumber();
      //       const total = row[2];

      //       this.volumeAsks = this.volumeAsks.add(total);

      //       this.asksFormatted.push({
      //         price,
      //         amount,
      //         total: total.toNumber(),
      //         filled: this.getAmountProportion(row[1], maxAskAmount),
      //       });
      //     });
      //   }

      //   if (aggregatedBids?.length) {
      //     const maxBidAmount = FPNumber.max(...aggregatedBids.map((order) => order[1])) as FPNumber;

      //     aggregatedBids.forEach((row: [FPNumber, FPNumber, FPNumber]) => {
      //       // ignore void amount record, do not push
      //       if (row[1].isZero()) return;

      //       const price = row[0].toNumber();
      //       const amount = row[1].toNumber();
      //       const total = row[2];

      //       this.volumeBids = this.volumeBids.add(total);

      //       this.bidsFormatted.push({
      //         price,
      //         amount,
      //         total: total.toNumber(),
      //         filled: this.getAmountProportion(row[1], maxBidAmount),
      //       });
      //     });
      //   }
    }
  }
}
</script>

<style lang="scss">
$row-height: 24px;
$background-column-color-light: #e7dadd;
$background-column-color-dark: #693d81;

.stock-book-switcher {
  background-color: var(--s-color-base-disabled) !important;
}

.stock-book {
  .row {
    display: flex;
    justify-content: space-between;
    margin: 2px;
    transform-style: preserve-3d;
  }

  &__title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 40px;
    line-height: 40px;
    font-weight: 500;
    font-size: 17px;
    margin-left: 16px;

    .el-tooltip {
      margin-left: 8px;
    }
  }

  &__switcher {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-right: 12px;

    &:hover {
      cursor: pointer;

      .el-icon-arrow-down {
        color: var(--s-color-base-content-secondary);
      }
    }

    .el-icon-arrow-down {
      color: var(--s-color-base-content-tertiary);
      // font-size: 20px;
      font-weight: 800;
      margin-left: 4px;
      margin-bottom: 1px;
    }
  }

  .order-info {
    padding: 4px 16px 4px 16px;
    transform: scaleX(-1);
  }

  &-buy,
  &-sell {
    height: $row-height * 11;
    transform: scaleX(-1);
    .bar {
      width: 40%;
      height: 100%;
      z-index: -1;
      position: absolute;
    }
  }

  &-buy {
    .bar {
      background: rgba(185, 235, 219, 0.4);
    }

    .order-info.price {
      color: var(--status-day-success, #34ad87);
    }
  }

  &-sell {
    .bar {
      background: rgba(255, 216, 235, 0.8);
    }

    .order-info.price {
      color: var(--status-day-error, #f754a3);
    }
  }

  &-delimiter {
    display: flex;
    align-items: center;
    height: 30px;
    line-height: 30px;
    background-color: rgba($color: $background-column-color-light, $alpha: 0.2);

    .mark-price {
      font-size: 24px;
      font-weight: 450;
      padding-left: 24px;
    }

    .last-traded-price {
      font-weight: 450;
      font-size: 18px;
      margin-left: 24px;
    }

    .trend-icon {
      margin-left: 4px;
    }

    &--up {
      .mark-price,
      .trend-icon {
        color: #34ad87;
      }
    }

    &--down {
      .mark-price,
      .trend-icon {
        color: #f754a3;
      }
    }
  }

  .book-columns {
    opacity: 0.3;
    background-color: $background-column-color-light;
    display: flex;
    width: 100%;
    color: var(--s-color-base-content-primary);
    padding: 4px 16px 4px 16px;
    justify-content: space-between;
    font-family: Sora;
    font-size: 14px;
    font-style: normal;
    font-weight: 550;
    line-height: 150%;
    letter-spacing: -0.26px;
    text-transform: uppercase;
  }

  h4 {
    margin: 16px 0 10px 16px;
    font-weight: 500;
  }
}

.stock-book-sell--no-asks,
.stock-book-buy--no-bids {
  margin-top: 16px;
  font-size: 17px;
  font-weight: 600;
  color: var(--s-color-base-content-tertiary);
  text-align: center;
  height: $row-height * 9.8;
}

[design-system-theme='dark'] {
  .book-columns {
    background-color: #693d81;
  }

  .stock-book {
    &-sell {
      .bar {
        background-color: rgba(255, 0, 124, 0.3);
      }
    }
    &-buy {
      .bar {
        background-color: rgba(1, 202, 139, 0.2);
      }
    }
    &-delimiter {
      background-color: $background-column-color-dark;
    }
  }
}
</style>
