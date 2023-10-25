<template>
  <div class="order-book order-books">
    <el-popover popper-class="order-book-whitelist" trigger="click" :visible-arrow="false">
      <pair-list-popover />
      <div slot="reference">
        <div class="order-book-choose-pair" @click="openSelectPair">
          <div>TOKEN PAIR</div>
          <div class="order-book-choose-btn">
            <div class="order-book-pair-name">
              <pair-token-logo :first-token="quoteAsset" :second-token="baseAsset" />
              <span>{{ `${quoteSymbol}-${baseSymbol}` }}</span>
              <s-icon name="arrows-swap-90-24" class="order-book-swap-icon" />
            </div>
            <s-icon :name="icon" class="order-book-choose-btn-icon" />
          </div>
          <div class="delimiter" />
          <div class="order-book-pair-data">
            <div class="order-book-pair-data-item">
              <span>Price </span>
              <span class="price">
                <formatted-amount class="sora-card-hub-balance" :value="bookPrice" fiatSign="" is-fiat-value />
              </span>
            </div>
            <div class="order-book-pair-data-item"><span>Change</span><span class="change">+12.90%</span></div>
            <div class="order-book-pair-data-item">
              <span>Volume</span><span class="volume">{{ volume }}</span>
            </div>
          </div>
        </div>
      </div>
    </el-popover>

    <s-tabs class="order-book__tab" v-model="limitOrderType" type="rounded" @click="handleTabClick(limitOrderType)">
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
      :balance="getTokenBalance(quoteAsset)"
      :is-max-available="false"
      :title="'price'"
      :token="quoteAsset"
      :value="quoteValue"
      :disabled="isPriceInputDisabled"
      @input="handleInputFieldQuote"
      class="order-book-input"
    />

    <token-input
      :balance="getTokenBalance(baseAsset)"
      :is-max-available="isMaxSwapAvailable"
      :title="'Amount'"
      :token="baseAsset"
      :value="baseValue"
      @input="handleInputFieldBase"
      @change="changeInputBase"
      @max="handleMaxValue"
      class="order-book-input"
    />

    <div class="order-book-total">
      <span class="order-book-total-title">TOTAL</span>
      <div class="order-book-total-value">
        <span class="order-book-total-value-amount">{{ `${calculatedAssetBaseTotal} ${baseSymbol}` }}</span>
        <span class="order-book-total-value-fiat"><span class="dollar-sign">$</span>{{ `${fiatAmount}` }}</span>
      </div>
    </div>

    <s-button
      type="primary"
      class="btn s-typography-button--medium"
      :class="computedBtnClass"
      @click="placeLimitOrder"
      :disabled="buttonDisabled()"
    >
      <span> {{ t(buttonText) }}</span>
    </s-button>
    <book-transaction-details
      v-if="areTokensSelected && !hasZeroAmount"
      :info-only="false"
      class="info-line-container"
    />
    <place-confirm
      :visible.sync="confirmPlaceOrderVisibility"
      :isInsufficientBalance="isInsufficientBalance"
      @confirm="resetValues"
    />
  </div>
</template>

<script lang="ts">
import { PriceVariant, OrderBookStatus } from '@sora-substrate/liquidity-proxy';
import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import { FPNumber, Operation } from '@sora-substrate/util';
import { components, mixins, api } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components, LimitOrderType, PageNames } from '@/consts';
import router, { lazyComponent } from '@/router';
import { action, getter, mutation, state } from '@/store/decorators';
import { OrderBookTabs } from '@/types/tabs';
import { isMaxButtonAvailable, getMaxValue, getAssetBalance, asZeroValue, hasInsufficientBalance } from '@/utils';

import type { CodecString, NetworkFeesObject } from '@sora-substrate/util';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';
import type { DexId } from '@sora-substrate/util/build/dex/consts';
import type { Subscription } from 'rxjs';

@Component({
  components: {
    DatePicker: lazyComponent(Components.DatePicker),
    BookTransactionDetails: lazyComponent(Components.BookTransactionDetails),
    TokenInput: lazyComponent(Components.TokenInput),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    PairListPopover: lazyComponent(Components.PairListPopover),
    PlaceConfirm: lazyComponent(Components.PlaceOrder),
    CancelConfirm: lazyComponent(Components.CancelOrder),
    FormattedAmount: components.FormattedAmount,
  },
})
export default class BuySellWidget extends Mixins(TranslationMixin, mixins.FormattedAmountMixin, mixins.LoadingMixin) {
  @state.orderBook.baseValue baseValue!: string;
  @state.orderBook.quoteValue quoteValue!: string;
  @state.orderBook.currentOrderBook currentOrderBook!: any;
  @state.orderBook.volume volume!: string;
  @state.orderBook.side side!: PriceVariant;
  @state.orderBook.asks asks!: any;
  @state.orderBook.bids bids!: any;
  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;

  @getter.assets.xor private xor!: AccountAsset;
  @getter.orderBook.baseAsset baseAsset!: AccountAsset;
  @getter.orderBook.quoteAsset quoteAsset!: AccountAsset;
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @getter.swap.swapLiquiditySource private liquiditySource!: Nullable<LiquiditySourceTypes>;
  @getter.swap.tokenFrom tokenFrom!: Nullable<AccountAsset>;
  @getter.swap.tokenTo tokenTo!: Nullable<AccountAsset>;

  @mutation.orderBook.setBaseValue setBaseValue!: (value: string) => void;
  @mutation.orderBook.setQuoteValue setQuoteValue!: (value: string) => void;

  @mutation.swap.setFromValue private setFromValue!: (value: string) => void;
  @mutation.swap.setToValue private setToValue!: (value: string) => void;
  @mutation.swap.setLiquiditySource setLiquiditySource!: (liquiditySource: string) => void;
  @mutation.swap.selectDexId private selectDexId!: (dexId: DexId) => void;

  @action.swap.setTokenFromAddress private setTokenFromAddress!: (address?: string) => Promise<void>;
  @action.swap.setTokenToAddress private setTokenToAddress!: (address?: string) => Promise<void>;

  confirmPlaceOrderVisibility = false;
  confirmCancelOrderVisibility = false;
  quoteSubscription: Nullable<Subscription> = null;
  marketQuotePrice = '0';

  @Watch('side')
  @Watch('baseAsset')
  private handleSideChange(): void {
    this.handleTabClick(this.limitOrderType);
  }

  @Watch('baseAsset')
  @Watch('quoteAsset')
  private setTokens(): void {
    if (!this.baseAsset || !this.quoteAsset) return;

    if (this.side === PriceVariant.Buy) {
      this.setTokenFromAddress(this.quoteAsset.address);
      this.setTokenToAddress(this.baseAsset.address);
    } else if (this.side === PriceVariant.Sell) {
      this.setTokenFromAddress(this.baseAsset.address);
      this.setTokenToAddress(this.quoteAsset.address);
    }
  }

  isSelectPairOpen = false;

  limitOrderType: LimitOrderType = LimitOrderType.limit;

  readonly OrderBookTabs = OrderBookTabs;

  get buttonText(): string {
    if (!this.isLoggedIn) {
      return 'connectWalletText';
    }

    if (this.isNotAllowedToPlace()) return 'book stopped';

    if (this.isInsufficientBalance) return `Insufficient ${this.tokenFrom?.symbol} balance`;

    if (this.limitOrderType === LimitOrderType.limit) {
      if (!this.quoteValue) return 'set price';
      if (!this.baseValue) return 'enter amount';
      if (this.isOutOfAmountBounds) return 'out of constraints';
      if (this.isPriceTooHigh) return 'price too high';
      if (this.isPriceTooLow) return 'price too low';
      if (!this.isPriceBeyondPrecision) return 'price too exact';

      if (this.side === PriceVariant.Buy) return `Buy ${this.baseAsset.symbol}`;
      else return `Sell ${this.baseAsset.symbol}`;
    } else {
      if (!this.baseValue) return 'enter amount';
      if (this.isOutOfAmountBounds) return 'out of constraints';
      if (!this.marketQuotePrice) return 'Insufficient liquidity';
      if (this.side === PriceVariant.Buy) return `Buy ${this.baseAsset.symbol}`;
      else return `Sell ${this.baseAsset.symbol}`;
    }
  }

  get bookPrice(): string {
    if (this.asks?.length) {
      return this.asks[this.asks.length - 1][0].toString();
    } else if (this.bids?.length) {
      return this.bids[0][0].toString();
    } else return '';
  }

  get isZeroFromAmount(): boolean {
    return asZeroValue(this.baseValue);
  }

  get isZeroToAmount(): boolean {
    return asZeroValue(this.quoteValue);
  }

  get hasZeroAmount(): boolean {
    return this.isZeroFromAmount || this.isZeroToAmount;
  }

  buttonDisabled(): boolean {
    if (this.isNotAllowedToPlace()) return true;

    if (!this.isLoggedIn) return false;

    if (this.isInsufficientBalance) return true;

    if (this.limitOrderType === LimitOrderType.limit) {
      if (!this.baseValue || !this.quoteValue) return true;
      if (this.isPriceTooHigh) return true;
      if (this.isPriceTooLow) return true;
      if (!this.isPriceBeyondPrecision) return true;
      return this.isOutOfAmountBounds;
    } else {
      if (!this.baseValue) return true;
      if (!this.marketQuotePrice) return true;
      return this.isOutOfAmountBounds;
    }
  }

  get isPriceTooHigh(): boolean {
    if (!this.asks.length) return false;

    if (this.side === PriceVariant.Sell) {
      if (!this.asks[this.asks.length - 1]) return false;
      const bestAsk: FPNumber = this.asks[this.asks.length - 1][0];
      const fiftyPercentDelta = bestAsk.mul(new FPNumber(1.5));
      const price = new FPNumber(this.quoteValue, 18);

      if (FPNumber.gt(price, fiftyPercentDelta)) return true;
    }

    return false;
  }

  get isPriceTooLow(): boolean {
    if (!this.bids.length) return false;

    if (this.side === PriceVariant.Buy) {
      if (!this.bids[0]) return false;
      const bestBid: FPNumber = this.bids[0][0];
      const fiftyPercentDelta = bestBid.div(FPNumber.TWO);
      const price = new FPNumber(this.quoteValue, 18);

      if (FPNumber.lt(price, fiftyPercentDelta)) return true;
    }

    return false;
  }

  get isPriceBeyondPrecision(): boolean {
    if (!this.currentOrderBook) return false;
    const book: any = Object.values(this.currentOrderBook)[0];
    const tickSize = book.tickSize;
    const price = new FPNumber(this.quoteValue, 18);

    return price.isZeroMod(tickSize);
  }

  get isOutOfAmountBounds(): boolean {
    if (!this.currentOrderBook) return false;
    const book: any = Object.values(this.currentOrderBook)[0];
    const stepLotSize = book.stepLotSize;
    const maxLotSize = book.maxLotSize;
    const minLotSize = book.minLotSize;
    const amount = new FPNumber(this.baseValue, 18);

    return !(FPNumber.lte(amount, maxLotSize) && FPNumber.gte(amount, minLotSize) && amount.isZeroMod(stepLotSize));
  }

  get computedBtnClass(): string {
    if (!this.isLoggedIn) return '';
    return this.side === 'Buy' ? 'buy-btn' : '';
  }

  get isPriceInputDisabled(): boolean {
    return this.limitOrderType === LimitOrderType.market;
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

  handleInputFieldQuote(value: string): void {
    this.setQuoteValue(value);
  }

  changeInputBase(): void {}

  handleInputFieldBase(value: string): void {
    this.setBaseValue(value);

    if (!value) {
      this.setQuoteValue('');
      this.resetQuoteSubscription();
    }

    if (this.limitOrderType === LimitOrderType.market && value) {
      this.subscribeOnBookQuote();
    }
  }

  get preparedForSwap(): boolean {
    return this.isLoggedIn && this.areTokensSelected;
  }

  get isInsufficientBalance(): boolean {
    if (!this.tokenFrom) return false;

    let fromValue;

    // TODO: add market order validation
    if (this.isBuySide) {
      const quoteFP = new FPNumber(this.quoteValue);
      const baseFP = new FPNumber(this.baseValue);
      fromValue = quoteFP.mul(baseFP).toString();
    } else {
      fromValue = this.baseValue;
    }

    return this.preparedForSwap && hasInsufficientBalance(this.tokenFrom, fromValue, this.networkFee);
  }

  async placeLimitOrder(): Promise<void> {
    if (!this.isLoggedIn) {
      router.push({ name: PageNames.Wallet });
      return;
    }

    // TODO: add confirm dialog for placement
    // this.showConfirmMarketSwapDialog();
    if (this.limitOrderType === LimitOrderType.limit) {
      api.orderBook.placeLimitOrder(
        this.baseAsset.address,
        this.quoteAsset.address,
        new FPNumber(this.quoteValue, FPNumber.DEFAULT_PRECISION).toCodecString(),
        new FPNumber(this.baseValue, FPNumber.DEFAULT_PRECISION).toCodecString(),
        this.side
      );

      this.resetValues();
    } else if (this.limitOrderType === LimitOrderType.market) {
      this.subscribeOnBookQuote();
      this.showConfirmMarketSwapDialog();
    }
  }

  isNotAllowedToPlace(): boolean {
    if (!this.currentOrderBook) return false;
    const book: any = Object.values(this.currentOrderBook)[0];
    return ![OrderBookStatus.Trade, OrderBookStatus.PlaceAndCancel].includes(book.status);
  }

  get isBuySide(): boolean {
    return this.side === PriceVariant.Buy;
  }

  private resetQuoteSubscription(): void {
    this.quoteSubscription?.unsubscribe();
    this.quoteSubscription = null;
  }

  private subscribeOnBookQuote(): void {
    if (!this.baseValue) return;
    this.resetQuoteSubscription();

    if (!this.areTokensSelected) return;

    const observableQuote = api.swap.subscribeOnResultRpc(
      (this.tokenFrom as AccountAsset).address,
      (this.tokenTo as AccountAsset).address,
      this.baseValue,
      false,
      LiquiditySourceTypes.OrderBook
    );

    this.quoteSubscription = observableQuote.subscribe(async (quoteData) => {
      const { amount } = await quoteData;

      if (FPNumber.fromCodecValue(amount).isZero()) {
        this.setQuoteValue('');
        this.setToValue('');
        this.marketQuotePrice = '';
        return;
      }

      this.marketQuotePrice = this.isBuySide
        ? FPNumber.fromNatural(this.baseValue).div(FPNumber.fromCodecValue(amount)).toString()
        : FPNumber.fromCodecValue(amount).div(FPNumber.fromNatural(this.baseValue)).toString();

      this.prepareValuesForSwap(amount);
    });
  }

  prepareValuesForSwap(amount) {
    if (!this.areTokensSelected || asZeroValue(this.baseValue)) return;

    this.setFromValue(this.baseValue);
    this.setQuoteValue(this.marketQuotePrice);
    this.setToValue(this.getStringFromCodec(amount));
    this.setLiquiditySource('OrderBook');
    this.selectDexId(0);
  }

  resetValues() {
    this.setBaseValue('');
    this.setQuoteValue('');
    this.limitOrderType = LimitOrderType.limit;
  }

  showConfirmMarketSwapDialog(): void {
    this.confirmPlaceOrderVisibility = true;
  }

  handleMaxValue(): void {
    const maxCodec = getMaxValue(this.baseAsset, this.networkFee);
    const book: any = Object.values(this.currentOrderBook)[0];
    const maxLotSize: FPNumber = book.maxLotSize;
    const maxPossible = FPNumber.fromCodecValue(maxCodec);

    if (FPNumber.lte(maxPossible, maxLotSize)) {
      this.handleInputFieldBase(maxCodec);
    } else {
      this.handleInputFieldBase(maxLotSize.toString());
    }
  }

  openSelectPair(): void {
    this.isSelectPairOpen = !this.isSelectPairOpen;
  }

  get isMaxSwapAvailable(): boolean {
    if (!(this.baseAsset && this.quoteAsset)) return false;

    return this.isLoggedIn && isMaxButtonAvailable(this.baseAsset, this.baseValue, this.networkFee, this.xor, true);
  }

  handleTabClick(limitOrderType: LimitOrderType): void {
    if (this.side === PriceVariant.Buy) {
      this.setTokenFromAddress(this.quoteAsset.address);
      this.setTokenToAddress(this.baseAsset.address);
    } else if (this.side === PriceVariant.Sell) {
      this.setTokenFromAddress(this.baseAsset.address);
      this.setTokenToAddress(this.quoteAsset.address);
    }

    if (limitOrderType === LimitOrderType.limit) {
      this.resetQuoteSubscription();
      this.setBaseValue('');
      this.setQuoteValue('');
    }

    if (limitOrderType === LimitOrderType.market) {
      this.setQuoteValue('');
      if (this.baseValue) this.subscribeOnBookQuote();
    }
  }
}
</script>

<style lang="scss">
.order-book {
  @include custom-tabs;

  &__tab {
    margin-bottom: #{$basic-spacing-medium};
  }
}

.order-book-whitelist.el-popover {
  border-radius: 20px;
  padding: 0;
}
.setup-price-alert {
  @include custom-tabs;

  &__tab {
    margin-bottom: #{$basic-spacing-medium};
  }
}

.btn {
  width: 100%;
}

.buy-btn {
  width: 100%;
  background-color: #34ad87 !important;
}

.buy-btn.is-disabled {
  background-color: unset !important;
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

      .price {
        color: var(--s-color-status-info);
      }

      .volume {
        color: var(--s-color-base-content-primary);
      }
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

.s-tabs.order-book__tab.el-tabs {
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