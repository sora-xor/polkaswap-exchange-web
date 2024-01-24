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
        v-if="showAggregationOptions"
        class="stock-book__switcher"
        trigger="click"
        :size="18"
        popper-class="stock-book-switcher"
      >
        {{ selectedStep }}
        <template slot="menu">
          <s-dropdown-item v-for="value in steps" :key="value" @click.native="handleSelectStep(value)">{{
            value
          }}</s-dropdown-item>
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
      <div
        v-for="order in sellOrders"
        :key="order.price"
        class="row"
        @click="fillPrice(order.price, PriceVariant.Sell)"
      >
        <span class="order-info total">{{ order.total }}</span>
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
      <div v-for="order in buyOrders" :key="order.price" class="row" @click="fillPrice(order.price, PriceVariant.Buy)">
        <span class="order-info total">{{ order.total }}</span>
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
import { action, getter, mutation, state } from '@/store/decorators';
import type { OrderBookDealData } from '@/types/orderBook';

import type { OrderBookPriceVolume, OrderBook } from '@sora-substrate/liquidity-proxy';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

interface LimitOrderForm {
  price: string;
  amount: string;
  total: string;
  filled?: number;
}

type OrderBookPriceVolumeAggregated = [FPNumber, FPNumber, FPNumber];

@Component
export default class BookWidget extends Mixins(TranslationMixin, mixins.LoadingMixin, mixins.FormattedAmountMixin) {
  @state.orderBook.asks asks!: OrderBookPriceVolume[];
  @state.orderBook.bids bids!: OrderBookPriceVolume[];

  @getter.orderBook.quoteAsset quoteAsset!: AccountAsset;
  @getter.orderBook.orderBookLastDeal orderBookLastDeal!: Nullable<OrderBookDealData>;
  @getter.orderBook.currentOrderBook currentOrderBook!: OrderBook;
  @getter.orderBook.orderBookId private orderBookId!: string;
  @getter.settings.nodeIsConnected private nodeIsConnected!: boolean;

  @mutation.orderBook.setQuoteValue setQuoteValue!: (value: string) => void;
  @mutation.orderBook.setSide setSide!: (side: PriceVariant) => void;

  @action.orderBook.subscribeToBidsAndAsks private subscribeToBidsAndAsks!: AsyncFnWithoutArgs;

  readonly PriceVariant = PriceVariant;
  readonly maxRowsNumber = 11;

  selectedStep = '';
  scalerOpen = false;

  @Watch('currentOrderBook', { immediate: true })
  private setSteps() {
    this.selectedStep = this.currentOrderBook?.tickSize.toString();
  }

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

  handleSelectStep(value: string): void {
    this.selectedStep = value;
  }

  fillPrice(price: string, side: PriceVariant): void {
    this.setSide(side);
    this.setQuoteValue(Number(price).toString());
  }

  get averagePrice(): FPNumber | undefined {
    return (this.asks?.[0] ?? this.bids?.[0])?.[0];
  }

  get averagePricePrecision(): number | undefined {
    if (!this.averagePrice) return undefined;

    const price = this.averagePrice;

    let result = price;
    let max = FPNumber.ONE;

    if (price.isLessThan(FPNumber.ONE)) {
      const order = new FPNumber(0.1);
      max = order;
      while (result.isLessThan(FPNumber.ONE)) {
        result = price.div(max);
        if (result.isGreaterThanOrEqualTo(FPNumber.ONE)) break;
        max = max.mul(order);
      }
    } else if (price.isGreaterThan(FPNumber.TEN)) {
      const order = FPNumber.TEN;
      max = order;
      while (result.isGreaterThan(FPNumber.ONE)) {
        result = price.div(max);
        if (result.isLessThan(FPNumber.TEN)) break;
        max = max.mul(order);
      }
    }

    return max.toNumber();
  }

  get steps(): string[] {
    const steps: string[] = [];
    const min = this.currentOrderBook?.tickSize;

    if (!(this.averagePricePrecision && min)) return steps;

    const max = new FPNumber(this.averagePricePrecision ?? 1);

    for (let inBetweenStep = max; inBetweenStep.isGreaterThanOrEqualTo(min); ) {
      steps.push(inBetweenStep.toString());
      inBetweenStep = inBetweenStep.div(FPNumber.TEN);
    }

    // Remove this line if supporting all precisions
    steps.splice(steps.indexOf('1') + 1, Infinity, min.toString());

    return steps;
  }

  get showAggregationOptions(): boolean {
    return !!(this.asks?.length && this.bids?.length);
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

  get asksFormatted() {
    const aggregatedAsks = this.formatPriceVolumes(this.asks);
    const aggregatedBids = this.bidsFormatted;

    if (aggregatedAsks.length && aggregatedBids.length) {
      const bestAskPrice = aggregatedAsks[aggregatedAsks.length - 1]?.price;
      const bestBidPrice = aggregatedBids[0]?.price;
      const hasOverlap = bestAskPrice === bestBidPrice;

      if (hasOverlap) {
        const lastRecord = aggregatedAsks[aggregatedAsks.length - 1];
        const fpAmount = new FPNumber(lastRecord?.amount || 0);
        const fpTotal = new FPNumber(lastRecord?.total || 0);
        const lastButOne = aggregatedAsks[aggregatedAsks.length - 2];

        if (lastButOne) {
          const { price, amount, total, filled } = lastButOne;
          const lastButOneRecord = {
            price,
            amount: this.toBookPrecision(new FPNumber(amount).add(fpAmount)),
            total: this.toBookPrecision(new FPNumber(total).add(fpTotal)),
            filled,
          };

          aggregatedAsks[aggregatedAsks.length - 2] = lastButOneRecord;

          aggregatedAsks.pop();

          return this.recalcFilledValue(aggregatedAsks);
        } else {
          const { price } = aggregatedAsks[aggregatedAsks.length - 1];
          const newPrice = Number(price) + Number(this.selectedStep);
          aggregatedAsks[aggregatedAsks.length - 1].price = this.toBookPrecision(new FPNumber(newPrice));

          return aggregatedAsks;
        }
      }
    }

    return this.formatPriceVolumes(this.asks);
  }

  get bidsFormatted() {
    return this.formatPriceVolumes(this.bids);
  }

  get sellOrders() {
    return this.asksFormatted.slice(-this.maxRowsNumber);
  }

  get buyOrders() {
    return this.bidsFormatted.slice(0, this.maxRowsNumber);
  }

  getHeight() {
    const margin = this.asksFormatted.length < this.maxRowsNumber ? this.maxRowsNumber - this.asksFormatted.length : 0;
    return `height: ${24 * margin}px`;
  }

  getStyles(filled: number | undefined): string {
    return `width: ${filled}%`;
  }

  isBookPrecisionEqual(precision: string): boolean {
    return precision === this.currentOrderBook?.tickSize?.toString();
  }

  private recalcFilledValue(orders: LimitOrderForm[]): LimitOrderForm[] {
    if (!orders.length) return [];

    const fpAmounts = orders.map((order) => new FPNumber(order.amount));
    const maxAmount = FPNumber.max(...fpAmounts) as FPNumber;

    return orders.map((record: LimitOrderForm) => ({
      ...record,
      filled: this.getAmountProportion(new FPNumber(record.amount), maxAmount),
    }));
  }

  private calculateStepsDistribution(orders, precision = 10): OrderBookPriceVolumeAggregated[] {
    if (this.isBookPrecisionEqual(precision.toString())) return orders;

    const maxPrice = FPNumber.max(...orders.map(([price]) => price)) as FPNumber;

    if (!maxPrice) return orders;

    const step = new FPNumber(precision);

    const aggregatedOrders = [] as Array<OrderBookPriceVolumeAggregated>;
    let accumulatedAmount = FPNumber.ZERO;
    let accumulatedTotal = FPNumber.ZERO;
    let edge = maxPrice.add(step);

    if (!edge.isZeroMod(step)) edge = edge.sub(edge.mod(step));

    for (let index = 0; index < orders.length; index++) {
      const [price, amount] = orders[index];

      if (FPNumber.lte(edge, FPNumber.ZERO)) break;
      if (FPNumber.lt(edge, price)) break;

      if (FPNumber.lte(price, edge) && FPNumber.gt(price, edge.sub(step))) {
        accumulatedAmount = accumulatedAmount.add(amount);
        accumulatedTotal = price.mul(amount).add(accumulatedTotal);
      } else {
        aggregatedOrders.push([edge, accumulatedAmount, accumulatedTotal]);

        accumulatedAmount = FPNumber.ZERO;
        accumulatedTotal = FPNumber.ZERO;
        edge = edge.sub(step);
        index -= 1;
      }

      if (index === orders.length - 1) {
        aggregatedOrders.push([edge, accumulatedAmount, accumulatedTotal]);
      }
    }

    return aggregatedOrders.filter((row: OrderBookPriceVolumeAggregated) => !row[1].isZero());
  }

  get bookPrecision(): number {
    return this.currentOrderBook?.tickSize?.toString()?.split(FPNumber.DELIMITERS_CONFIG.decimal)[1]?.length;
  }

  private getAmountProportion(currentAmount: FPNumber, maxAmount: FPNumber): number {
    return currentAmount.div(maxAmount).mul(FPNumber.HUNDRED).toNumber();
  }

  private toBookPrecision(cell: FPNumber): string {
    return cell.toNumber().toFixed(this.bookPrecision);
  }

  private formatPriceVolumes(items: OrderBookPriceVolume[]): LimitOrderForm[] {
    if (!this.selectedStep) return [];
    const aggregated = this.calculateStepsDistribution(items, Number(this.selectedStep));
    const maxAmount = FPNumber.max(...aggregated.map((order) => order[1])) as FPNumber;
    const result: LimitOrderForm[] = [];

    aggregated.forEach((row: OrderBookPriceVolumeAggregated) => {
      const [price, amount, acc] = row;

      if (amount.isZero()) return;

      const total = this.isBookPrecisionEqual(this.selectedStep) ? price.mul(amount) : acc;

      result.push({
        price: this.toBookPrecision(price),
        amount: this.toBookPrecision(amount),
        total: this.toBookPrecision(total),
        filled: this.getAmountProportion(amount, maxAmount),
      });
    });

    return result;
  }
}
</script>

<style lang="scss">
$row-height: 24px;
$background-column-color-light: #e7dadd;
$background-column-color-dark: #693d81;

.stock-book {
  overflow: hidden;

  .row {
    display: flex;
    justify-content: space-between;
    transform-style: preserve-3d;
    font-family: 'JetBrains Mono';
    margin: 2px;
    &:hover {
      cursor: pointer;
    }
  }

  &__title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 40px;
    line-height: 40px;
    font-weight: 500;
    font-size: 17px;
    margin-left: $basic-spacing;

    .el-tooltip {
      margin-left: $inner-spacing-mini;
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
      font-weight: 800;
      margin-left: 4px;
      margin-bottom: 1px;
    }
  }

  &-switcher {
    background-color: var(--s-color-utility-surface) !important;
  }

  .order-info {
    width: 130px;
    padding: 4px $basic-spacing 4px $basic-spacing;
    transform: scaleX(-1);

    &.amount,
    &.total {
      text-align: end;
    }
  }

  &-buy,
  &-sell {
    height: $row-height * 12;
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
      font-size: var(--s-font-size-large);
      padding-left: $inner-spacing-big;
      font-weight: 450;
    }

    .last-traded-price {
      margin-left: $inner-spacing-big;
      font-size: var(--s-font-size-big);
      font-weight: 450;
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
    font-size: 14px;
    font-style: normal;
    font-weight: 550;
    line-height: 150%;
    letter-spacing: -0.26px;
    text-transform: uppercase;
  }

  h4 {
    margin: $basic-spacing 0 10px $basic-spacing;
    font-weight: 500;
  }
}

.stock-book-sell--no-asks,
.stock-book-buy--no-bids {
  margin-top: $basic-spacing;
  color: var(--s-color-base-content-tertiary);
  height: $row-height * 9.8;
  font-size: 17px;
  font-weight: 600;
  text-align: center;
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
