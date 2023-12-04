<template>
  <div class="order-book order-books">
    <el-popover popper-class="order-book-whitelist" trigger="click" v-model="visibleBookList" :visible-arrow="false">
      <pair-list-popover @close="toggleBookList" />
      <div slot="reference">
        <div class="order-book-choose-pair">
          <div>TOKEN PAIR</div>
          <div class="order-book-choose-btn">
            <div class="order-book-pair-name">
              <pair-token-logo :first-token="baseAsset" :second-token="quoteAsset" />
              <span v-if="baseAsset && quoteAsset">{{ `${baseSymbol}-${quoteSymbol}` }}</span>
            </div>
            <s-icon :name="icon" class="order-book-choose-btn-icon" />
          </div>
          <div class="delimiter" />
          <div class="order-book-pair-data">
            <div class="order-book-pair-data-item">
              <span>Price</span>
              <span class="order-book-pair-data-item__value order-book-fiat">
                <formatted-amount :value="orderBookPrice" />
              </span>
            </div>
            <div class="order-book-pair-data-item">
              <span>Change</span>
              <span class="order-book-pair-data-item__value">
                <price-change :value="orderBookPriceChange" />
              </span>
            </div>
            <div class="order-book-pair-data-item">
              <span>1D Volume</span>
              <span class="order-book-pair-data-item__value">
                <formatted-amount :value="orderBookVolume" is-fiat-value />
              </span>
            </div>
          </div>
        </div>
      </div>
    </el-popover>

    <s-tabs class="order-book__tab" v-model="limitOrderType" type="rounded" @click="handleTabClick(limitOrderType)">
      <s-tab label="limit" name="limit">
        <span slot="label">
          <span>{{ 'Limit' }}</span>
          <s-tooltip slot="suffix" border-radius="mini" :content="limitTooltip" placement="top" tabindex="-1">
            <s-icon name="info-16" size="14px" />
          </s-tooltip>
        </span>
      </s-tab>
      <s-tab label="market" name="market" :disabled="marketOptionDisabled">
        <span slot="label">
          <span>{{ 'Market' }}</span>
          <s-tooltip slot="suffix" border-radius="mini" :content="marketTooltip" placement="top" tabindex="-1">
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
        <span class="order-book-total-value-amount">{{ amountAtPrice }}</span>
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
      class="info-line-container"
      :info-only="false"
    />
    <place-confirm
      :visible.sync="confirmPlaceOrderVisibility"
      :isInsufficientBalance="isInsufficientBalance"
      :isBuySide="isBuySide"
      :type="limitOrderType"
      @confirm="resetValues"
    />
  </div>
</template>

<script lang="ts">
import { PriceVariant, OrderBookStatus } from '@sora-substrate/liquidity-proxy';
import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import { FPNumber } from '@sora-substrate/util';
import { DexId } from '@sora-substrate/util/build/dex/consts';
import { MAX_TIMESTAMP } from '@sora-substrate/util/build/orderBook/consts';
import { components, mixins, api } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components, LimitOrderType, PageNames } from '@/consts';
import router, { lazyComponent } from '@/router';
import { action, getter, mutation, state } from '@/store/decorators';
import type { OrderBookStats } from '@/types/orderBook';
import { OrderBookTabs } from '@/types/tabs';
import { isMaxButtonAvailable, getMaxValue, getAssetBalance, asZeroValue, hasInsufficientBalance } from '@/utils';
import { getBookDecimals } from '@/utils/orderBook';

import type { OrderBook } from '@sora-substrate/liquidity-proxy';
import type { CodecString, NetworkFeesObject } from '@sora-substrate/util';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';
import type { Subscription } from 'rxjs';

@Component({
  components: {
    DatePicker: lazyComponent(Components.DatePicker),
    BookTransactionDetails: lazyComponent(Components.BookTransactionDetails),
    TokenInput: lazyComponent(Components.TokenInput),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    PairListPopover: lazyComponent(Components.PairListPopover),
    PlaceConfirm: lazyComponent(Components.PlaceOrder),
    PriceChange: lazyComponent(Components.PriceChange),
    FormattedAmount: components.FormattedAmount,
  },
})
export default class BuySellWidget extends Mixins(TranslationMixin, mixins.FormattedAmountMixin, mixins.LoadingMixin) {
  @state.orderBook.baseValue baseValue!: string;
  @state.orderBook.quoteValue quoteValue!: string;
  @state.orderBook.side side!: PriceVariant;
  @state.orderBook.asks asks!: any;
  @state.orderBook.bids bids!: any;
  @state.orderBook.baseAssetAddress baseAssetAddress!: string;
  @state.orderBook.placeOrderNetworkFee networkFee!: CodecString;

  @getter.assets.xor private xor!: AccountAsset;
  @getter.orderBook.baseAsset baseAsset!: AccountAsset;
  @getter.orderBook.quoteAsset quoteAsset!: AccountAsset;
  @getter.orderBook.currentOrderBook currentOrderBook!: Nullable<OrderBook>;
  @getter.orderBook.orderBookStats orderBookStats!: Nullable<OrderBookStats>;
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

  @action.orderBook.updateOrderBooksStats private updateOrderBooksStats!: AsyncFnWithoutArgs;

  visibleBookList = false;
  confirmPlaceOrderVisibility = false;
  confirmCancelOrderVisibility = false;
  quoteSubscription: Nullable<Subscription> = null;
  timestamp = MAX_TIMESTAMP;
  marketQuotePrice = '';

  @Watch('side')
  @Watch('baseAssetAddress')
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

  @Watch('visibleBookList')
  private updateStats(): void {
    if (this.visibleBookList) {
      this.updateOrderBooksStats();
    }
  }

  limitOrderType: LimitOrderType = LimitOrderType.limit;

  readonly OrderBookTabs = OrderBookTabs;

  get amountAtPrice(): string {
    if (this.buttonDisabled()) return '';
    if (!this.baseValue) return '';
    if (!this.quoteValue && !this.marketQuotePrice) return '';
    return `${this.baseValue} ${this.baseSymbol} AT ${this.quoteValue || this.marketQuotePrice} ${this.quoteSymbol}`;
  }

  get buttonText(): string {
    if (!this.isLoggedIn) {
      return 'connectWalletText';
    }

    if (this.isNotAllowedToPlace()) return 'book stopped';

    if (this.isInsufficientBalance) return `Insufficient ${this.tokenFrom?.symbol} balance`;

    if (this.limitOrderType === LimitOrderType.limit) {
      if (!this.quoteValue) return 'set price';
      if (!this.baseValue) return 'enter amount';
      if (this.isPriceTooHigh) return 'price too high';
      if (this.isPriceTooLow) return 'price too low';
      if (!this.isPriceBeyondPrecision) return 'price too exact';

      if (this.orderBookStatus === OrderBookStatus.PlaceAndCancel) {
        if (this.priceExceedsSpread()) return 'price exceeded';
      }

      if (this.isOutOfAmountBounds(this.baseValue)) return 'out of base constraints';

      if (this.side === PriceVariant.Buy) return `Buy ${this.baseAsset.symbol}`;
      else return `Sell ${this.baseAsset.symbol}`;
    } else {
      if (!this.baseValue) return 'enter amount';
      if (!this.marketQuotePrice) return 'out of quote constraints';
      if (this.isOutOfAmountBounds(this.baseValue)) return 'out of base constraints';

      if (this.side === PriceVariant.Buy) return `Buy ${this.baseAsset.symbol}`;
      else return `Sell ${this.baseAsset.symbol}`;
    }
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

      if (this.orderBookStatus === OrderBookStatus.PlaceAndCancel) {
        if (this.priceExceedsSpread()) return true;
      }

      return this.isOutOfAmountBounds(this.baseValue);
    } else {
      if (!this.baseValue) return true;
      if (!this.marketQuotePrice) return true;
      return this.isOutOfAmountBounds(this.baseValue);
    }
  }

  priceExceedsSpread(): boolean {
    if (this.side === PriceVariant.Buy) {
      if (!this.asks[this.asks.length - 1]) return false;
      const bestAsk: FPNumber = this.asks[this.asks.length - 1][0];
      const price = new FPNumber(this.quoteValue, 18);

      return FPNumber.gte(price, bestAsk);
    }

    if (this.side === PriceVariant.Sell) {
      if (!this.bids[0]) return false;
      const bestBid: FPNumber = this.bids[0][0];
      const price = new FPNumber(this.quoteValue, 18);

      return FPNumber.lte(price, bestBid);
    }

    return false;
  }

  get orderBookPrice(): string {
    const price = this.orderBookStats?.price ?? FPNumber.ZERO;
    const decimals = getBookDecimals(this.currentOrderBook);
    return price.dp(decimals).toLocaleString();
  }

  get orderBookPriceChange(): FPNumber {
    return this.orderBookStats?.priceChange ?? FPNumber.ZERO;
  }

  get orderBookVolume(): string {
    const volume = this.orderBookStats?.volume ?? FPNumber.ZERO;
    return volume.toLocaleString();
  }

  get marketOptionDisabled(): boolean {
    return this.orderBookStatus === OrderBookStatus.PlaceAndCancel;
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

    const tickSize = this.currentOrderBook.tickSize;
    const price = new FPNumber(this.quoteValue, 18);

    return price.isZeroMod(tickSize);
  }

  isOutOfAmountBounds(amount: string): boolean {
    if (!this.currentOrderBook) return false;

    const { maxLotSize, minLotSize, stepLotSize } = this.currentOrderBook;
    const amountFP = new FPNumber(amount, 18);

    return !(
      FPNumber.lte(amountFP, maxLotSize) &&
      FPNumber.gte(amountFP, minLotSize) &&
      amountFP.isZeroMod(stepLotSize)
    );
  }

  get computedBtnClass(): string {
    if (!this.isLoggedIn) return '';
    return this.side === 'Buy' ? 'buy-btn' : '';
  }

  get isPriceInputDisabled(): boolean {
    return this.limitOrderType === LimitOrderType.market;
  }

  get icon(): string {
    return this.visibleBookList ? 'arrows-circle-chevron-top-24' : 'arrows-circle-chevron-bottom-24';
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

  get areTokensSelected(): boolean {
    return !!(this.baseAsset && this.quoteAsset);
  }

  // get calculatedAssetBaseTotal(): FPNumber {
  //   const baseValue = FPNumber.fromNatural(this.baseValue);
  //   const quoteValue = FPNumber.fromNatural(this.quoteValue);

  //   return baseValue.mul(quoteValue);
  // }

  // get fiatAmount(): string {
  //   if (!this.areTokensSelected) return '0.00';

  //   const fiat = this.getFiatAmount(this.calculatedAssetBaseTotal.toString(), this.baseAsset);

  //   return FPNumber.fromNatural(fiat || '0').toFixed(2);
  // }

  get limitTooltip(): string {
    return "A 'Limit' order lets you specify the exact price at which you want to buy or sell an asset. A 'Limit Buy' order will only be executed at the specified price or lower, while a 'Limit Sell' order will execute only at the specified price or higher. This control ensures you don't pay more or sell for less than you're comfortable with.";
  }

  get marketTooltip(): string {
    return "A 'Market Order' is an order to immediately buy or sell at the best available current price. It doesn't require setting a price, ensuring a fast execution but with the trade-off of less control over the price received or paid. This type of order is used when certainty of execution is a priority over price control.";
  }

  toggleBookList(): void {
    this.visibleBookList = !this.visibleBookList;
  }

  handleInputFieldQuote(value: string): void {
    this.setQuoteValue(value);
  }

  changeInputBase(): void {}

  handleInputFieldBase(value: string): void {
    this.setBaseValue(value);

    if (!value) {
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

    if (this.limitOrderType === LimitOrderType.limit) {
      this.showPlaceOrderDialog();
    } else if (this.limitOrderType === LimitOrderType.market) {
      this.subscribeOnBookQuote();
      this.showPlaceOrderDialog();
    }
  }

  get orderBookStatus(): OrderBookStatus {
    return this.currentOrderBook?.status ?? OrderBookStatus.Stop;
  }

  isNotAllowedToPlace(): boolean {
    return ![OrderBookStatus.Trade, OrderBookStatus.PlaceAndCancel].includes(this.orderBookStatus);
  }

  get isBuySide(): boolean {
    return this.side === PriceVariant.Buy;
  }

  private resetQuoteSubscription(): void {
    this.quoteSubscription?.unsubscribe();
    this.quoteSubscription = null;
  }

  /**
   * Returns formatted value in most suitable form
   * @param value
   *
   * 0.152345 -> 0.15
   * 0.000043 -> 0.000043
   */
  showMostFittingValue(value, precisionForLowCostAsset = 18) {
    const [integer, decimal = '00'] = value.split(FPNumber.DELIMITERS_CONFIG.decimal);

    if (parseInt(integer) > 0) {
      return this.getFormattedValue(value, 2);
    }

    if (decimal && parseInt(decimal.substring(0, 2)) > 0) {
      return this.getFormattedValue(value, 2);
    }

    return this.getFormattedValue(value, precisionForLowCostAsset);
  }

  getFormattedValue(value: string, precision = 18): string {
    const [integer, decimal = '00'] = value.split(FPNumber.DELIMITERS_CONFIG.decimal);
    return `${integer}.${decimal.substring(0, precision)}`;
  }

  private subscribeOnBookQuote(): void {
    if (!this.baseValue) return;
    this.resetQuoteSubscription();

    if (!this.areTokensSelected) return;

    const observableQuote = api.swap.subscribeOnResultRpc(
      (this.tokenFrom as AccountAsset).address,
      (this.tokenTo as AccountAsset).address,
      this.baseValue,
      this.isBuySide,
      LiquiditySourceTypes.OrderBook
    );

    this.quoteSubscription = observableQuote.subscribe(async (quoteData) => {
      const { amount } = await quoteData;

      if (FPNumber.fromCodecValue(amount).isZero() || this.limitOrderType === LimitOrderType.limit) {
        this.resetQuoteSubscription();
        this.setQuoteValue('');
        this.setToValue('');
        this.marketQuotePrice = '';
        return;
      }

      // TODO: To be removed ?
      // const unformattedMarketQuotePrice = this.isBuySide
      //   ? FPNumber.fromNatural(this.baseValue).div(FPNumber.fromCodecValue(amount)).toFixed(5).toString()
      //   : FPNumber.fromCodecValue(amount).div(FPNumber.fromNatural(this.baseValue)).toFixed(5).toString();

      const unformattedMarketQuotePrice = FPNumber.fromCodecValue(amount)
        .div(FPNumber.fromNatural(this.baseValue))
        .toString();

      // this.marketQuotePrice = this.showMostFittingValue(unformattedMarketQuotePrice);
      this.marketQuotePrice = unformattedMarketQuotePrice;
      this.prepareValuesForSwap(amount);
    });
  }

  prepareValuesForSwap(amount) {
    if (!this.areTokensSelected || asZeroValue(this.baseValue)) return;

    const fromValue = this.isBuySide ? this.getStringFromCodec(amount) : this.baseValue;
    const toValue = this.isBuySide ? this.baseValue : this.getStringFromCodec(amount);

    this.setFromValue(fromValue);
    this.setToValue(toValue);
    this.setQuoteValue(this.marketQuotePrice);
    this.setLiquiditySource(LiquiditySourceTypes.OrderBook);
    this.selectDexId(DexId.XOR); // make it changeable if other dexes are allowed
  }

  beforeDestroy(): void {
    this.resetQuoteSubscription();
    this.setTokenFromAddress(this.xor.address);
    this.setFromValue('');
    this.setTokenToAddress();
    this.setToValue('');
    this.setQuoteValue('');
    this.setBaseValue('');
    this.setLiquiditySource(LiquiditySourceTypes.Default);
    this.selectDexId(DexId.XOR);
  }

  resetValues() {
    this.setBaseValue('');
    this.setQuoteValue('');
    this.limitOrderType = LimitOrderType.limit;
  }

  showPlaceOrderDialog(): void {
    this.confirmPlaceOrderVisibility = true;
  }

  handleMaxValue(): void {
    if (!this.currentOrderBook) return;

    const max = getMaxValue(this.baseAsset, this.networkFee);
    const maxLotSize: FPNumber = this.currentOrderBook.maxLotSize;
    const maxPossible = FPNumber.fromNatural(max, this.currentOrderBook?.tickSize.toString().split(/[,.]/)[1].length);

    if (FPNumber.lte(maxPossible, maxLotSize)) {
      this.handleInputFieldBase(maxPossible.toString());
    } else {
      this.handleInputFieldBase(maxLotSize.toString());
    }
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

  .s-tabs.s-rounded .el-tabs__nav-wrap .el-tabs__item {
    &:not(.is-active).is-disabled {
      color: var(--s-color-base-content-secondary);
    }
    &.is-disabled {
      cursor: not-allowed;
    }
  }
}

.order-book-whitelist.el-popover {
  border-radius: var(--s-border-radius-small);
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

.set-widget {
  .el-loading-mask {
    border-radius: 20px;
  }
}
</style>

<style lang="scss" scoped>
.order-book {
  padding: 4px 16px 32px;

  &-choose-pair {
    width: 100%;
    background: var(--base-day-background, #f4f0f1);
    border-radius: var(--s-border-radius-small);
    margin-bottom: 8px;
    padding: 10px 16px;

    &:hover {
      cursor: pointer;
    }
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

      &__value {
        font-size: var(--s-font-size-small);
      }
    }
  }

  &-fiat {
    color: var(--s-color-fiat-value);
    line-height: var(--s-line-height-medium);
    letter-spacing: var(--s-letter-spacing-small);
  }

  .order-book {
    &-total {
      display: flex;
      justify-content: space-between;
      margin: 12px 0 16px 0;

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

    // overwrite select-button styles
    button.el-button.neumorphic.s-tertiary:focus:not(:active) {
      outline: none;
    }
    button.el-button.el-button--select-token.token-select-button--token {
      &:hover,
      &:focus {
        box-shadow: var(--neu-button-tertiary-box-shadow);
        cursor: initial;
        outline: none;
      }
    }
  }
}

[design-system-theme='dark'] {
  .order-book-choose-pair {
    background: var(--s-color-base-background);
  }
}
</style>
