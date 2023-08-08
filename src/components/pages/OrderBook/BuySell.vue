<template>
  <div class="order-book">
    <el-popover trigger="click" :visible-arrow="false">
      <pair-list-popover />
      <div slot="reference">
        <div class="order-book-choose-pair" @click="openSelectPair">
          <div>TOKEN PAIR</div>
          <div class="order-book-choose-btn">
            <div class="order-book-pair-name">
              <pair-token-logo :first-token="baseAsset" :second-token="quoteAsset" />
              <span>{{ `${quoteSymbol}-${baseSymbol}` }}</span>
              <s-icon name="arrows-swap-90-24" class="order-book-swap-icon" />
            </div>
            <s-icon :name="icon" class="order-book-choose-btn-icon" />
          </div>
          <div class="delimiter" />
          <div class="order-book-pair-data">
            <div class="order-book-pair-data-item"><span>Price</span><span>834,104.00</span></div>
            <div class="order-book-pair-data-item"><span>Change</span><span>+12.90%</span></div>
            <div class="order-book-pair-data-item"><span>Volume</span><span>381,381.00</span></div>
          </div>
        </div>
      </div>
    </el-popover>

    <s-tabs class="order-book-tab" v-model="activeTab" type="rounded" @click="handleTabClick">
      <s-tab label="limit" name="limit">
        <span slot="label">
          <span>{{ 'Limit' }}</span>
          <s-tooltip
            slot="suffix"
            border-radius="mini"
            :content="t('alerts.typeTooltip')"
            placement="top"
            tabindex="-1"
          >
            <s-icon name="info-16" size="14px" />
          </s-tooltip>
        </span>
      </s-tab>
      <s-tab label="market" name="market">
        <span slot="label">
          <span>{{ 'Market' }}</span>
          <s-tooltip
            slot="suffix"
            border-radius="mini"
            :content="t('alerts.typeTooltip')"
            placement="top"
            tabindex="-1"
          >
            <s-icon name="info-16" size="14px" />
          </s-tooltip>
        </span>
      </s-tab>
    </s-tabs>

    <token-input
      :balance="getTokenBalance(baseAsset)"
      :is-max-available="false"
      :title="'Limit price'"
      :token="baseAsset"
      :value="baseValue"
      @input="handleInputFieldBase"
      class="order-book-input"
    />

    <token-input
      :balance="getTokenBalance(quoteAsset)"
      :is-max-available="isMaxSwapAvailable"
      :title="'Amount'"
      :token="quoteAsset"
      :value="quoteValue"
      @input="handleInputFieldQuote"
      @max="handleMaxValue"
      class="order-book-input"
    />

    <!-- <date-picker /> -->

    <div class="order-book-total">
      <span class="order-book-total-title">TOTAL</span>
      <div class="order-book-total-value">
        <span class="order-book-total-value-amount">{{ `${calculatedAssetBaseTotal} ${baseSymbol}` }}</span>
        <span class="order-book-total-value-fiat"><span class="dollar-sign">$</span>{{ `${fiatAmount}` }}</span>
      </div>
    </div>

    <s-button type="primary" class="buy-btn s-typography-button--medium" @click="handleConfirm">
      <span> {{ t(buttonText) }}</span>
    </s-button>
    <book-transaction-details :info-only="false" class="info-line-container" />
  </div>
</template>

<script lang="ts">
import { FPNumber, Operation } from '@sora-substrate/util';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components, LimitOrderSide } from '@/consts';
import { lazyComponent } from '@/router';
import { getter, mutation, state } from '@/store/decorators';
import { OrderBookTabs } from '@/types/tabs';
import {
  isMaxButtonAvailable,
  getMaxValue,
  hasInsufficientBalance,
  hasInsufficientXorForFee,
  asZeroValue,
  getAssetBalance,
  debouncedInputHandler,
} from '@/utils';

import type { CodecString, NetworkFeesObject } from '@sora-substrate/util';
import type { AccountAsset, Asset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    DatePicker: lazyComponent(Components.DatePicker),
    BookTransactionDetails: lazyComponent(Components.BookTransactionDetails),
    TokenInput: lazyComponent(Components.TokenInput),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    PairListPopover: lazyComponent(Components.PairListPopover),
  },
})
export default class BuySellWidget extends Mixins(TranslationMixin, mixins.FormattedAmountMixin, mixins.LoadingMixin) {
  @state.orderBook.baseValue baseValue!: string;
  @state.orderBook.quoteValue quoteValue!: string;
  @state.orderBook.side side!: LimitOrderSide;
  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;

  @getter.assets.xor private xor!: AccountAsset;
  @getter.orderBook.baseAsset baseAsset!: AccountAsset;
  @getter.orderBook.quoteAsset quoteAsset!: AccountAsset;
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;

  @mutation.orderBook.setBaseValue setBaseValue!: (value: string) => void;
  @mutation.orderBook.setQuoteValue setQuoteValue!: (value: string) => void;

  currentTypeTab: OrderBookTabs = OrderBookTabs.Limit;

  isSelectPairOpen = false;

  activeTab = 'limit';

  readonly OrderBookTabs = OrderBookTabs;

  get buttonText(): string {
    if (!this.isLoggedIn) {
      return 'connectWalletText';
    }

    if (this.side === LimitOrderSide.buy) return `Buy XOR`;
    else return 'Sell XOR';
  }

  get icon(): string {
    return this.isSelectPairOpen ? 'arrows-circle-chevron-top-24' : 'arrows-circle-chevron-bottom-24';
  }

  get baseSymbol(): string {
    return this.baseAsset ? this.baseAsset.symbol : '';
  }

  get quoteSymbol(): string {
    return this.quoteAsset ? this.quoteAsset.symbol : '';
  }

  getTokenBalance(token: AccountAsset): CodecString {
    return getAssetBalance(token);
  }

  get networkFee(): CodecString {
    // TODO: change to Operation.OrderBook(Buy/Sell)
    return this.networkFees[Operation.Swap];
  }

  get areTokensSelected(): boolean {
    return !!(this.baseAsset && this.quoteAsset);
  }

  get calculatedAssetBaseTotal(): FPNumber {
    const baseValue = FPNumber.fromNatural(this.baseValue);
    const quoteValue = FPNumber.fromNatural(this.quoteValue);

    return baseValue.mul(quoteValue);
  }

  get fiatAmount(): string {
    if (!this.areTokensSelected) return '0.00';

    const fiat = this.getFiatAmount(this.calculatedAssetBaseTotal.toString(), this.baseAsset);

    return FPNumber.fromNatural(fiat || '0').toFixed(2);
  }

  handleInputFieldBase(value: string): void {
    this.setBaseValue(value);
  }

  handleInputFieldQuote(value: string): void {
    this.setQuoteValue(value);
  }

  handleMaxValue(): void {
    const max = getMaxValue(this.quoteAsset, this.networkFee);

    this.handleInputFieldQuote(max);
  }

  openSelectPair(): void {
    this.isSelectPairOpen = !this.isSelectPairOpen;
  }

  get isMaxSwapAvailable(): boolean {
    if (!(this.baseAsset && this.quoteAsset)) return false;

    return (
      this.isLoggedIn &&
      isMaxButtonAvailable(
        this.areTokensSelected,
        this.quoteAsset,
        this.quoteValue,
        this.networkFee,
        this.xor,
        false,
        true
      )
    );
  }

  handleTabClick(): void {}

  handleConfirm(): void {}
}
</script>

<style lang="scss">
.setup-price-alert {
  @include custom-tabs;

  &__tab {
    margin-bottom: #{$basic-spacing-medium};
  }
}

.buy-btn {
  width: 100%;
  background-color: #34ad87 !important;
}
</style>

<style lang="scss" scoped>
.order-book {
  padding: 4px 16px 32px;

  &-choose-pair {
    width: 100%;
    background: var(--base-day-background, #f4f0f1);
    border-radius: 20px;
    margin-bottom: 8px;
    padding: 10px 16px;
  }

  &-choose-btn {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 6px;

    &-icon {
      color: var(--s-color-base-content-secondary);
      filter: drop-shadow(1px 1px 5px rgba(0, 0, 0, 0.01)) drop-shadow(-1px -1px 5px rgba(0, 0, 0, 0.01));

      &:hover {
        cursor: pointer;
      }
    }
  }

  &-pair-name {
    display: flex;
    align-items: center;
    font-size: 20px;
    font-weight: 700;
  }

  &-pair-data {
    display: flex;
    color: var(--s-color-base-content-secondary);

    &-item {
      display: flex;
      flex-direction: column;
      margin-right: 42px;
    }
  }

  &-swap-icon {
    color: var(--s-color-base-content-secondary);
    margin-left: 8px;
  }

  .order-book {
    &-total {
      display: flex;
      justify-content: space-between;
      margin: 8px 0 16px 0;

      &-value {
        &-amount {
          font-weight: 700;
          margin-right: 6px;
        }
        &-fiat {
          color: var(--s-color-fiat-value);
          font-family: var(--s-font-family-default);
          font-weight: 400;
          line-height: var(--s-line-height-medium);
          letter-spacing: var(--s-letter-spacing-small);

          .dollar-sign {
            opacity: 0.6;
            margin-right: 2px;
          }
        }
      }
    }
  }

  .delimiter {
    background: var(--s-color-base-border-secondary);
    margin: 8px 0;
    height: 1px;
    width: 100%;
  }
}

.s-tabs.order-book-tab.el-tabs {
  i.s-icon-info-16 {
    margin-left: 6px;
  }
}
</style>

<style lang="scss">
.order-book {
  &-input {
    margin-bottom: 8px;

    .el-input__inner {
      font-size: var(--s-font-size-large);
      line-height: var(--s-line-height-small);
      font-weight: 700;
    }
  }
}
</style>
