<template>
  <div v-loading="loading" class="order-book-widget stock-book book">
    <div class="stock-book__title">
      <span>Orderbook</span>
      <s-tooltip slot="suffix" border-radius="mini" :content="orderBookTooltip" placement="top" tabindex="-1">
        <s-icon name="info-16" size="14px" />
      </s-tooltip>
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
        <span class="order-info">{{ order.amount }}</span>
        <span class="order-info price">{{ order.price }}</span>
        <div class="bar" :style="getStyles(order.filled)" />
      </div>
    </div>
    <div v-else class="stock-book-sell--no-asks">No opened asks</div>
    <div :class="getComputedClassTrend()">
      <div v-if="noOpenAsksOrBids">
        <span class="mark-price">{{ asksFormatted[asksFormatted.length - 1].price }}</span>
        <s-icon class="trend-icon" :name="iconTrend" size="18" />
        <span class="last-traded-price">{{ fiatValue }}</span>
      </div>
    </div>
    <div v-if="bidsFormatted.length" class="stock-book-buy">
      <div v-for="order in getBuyOrders()" :key="order.price" class="row">
        <span class="order-info">{{ order.total }}</span>
        <span class="order-info">{{ order.amount }}</span>
        <span class="order-info price">{{ order.price }}</span>
        <div class="bar" :style="getStyles(order.filled)" />
      </div>
    </div>
    <div v-else class="stock-book-buy--no-bids">No opened bids</div>
  </div>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/util';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { action, getter, state } from '@/store/decorators';

import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

type PriceTrend = 'up' | 'down';

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

  volumeAsks = FPNumber.ZERO;
  volumeBids = FPNumber.ZERO;
  priceTrend: PriceTrend = 'up';
  maxRowsNumber = 10;

  asksFormatted: Array<LimitOrderForm> = [];
  bidsFormatted: Array<LimitOrderForm> = [];

  // Widget subscription data
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

  // Widget subscription close
  beforeDestroy(): void {
    this.unsubscribeFromBidsAndAsks();
  }

  get iconTrend(): string {
    return this.priceTrend === 'up' ? 'arrows-arrow-bold-top-24' : 'arrows-arrow-bold-bottom-24';
  }

  get fiatValue(): string {
    const fiat = this.getFiatAmount(
      this.asksFormatted[this.asksFormatted.length - 1].price.toString(),
      this.quoteAsset
    );

    return fiat ? `$${fiat}` : '';
  }

  get orderBookTooltip() {
    return 'A live, constantly updating record of buy (bid) and sell (ask) orders for a specific asset, organized by price level. The order book displays the depth of the market, including the quantities of assets being offered at various prices. Traders utilize this detailed view to gauge market sentiment, identify potential resistance and support levels, and anticipate price movements based on existing demand and supply';
  }

  getComputedClassTrend(): string {
    const base = ['stock-book-delimiter'];

    if (this.priceTrend === 'up') {
      base.push('stock-book-delimiter--up');
    } else {
      base.push('stock-book-delimiter--down');
    }

    return base.join(' ');
  }

  get noOpenAsksOrBids(): boolean {
    return !!(this.asksFormatted.length && this.bidsFormatted.length);
  }

  getSellOrders() {
    return this.asksFormatted.slice(-this.maxRowsNumber);
  }

  getBuyOrders() {
    return this.bidsFormatted.slice(0, this.maxRowsNumber);
  }

  getHeight() {
    if (this.asks.length < 10) {
      const margin = this.maxRowsNumber - this.asks.length;
      return `height: ${24 * margin}px`;
    }

    return `height: 0px`;
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

  @Watch('asks')
  @Watch('bids')
  async prepareLimitOrders(): Promise<void> {
    this.asksFormatted = [];
    this.bidsFormatted = [];
    this.volumeAsks = FPNumber.ZERO;
    this.volumeBids = FPNumber.ZERO;

    if (this.asks?.length > this.maxRowsNumber || this.bids?.length < this.maxRowsNumber) {
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
      }
    } else {
      const aggregatedAsks = this.calculateStepsDistribution(this.asks);
      const aggregatedBids = this.calculateStepsDistribution(this.bids);

      if (aggregatedAsks?.length) {
        const maxAskAmount = FPNumber.max(...aggregatedAsks.map((order) => order[1])) as FPNumber;

        aggregatedAsks.forEach((row: [FPNumber, FPNumber, FPNumber]) => {
          // ignore void amount record, do not push
          if (row[1].isZero()) return;

          const price = row[0].toNumber();
          const amount = row[1].toNumber();
          const total = row[2];

          this.volumeAsks = this.volumeAsks.add(total);

          this.asksFormatted.push({
            price,
            amount,
            total: total.toNumber(),
            filled: this.getAmountProportion(row[1], maxAskAmount),
          });
        });
      }

      if (aggregatedBids?.length) {
        const maxBidAmount = FPNumber.max(...aggregatedBids.map((order) => order[1])) as FPNumber;

        aggregatedBids.forEach((row: [FPNumber, FPNumber, FPNumber]) => {
          // ignore void amount record, do not push
          if (row[1].isZero()) return;

          const price = row[0].toNumber();
          const amount = row[1].toNumber();
          const total = row[2];

          this.volumeBids = this.volumeBids.add(total);

          this.bidsFormatted.push({
            price,
            amount,
            total: total.toNumber(),
            filled: this.getAmountProportion(row[1], maxBidAmount),
          });
        });
      }
    }

    // this.setVolume(this.volumeAsks.add(this.volumeBids).toFixed(4).toString());
  }
}
</script>

<style lang="scss">
$row-height: 24px;
$background-column-color-light: #e7dadd;
$background-column-color-dark: #693d81;

.stock-book {
  .row {
    display: flex;
    justify-content: space-between;
    margin: 2px;
    transform-style: preserve-3d;
  }

  &__title {
    height: 40px;
    line-height: 40px;
    font-weight: 500;
    font-size: 17px;
    margin-left: 16px;

    .el-tooltip {
      margin-left: 8px;
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
