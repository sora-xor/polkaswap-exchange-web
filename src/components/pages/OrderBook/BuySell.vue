<template>
  <div class="order-book order-books">
    <el-popover popper-class="order-book-whitelist" trigger="click" v-model="visibleBookList" :visible-arrow="false">
      <pair-list-popover @close="toggleBookList" />
      <div slot="reference">
        <div class="order-book-choose-pair">
          <div>{{ t('orderBook.tokenPair') }}</div>
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
              <span>{{ t('orderBook.price') }}</span>
              <span class="order-book-pair-data-item__value order-book-fiat">
                <formatted-amount :value="orderBookPrice" />
              </span>
            </div>
            <div class="order-book-pair-data-item">
              <span>{{ t('orderBook.change') }}</span>
              <span class="order-book-pair-data-item__value">
                <price-change :value="orderBookPriceChange" />
              </span>
            </div>
            <div class="order-book-pair-data-item">
              <span>{{ t('orderBook.dayVolume') }}</span>
              <span class="order-book-pair-data-item__value">
                <formatted-amount :value="orderBookVolume" is-fiat-value />
              </span>
            </div>
          </div>
        </div>
      </div>
    </el-popover>

    <s-tabs class="order-book__tab" v-model="limitOrderType" type="rounded" @click="handleTabClick">
      <s-tab label="limit" name="limit">
        <span slot="label">
          <span>{{ t('orderBook.limit') }}</span>
          <s-tooltip
            slot="suffix"
            border-radius="mini"
            :content="t('orderBook.tooltip.limitOrder')"
            placement="top"
            tabindex="-1"
          >
            <s-icon name="info-16" size="14px" />
          </s-tooltip>
        </span>
      </s-tab>
      <s-tab label="market" name="market" :disabled="marketOptionDisabled">
        <span slot="label">
          <span>{{ t('orderBook.market') }}</span>
          <s-tooltip
            slot="suffix"
            border-radius="mini"
            :content="t('orderBook.tooltip.marketOrder')"
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
      :title="t('orderBook.price')"
      :token="quoteAsset"
      :value="quoteValue"
      :disabled="isPriceInputDisabled"
      @input="handleInputFieldQuote"
      class="order-book-input"
    />

    <token-input
      :balance="getTokenBalance(baseAsset)"
      :is-max-available="isMaxAmountAvailable"
      :with-slider="isSliderAvailable"
      :title="t('orderBook.amount')"
      :token="baseAsset"
      :value="baseValue"
      :slider-value="sliderValue"
      @slide="handleSlideInputChange"
      @input="handleInputFieldBase"
      @max="handleMaxValue"
      class="order-book-input s-input--with-slider"
    />

    <div class="order-book-total">
      <span class="order-book-total-title"> {{ t('orderBook.total') }}</span>
      <div class="order-book-total-value">
        <span class="order-book-total-value-amount">{{ amountAtPrice }}</span>
      </div>
    </div>

    <el-popover popper-class="book-validation__popover" trigger="hover" :visible-arrow="false">
      <div v-if="shouldErrorTooltipBeShown" class="book-validation">
        <div class="book-validation__disclaimer">
          <h4 class="book-validation__disclaimer-header">
            {{ reason }}
          </h4>
          <p class="book-validation__disclaimer-paragraph">
            {{ reading }}
          </p>
          <div class="book-validation__disclaimer-warning icon">
            <s-icon name="notifications-alert-triangle-24" size="28px" />
          </div>
        </div>
      </div>
      <s-button
        v-if="buttonDisabled"
        slot="reference"
        type="primary"
        class="btn s-typography-button--medium"
        :class="computedBtnClass"
        @click="placeLimitOrder"
        :disabled="buttonDisabled"
      >
        <template v-if="bookStopped">
          {{ t('orderBook.stop') }}
        </template>
        <template v-else-if="userReachedSpotLimit || userReachedOwnLimit">
          <error />
        </template>
        <template v-else-if="isLimitOrder && !quoteValue">{{ t('orderBook.setPrice') }}</template>
        <template v-else-if="isLimitOrder && (!baseValue || isZeroAmount)"> {{ t('orderBook.enterAmount') }}</template>
        <template v-else-if="isLimitOrder && !isPriceBeyondPrecision">
          <error />
        </template>
        <template v-else-if="isLimitOrder && isPlaceAndCancelMode">
          <error />
        </template>
        <template v-else-if="isLimitOrder && limitForSinglePriceReached">
          <error />
        </template>
        <template v-else-if="!isLimitOrder && isZeroAmount"> {{ t('orderBook.enterAmount') }}</template>
        <template v-else-if="!isLimitOrder && !marketQuotePrice">
          <error />
        </template>
        <template v-else-if="isOutOfAmountBounds">
          <error />
        </template>
        <template v-else-if="isInsufficientXorForFee">
          {{ t('insufficientBalanceText', { tokenSymbol: xor?.symbol }) }}
        </template>
        <template v-else-if="isInsufficientBalance">
          {{ t('insufficientBalanceText', { tokenSymbol: tokenFrom?.symbol }) }}
        </template>
      </s-button>
      <s-button
        v-else
        slot="reference"
        type="primary"
        class="btn s-typography-button--medium"
        :class="computedBtnClass"
        @click="placeLimitOrder"
      >
        <template v-if="!isLoggedIn">
          {{ t('connectWalletText') }}
        </template>
        <template v-else-if="isBuySide">
          {{ t('orderBook.Buy', { asset: baseAsset?.symbol }) }}
        </template>
        <template v-else>
          {{ t('orderBook.Sell', { asset: baseAsset?.symbol }) }}
        </template>
      </s-button>
    </el-popover>

    <place-transaction-details
      v-if="areTokensSelected && !hasZeroAmount && !hasExplainableError"
      class="info-line-container"
      :info-only="false"
      :is-market-type="isMarketType"
    />

    <place-confirm
      :visible.sync="confirmPlaceOrderVisibility"
      :isInsufficientBalance="isInsufficientBalance"
      :isBuySide="isBuySide"
      :is-market-type="isMarketType"
      @confirm="resetValues"
    />
  </div>
</template>

<script lang="ts">
import { PriceVariant, OrderBookStatus } from '@sora-substrate/liquidity-proxy';
import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import { FPNumber, Operation } from '@sora-substrate/util';
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
import {
  isMaxButtonAvailable,
  getMaxValue,
  getAssetBalance,
  asZeroValue,
  hasInsufficientBalance,
  delay,
  hasInsufficientXorForFee,
} from '@/utils';
import { getBookDecimals, MAX_ORDERS_PER_SIDE, MAX_ORDERS_PER_USER } from '@/utils/orderBook';

import type { OrderBook, OrderBookPriceVolume } from '@sora-substrate/liquidity-proxy';
import type { CodecString, NetworkFeesObject } from '@sora-substrate/util';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';
import type { LimitOrder } from '@sora-substrate/util/build/orderBook/types';
import type { Subscription } from 'rxjs';

@Component({
  components: {
    FormattedAmount: components.FormattedAmount,
    TokenInput: lazyComponent(Components.TokenInput),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    PairListPopover: lazyComponent(Components.PairListPopover),
    PlaceConfirm: lazyComponent(Components.PlaceOrder),
    PlaceTransactionDetails: lazyComponent(Components.PlaceTransactionDetails),
    PriceChange: lazyComponent(Components.PriceChange),
    Error: lazyComponent(Components.ErrorButton),
  },
})
export default class BuySellWidget extends Mixins(TranslationMixin, mixins.FormattedAmountMixin, mixins.LoadingMixin) {
  @state.router.prev private prevRoute!: Nullable<PageNames>;
  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;
  @state.orderBook.limitOrderType private _limitOrderType!: LimitOrderType;
  @state.orderBook.baseValue baseValue!: string;
  @state.orderBook.quoteValue quoteValue!: string;
  @state.orderBook.side side!: PriceVariant;
  @state.orderBook.asks asks!: OrderBookPriceVolume[];
  @state.orderBook.bids bids!: OrderBookPriceVolume[];
  @state.orderBook.baseAssetAddress baseAssetAddress!: string;
  @state.orderBook.amountSliderValue sliderValue!: number;
  @state.orderBook.userLimitOrders userLimitOrders!: Array<LimitOrder>;

  @getter.assets.xor xor!: AccountAsset;
  @getter.orderBook.baseAsset baseAsset!: AccountAsset;
  @getter.orderBook.quoteAsset quoteAsset!: AccountAsset;
  @getter.orderBook.currentOrderBook currentOrderBook!: Nullable<OrderBook>;
  @getter.orderBook.orderBookStats orderBookStats!: Nullable<OrderBookStats>;
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @getter.swap.tokenFrom tokenFrom!: Nullable<AccountAsset>;
  @getter.swap.tokenTo tokenTo!: Nullable<AccountAsset>;

  @mutation.orderBook.setBaseValue setBaseValue!: (value: string) => void;
  @mutation.orderBook.setQuoteValue setQuoteValue!: (value: string) => void;
  @mutation.orderBook.setSide setSide!: (side: PriceVariant) => void;
  @mutation.orderBook.setAmountSliderValue setAmountSliderValue!: (value: number) => void;
  @mutation.swap.setFromValue private setFromValue!: (value: string) => void;
  @mutation.swap.setToValue private setToValue!: (value: string) => void;
  @mutation.swap.setLiquiditySource setLiquiditySource!: (liquiditySource: string) => void;
  @mutation.swap.selectDexId private selectDexId!: (dexId: DexId) => void;
  @mutation.orderBook.setLimitOrderType private setLimitOrderType!: (type: LimitOrderType) => void;
  @mutation.swap.resetTokenToAddress private resetTokenToAddress!: FnWithoutArgs;

  @action.swap.setTokenFromAddress private setTokenFromAddress!: (address?: string) => Promise<void>;
  @action.swap.setTokenToAddress private setTokenToAddress!: (address?: string) => Promise<void>;
  @action.orderBook.updateBalanceSubscription private updateBalanceSubscription!: (reset?: boolean) => void;
  @action.orderBook.updateOrderBooksStats private updateOrderBooksStats!: AsyncFnWithoutArgs;

  // It previous route = PageNames.Swap, we need to save 'from' and 'to' tokens to set it during the beforeDestroy
  private prevSwapFromAddress = '';
  private prevSwapToAddress = '';

  visibleBookList = false;
  confirmPlaceOrderVisibility = false;
  confirmCancelOrderVisibility = false;
  limitForSinglePriceReached = false;
  quoteSubscription: Nullable<Subscription> = null;
  timestamp = MAX_TIMESTAMP;
  marketQuotePrice = '';
  reason = '';
  reading = '';

  readonly OrderBookTabs = OrderBookTabs;

  @Watch('side')
  @Watch('baseAssetAddress')
  private handleSideChange(oldValue: string, newValue: string): void {
    this.updateBalanceSubscription();
    this.handleTabClick();

    // Checks for slider reset
    if (oldValue.startsWith('0x') && oldValue !== newValue) {
      // if base changed, reset slider
      this.setAmountSliderValue(0);
    } else if (['Buy', 'Sell'].includes(oldValue) && oldValue !== newValue) {
      // if side changed, check for need to reset slider
      if (!this.currentOrderBook) return;
      const maxLotSize: FPNumber = this.currentOrderBook.maxLotSize;
      const maxBalance = getMaxValue(this.baseAsset, this.networkFee);

      const hasLessBalance = maxLotSize.gt(new FPNumber(maxBalance));

      if (hasLessBalance) {
        this.handleInputFieldBase('');
        this.setAmountSliderValue(0);
      }
    }
  }

  @Watch('baseAsset')
  @Watch('quoteAsset')
  private setTokens(): void {
    if (!this.baseAsset || !this.quoteAsset) return;

    if (this.isBuySide) {
      this.setTokenFromAddress(this.quoteAsset.address);
      this.setTokenToAddress(this.baseAsset.address);
    } else {
      this.setTokenFromAddress(this.baseAsset.address);
      this.setTokenToAddress(this.quoteAsset.address);
    }
  }

  @Watch('visibleBookList')
  private updateStats(): void {
    this.resetValues();
    if (this.visibleBookList) {
      this.updateOrderBooksStats();
    }
  }

  @Watch('marketQuotePrice')
  @Watch('userLimitOrders')
  private checkValidation(): void {
    this.checkInputValidation();
  }

  get limitOrderType(): LimitOrderType {
    return this._limitOrderType;
  }

  set limitOrderType(type: LimitOrderType) {
    this.setLimitOrderType(type);
  }

  get networkFee(): CodecString {
    return this.networkFees[Operation.OrderBookPlaceLimitOrder];
  }

  get isSliderAvailable(): boolean {
    const availableBalance = getMaxValue(this.baseAsset, this.networkFee);
    return new FPNumber(availableBalance).gt(FPNumber.ZERO);
  }

  get isMarketType(): boolean {
    return this.limitOrderType === LimitOrderType.market;
  }

  get hasExplainableError(): boolean {
    return !!this.reason && !!this.reading;
  }

  get amountAtPrice(): string {
    if (this.buttonDisabled || !this.baseValue) return '';
    if (!this.quoteValue && !this.marketQuotePrice) return '';

    return this.t('orderBook.tradingPair.total', {
      amount: this.baseValue,
      symbol: this.baseSymbol,
      amount2: this.quoteValue || this.marketQuotePrice,
      symbol2: this.quoteSymbol,
    });
  }

  get shouldErrorTooltipBeShown(): boolean {
    return this.isLoggedIn && this.hasExplainableError;
  }

  get isLimitOrder(): boolean {
    return this.limitOrderType === LimitOrderType.limit;
  }

  get isPlaceAndCancelMode(): boolean {
    return this.orderBookStatus === OrderBookStatus.PlaceAndCancel;
  }

  setError({ reason, reading }): void {
    this.reason = reason;
    this.reading = reading;
  }

  get buttonDisabled(): boolean {
    if (this.bookStopped) return true;

    if (this.limitForSinglePriceReached || this.userReachedSpotLimit || this.userReachedOwnLimit) return true;

    if (!this.isLoggedIn) return false;

    if (this.limitOrderType === LimitOrderType.limit) {
      if (!this.baseValue || !this.quoteValue) return true;
      // NOTE: corridor check could be enabled on blockchain later on; uncomment to return
      // if (this.isPriceTooHigh || this.isPriceTooLow || !this.isPriceBeyondPrecision) return true;
      if (!this.isPriceBeyondPrecision) return true;

      if (this.orderBookStatus === OrderBookStatus.PlaceAndCancel) {
        if (this.priceExceedsSpread) return true;
      }
    } else {
      if (!this.baseValue) return true;
      if (!this.marketQuotePrice) return true;
    }

    if (this.isOutOfAmountBounds) return true;

    if (this.isInsufficientXorForFee) return true;

    if (this.isInsufficientBalance) return true;

    return false;
  }

  async checkInputValidation(): Promise<void> {
    this.setError({ reason: '', reading: '' });

    if (this.orderBookStatus === OrderBookStatus.Stop) return;

    if ((await this.singlePriceReachedLimit()) && this.quoteValue)
      return this.setError({
        reason: this.t('orderBook.error.singlePriceLimit.reason'),
        reading: this.t('orderBook.error.singlePriceLimit.reading'),
      });

    if (this.userReachedOwnLimit)
      return this.setError({
        reason: this.t('orderBook.error.accountLimit.reason'),
        reading: this.t('orderBook.error.accountLimit.reading'),
      });

    if (this.userReachedSpotLimit)
      return this.setError({
        reason: this.t('orderBook.error.spotLimit.reason'),
        reading: this.t('orderBook.error.spotLimit.reading'),
      });

    // NOTE: corridor check could be enabled on blockchain later on; uncomment to return
    // if (this.isPriceTooHigh && this.quoteValue && this.baseValue)
    //   return this.setError({
    //     reason: 'Price is too far above/below the market price.',
    //     reading:
    //       'Price range alert: Your price is more than 50% above or below the current market price. Please enter a more closely aligned market price',
    //   });
    // if (this.isPriceTooLow && this.quoteValue && this.baseValue)
    //   return this.setError({
    //     reason: 'Price is too far above/below the market price.',
    //     reading:
    //       'Price range alert: Your price is more than 50% above or below the current market price. Please enter a more closely aligned market price',
    //   });

    if (!this.isPriceBeyondPrecision && this.baseValue && this.isLimitOrder) {
      const { tickSize } = this.currentOrderBook as OrderBook;

      return this.setError({
        reason: this.t('orderBook.error.multipleOf.reason'),
        reading: this.t('orderBook.error.multipleOf.reading', { value: tickSize?.toString() }),
      });
    }

    if (this.isMarketType) {
      // wait until any market quote being set to avoid error appearance
      await delay(300);

      if (!this.marketQuotePrice && !this.isZeroAmount) {
        return this.setError({
          reason: this.t('orderBook.error.marketNotAvailable.reason'),
          reading: this.t('orderBook.error.marketNotAvailable.reading'),
        });
      }
    }

    if (this.orderBookStatus === OrderBookStatus.PlaceAndCancel && this.priceExceedsSpread)
      return this.setError({
        reason: this.t('orderBook.error.exceedsSpread.reason'),
        reading: this.t('orderBook.error.exceedsSpread.reading'),
      });

    if (!this.isZeroAmount && this.isOutOfAmountBounds && this.quoteValue) {
      const { maxLotSize, minLotSize } = this.currentOrderBook as OrderBook;
      const { symbol } = this.baseAsset;

      return this.setError({
        reason: this.t('orderBook.error.outOfBounds.reason'),
        reading: this.t('orderBook.error.outOfBounds.reading', {
          max: `${maxLotSize?.toLocaleString()} ${symbol}`,
          min: `${minLotSize?.toLocaleString()} ${symbol}`,
        }),
      });
    }
  }

  get priceExceedsSpread(): boolean {
    if (this.isBuySide) {
      if (!this.asks[this.asks.length - 1]) return false;
      const bestAsk: FPNumber = this.asks[this.asks.length - 1][0];
      const price = new FPNumber(this.quoteValue);

      return FPNumber.gte(price, bestAsk);
    } else {
      if (!this.bids[0]) return false;
      const bestBid: FPNumber = this.bids[0][0];
      const price = new FPNumber(this.quoteValue);

      return FPNumber.lte(price, bestBid);
    }
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

  get isZeroAmount(): boolean {
    return asZeroValue(this.baseValue);
  }

  get isZeroPrice(): boolean {
    return asZeroValue(this.quoteValue);
  }

  get hasZeroAmount(): boolean {
    return this.isZeroAmount || this.isZeroPrice;
  }

  get isPriceTooHigh(): boolean {
    if (!this.asks.length) return false;

    if (!this.isBuySide) {
      if (!this.asks[this.asks.length - 1]) return false;
      const bestAsk: FPNumber = this.asks[this.asks.length - 1][0];
      const fiftyPercentDelta = bestAsk.mul(new FPNumber(1.5));
      const price = new FPNumber(this.quoteValue);

      if (FPNumber.gt(price, fiftyPercentDelta)) return true;
    }

    return false;
  }

  get isPriceTooLow(): boolean {
    if (!this.bids.length) return false;

    if (this.isBuySide) {
      if (!this.bids[0]) return false;
      const bestBid: FPNumber = this.bids[0][0];
      const fiftyPercentDelta = bestBid.div(FPNumber.TWO);
      const price = new FPNumber(this.quoteValue);

      if (FPNumber.lt(price, fiftyPercentDelta)) return true;
    }

    return false;
  }

  get isPriceBeyondPrecision(): boolean {
    if (!this.currentOrderBook) return false;

    const tickSize = this.currentOrderBook.tickSize;
    const price = new FPNumber(this.quoteValue);

    return price.isZeroMod(tickSize);
  }

  get bookPrecision(): number {
    return (
      this.currentOrderBook?.tickSize?.toLocaleString()?.split(FPNumber.DELIMITERS_CONFIG.decimal)?.[1]?.length ?? 0
    );
  }

  get amountPrecision(): number {
    return (
      this.currentOrderBook?.stepLotSize?.toLocaleString()?.split(FPNumber.DELIMITERS_CONFIG.decimal)?.[1]?.length ?? 0
    );
  }

  get isOutOfAmountBounds(): boolean {
    if (!this.currentOrderBook) return false;

    const { maxLotSize, minLotSize, stepLotSize } = this.currentOrderBook;
    const amountFP = new FPNumber(this.baseValue);

    return !(
      FPNumber.lte(amountFP, maxLotSize) &&
      FPNumber.gte(amountFP, minLotSize) &&
      amountFP.isZeroMod(stepLotSize)
    );
  }

  get computedBtnClass(): string {
    if (!this.isLoggedIn) return '';

    return this.isBuySide ? 'buy-btn' : '';
  }

  get isPriceInputDisabled(): boolean {
    return this.isMarketType;
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

  toggleBookList(): void {
    this.visibleBookList = !this.visibleBookList;
  }

  getPercent(value: string): number {
    if (!value) return 0;

    return new FPNumber(value).div(this.maxPossibleAmount).mul(FPNumber.HUNDRED).toNumber();
  }

  handleSlideInputChange(percent: string): void {
    this.setAmountSliderValue(Number(percent));

    const value = new FPNumber(percent).div(FPNumber.HUNDRED).mul(this.maxPossibleAmount).dp(this.amountPrecision);

    if (value) this.handleInputFieldBase(value.toString());
  }

  handleInputFieldQuote(preciseValue: string): void {
    const value = this.formatInputValue(preciseValue, this.bookPrecision);
    this.setQuoteValue(value);
    this.checkInputValidation();
  }

  handleInputFieldBase(preciseValue: string): void {
    const value = this.formatInputValue(preciseValue, this.amountPrecision);
    this.setBaseValue(value);
    this.setAmountSliderValue(this.getPercent(value));
    this.checkInputValidation();

    if (!value) {
      this.resetQuoteSubscription();
    }

    if (this.isMarketType) {
      value ? this.subscribeOnBookQuote() : this.setQuoteValue('');
    }
  }

  get preparedForSwap(): boolean {
    return this.isLoggedIn && this.areTokensSelected;
  }

  get isInsufficientXorForFee(): boolean {
    return hasInsufficientXorForFee(this.xor, this.networkFee);
  }

  get isInsufficientBalance(): boolean {
    if (!this.tokenFrom) return false;

    let fromValue!: string;

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

    if (this.isMarketType) {
      this.subscribeOnBookQuote();
    }

    this.showPlaceOrderDialog();
  }

  get orderBookStatus(): OrderBookStatus {
    return this.currentOrderBook?.status ?? OrderBookStatus.Stop;
  }

  get bookStopped(): boolean {
    return ![OrderBookStatus.Trade, OrderBookStatus.PlaceAndCancel].includes(this.orderBookStatus);
  }

  get isBuySide(): boolean {
    return this.side === PriceVariant.Buy;
  }

  get isMaxAmountAvailable(): boolean {
    if (!(this.baseAsset && this.quoteAsset)) return false;

    return this.isLoggedIn && isMaxButtonAvailable(this.baseAsset, this.baseValue, this.networkFee, this.xor, true);
  }

  get maxPossibleAmount(): FPNumber {
    if (!this.currentOrderBook) return FPNumber.ZERO;
    const max = getMaxValue(this.baseAsset, this.networkFee);
    const maxLotSize: FPNumber = this.currentOrderBook.maxLotSize;

    const maxPossible = FPNumber.fromNatural(max, this.bookPrecision);

    if (this.isBuySide) return maxLotSize;

    return FPNumber.lte(maxPossible, maxLotSize) ? maxPossible : maxLotSize;
  }

  get userReachedSpotLimit(): boolean {
    if ((this.side === PriceVariant.Sell ? this.asks : this.bids).length >= MAX_ORDERS_PER_SIDE && !!this.quoteValue) {
      if (this.isPriceUnique(this.quoteValue)) return true;

      if (this.limitForSinglePriceReached) return true;
    }

    return false;
  }

  isPriceUnique(statedPrice: string): boolean {
    const rawPrices = (!this.isBuySide ? this.asks : this.bids).map((priceVolume) => priceVolume[0]);
    const prices = rawPrices.map((price) => price.toString());

    return !prices.includes(statedPrice);
  }

  get userReachedOwnLimit(): boolean {
    return this.userLimitOrders?.length === MAX_ORDERS_PER_USER;
  }

  async singlePriceReachedLimit(): Promise<boolean> {
    const limitReached = !(await api.orderBook.isOrderPlaceable(
      this.baseAsset.address,
      this.quoteAsset.address,
      this.side,
      this.quoteValue
    ));

    this.limitForSinglePriceReached = limitReached;
    return limitReached;
  }

  formatInputValue(value: string, precision: number): string {
    if (!value) return '';

    const [_, decimal] = value.split('.');

    if (value.endsWith('.') && precision === 0) return value.slice(0, -1);

    return value.endsWith('.') || decimal?.length <= precision ? value : new FPNumber(value).dp(precision).toString();
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

      this.marketQuotePrice = FPNumber.fromCodecValue(amount)
        .div(FPNumber.fromNatural(this.baseValue))
        .dp(this.bookPrecision)
        .toString();

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
    this.checkInputValidation();
  }

  resetValues(success?: boolean) {
    this.setBaseValue('');
    this.setQuoteValue('');

    if (!success) {
      this.limitOrderType = LimitOrderType.limit;
    }
  }

  showPlaceOrderDialog(): void {
    this.confirmPlaceOrderVisibility = true;
  }

  handleMaxValue(): void {
    this.handleInputFieldBase(this.maxPossibleAmount.toString());
    this.checkInputValidation();
  }

  handleTabClick(): void {
    this.setTokens();

    if (!this.isMarketType) {
      this.resetQuoteSubscription();
    }

    if (this.isMarketType) {
      this.setQuoteValue('');
      if (this.baseValue) this.subscribeOnBookQuote();
    }

    this.checkInputValidation();
  }

  mounted(): void {
    this.updateBalanceSubscription();

    if (this.prevRoute === PageNames.Swap && this.tokenFrom?.address && this.tokenTo?.address) {
      this.prevSwapFromAddress = this.tokenFrom?.address;
      this.prevSwapToAddress = this.tokenTo?.address;
    }
  }

  beforeDestroy(): void {
    this.resetQuoteSubscription();
    this.updateBalanceSubscription(true);
    if (this.prevSwapFromAddress && this.prevSwapToAddress) {
      this.setTokenFromAddress(this.prevSwapFromAddress);
      this.setTokenToAddress(this.prevSwapToAddress);
    } else {
      this.setTokenFromAddress(this.xor.address);
      this.resetTokenToAddress();
    }
    this.setFromValue('');
    this.setToValue('');
    this.setQuoteValue('');
    this.setBaseValue('');
    this.setLiquiditySource(LiquiditySourceTypes.Default);
    this.selectDexId(DexId.XOR);
    this.setSide(PriceVariant.Buy);
    this.setAmountSliderValue(0);
    this.limitOrderType = LimitOrderType.limit;
  }
}
</script>

<style lang="scss">
.book-validation {
  // override popover styles
  &__popover {
    width: 450px;
    background-color: var(--s-color-utility-body);
    border-radius: $basic-spacing;
    color: var(--s-color-base-content-primary);
    border: none;
    padding: 0 !important;
    word-break: normal !important;
    font-size: var(--s-font-size-small);
  }

  &__disclaimer {
    width: 100%;
    background-color: var(--s-color-base-background);
    border-radius: var(--s-border-radius-small);
    box-shadow: var(--s-shadow-dialog);
    padding: 20px $basic-spacing;
    position: relative;
    &-header {
      font-weight: 500;
      margin-bottom: 10px;
      width: 75%;
      text-align: left;
    }
    &-paragraph {
      color: var(--s-color-base-content-secondary);
      width: 75%;
      text-align: left;
    }
    &-warning.icon {
      position: absolute;
      background-color: #479aef;
      border: 2.25257px solid #f7f3f4;
      box-shadow: var(--s-shadow-element-pressed);
      top: 20px;
      right: 20px;
      border-radius: 50%;
      color: #fff;
      width: 46px;
      height: 46px;
      .s-icon-notifications-alert-triangle-24 {
        display: block;
        color: #fff;
        margin-top: 5px;
        margin-left: 7px;
      }
    }
  }
}

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

  &-input {
    margin-bottom: $inner-spacing-mini;

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
}

.order-book-whitelist.el-popover {
  border-radius: var(--s-border-radius-small);
  padding: 0;
}

.set-widget {
  .el-loading-mask {
    border-radius: 20px;
  }
}

.order-book-choose-pair {
  width: 100%;
  background: var(--s-color-base-background);
  box-shadow: var(--s-shadow-element);
  border-radius: var(--s-border-radius-small);
  margin-bottom: $inner-spacing-mini;
  padding: 10px $basic-spacing;

  &:hover {
    cursor: pointer;
  }
}

.book-inform-icon-btn {
  margin-left: $inner-spacing-mini;
}
</style>

<style lang="scss" scoped>
.order-book {
  padding: 4px $basic-spacing var(--s-size-small);

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

      > span {
        text-transform: capitalize;
      }

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
      margin: 12px 0 $basic-spacing 0;

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
    margin: $inner-spacing-mini 0;
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
