<template>
  <div class="order-book-widget stock-book book">
    <h4>
      Orderbook
      <s-tooltip slot="suffix" border-radius="mini" :content="t('alerts.typeTooltip')" placement="top" tabindex="-1">
        <s-icon name="info-16" size="14px" />
      </s-tooltip>
    </h4>
    <div class="book-columns">
      <div>total</div>
      <div>amount</div>
      <div>price</div>
    </div>
    <div class="stock-book-sell">
      <div v-for="order in getSellOrders()" :key="order.price" class="row">
        <span class="order-info price">{{ order.price }}</span>
        <span class="order-info">{{ order.amount }}</span>
        <span class="order-info">{{ order.total }}</span>
        <div class="bar" :style="getStyles(order.filled)" />
      </div>
    </div>
    <div :class="getComputedClassTrend()">
      <span class="mark-price">22.386800</span>
      <s-icon class="trend-icon" :name="iconTrend" size="18" />
      <span class="last-traded-price">$22.54</span>
    </div>
    <div class="stock-book-buy">
      <div v-for="order in getBuyOrders()" :key="order.price" class="row">
        <span class="order-info price">{{ order.price }}</span>
        <span class="order-info">{{ order.amount }}</span>
        <span class="order-info">{{ order.total }}</span>
        <div class="bar" :style="getStyles(order.filled)" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/util';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { state, action, mutation } from '@/store/decorators';
import { delay } from '@/utils';

type PriceTrend = 'up' | 'down';

interface LimitOrderForm {
  price: number;
  amount: number;
  total: number;
  filled?: number;
}

@Component
export default class BookWidget extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  @state.orderBook.asks asks!: any;
  @state.orderBook.bids bids!: any;
  @state.orderBook.baseAssetAddress baseAssetAddress!: string;

  @mutation.orderBook.resetAsks resetAsks!: () => void;
  @mutation.orderBook.resetBids resetBids!: () => void;

  @action.orderBook.subscribeToOrderBook private subscribeToOrderBook!: ({ base }) => Promise<void>;

  priceTrend: PriceTrend = 'down';
  maxRowsNumber = 9;

  asksFormatted: Array<LimitOrderForm> = [];
  bidsFormatted: Array<LimitOrderForm> = [];

  get iconTrend(): string {
    return this.priceTrend === 'up' ? 'arrows-arrow-bold-top-24' : 'arrows-arrow-bold-bottom-24';
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

  getSellOrders() {
    return this.asksFormatted.slice(0, this.maxRowsNumber);
  }

  getBuyOrders() {
    return this.bidsFormatted.slice(0, this.maxRowsNumber);
  }

  getStyles(filled) {
    return `width: ${filled}%`;
  }

  async prepareLimitOrders(): Promise<void> {
    if (this.asks.length) {
      this.asks.forEach((row: [FPNumber, FPNumber]) => {
        const price = row[0].toNumber();
        const amount = row[1].toNumber();
        const total = row[0].mul(row[1]).toNumber();

        this.asksFormatted.push({ price, amount, total });
      });
    }

    if (this.bids.length) {
      this.bids.forEach((row: [FPNumber, FPNumber]) => {
        const price = row[0].toNumber();
        const amount = row[1].toNumber();
        const total = row[0].mul(row[1]).toNumber();

        this.bidsFormatted.push({ price, amount, total });
      });
    }
  }

  async withLimitOrdersSet<T = void>(func: FnWithoutArgs<T>): Promise<T> {
    const nonEmptyStock = this.asks.length || this.bids.length;

    if (!nonEmptyStock) {
      await delay();
      return await this.withLimitOrdersSet(func);
    } else {
      return func();
    }
  }

  @Watch('baseAssetAddress')
  private async subscribeToOrderBookUpdates(baseAssetAddress: Nullable<string>): Promise<void> {
    if (baseAssetAddress) {
      await this.withLoading(async () => {
        // wait for node connection & wallet init (App.vue)
        await this.withParentLoading(async () => {
          this.asksFormatted = [];
          this.bidsFormatted = [];

          await this.subscribeToOrderBook({ base: baseAssetAddress });
          await this.withLimitOrdersSet(async () => {
            this.prepareLimitOrders();
          });
        });
      });
    }
  }
}
</script>

<style lang="scss">
$row-height: 24px;

.stock-book {
  .row {
    display: flex;
    justify-content: space-between;
    margin: 2px;
    transform-style: preserve-3d;
  }

  .order-info {
    padding: 4px 16px 4px 16px;
    transform: scaleX(-1);
  }

  &-buy,
  &-sell {
    height: $row-height * 9;
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
    background: #e7dadd;
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
</style>
