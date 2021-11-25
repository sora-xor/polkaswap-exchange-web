<template>
  <div class="cart">
    <div class="cart__bg-1"></div>
    <div class="cart__bg-2"></div>
    <img src="img/cloud-pink.png" loading="lazy" alt="" class="cloud-pink" />
    <img src="img/cloud-perple.png" loading="lazy" alt="" class="cloud-perple" />
    <div class="blur-circle-1"></div>
    <div class="blur-circle-2"></div>

    <img src="img/cart-float-img.png" loading="lazy" alt="" class="cart__float-img" />

    <img src="img/stroke-img.png" loading="lazy" alt="" class="cart__stroke" />

    <div class="cart__corner corner">
      <div class="corner__inner">
        <div class="corner__circle">
          <img src="img/corner-circle-stroke.png" loading="lazy" alt="" class="corner__circle-stroke first" />
          <img src="img/corner-circle-stroke.png" loading="lazy" alt="" class="corner__circle-stroke second" />
        </div>
      </div>

      <img src="img/bottle.png" loading="lazy" alt="" class="corner__bottle-img" />
    </div>

    <div class="cart__content">
      <div class="cart__row">
        <div class="cart__currency">$NOIR</div>
      </div>

      <div class="cart__row">
        <div class="cart__title">New Moon Edition <span class="color-pink">1</span></div>
      </div>

      <div class="cart__spacer"></div>

      <div class="cart__row">
        <div class="pricing-stats">
          <div class="qwest pricing-stats__qwest">?</div>
          <span class="pricing-stats__text">Dynamic Pricing Stats</span>
        </div>
      </div>

      <div class="cart__row cart__row-price">
        <div class="price">
          <span>$90018</span><span class="price__after-dot">.04</span>
          <span class="color-pink">USD</span>
        </div>

        <div class="available">
          <span class="available__current">21</span>
          /
          <span class="available__max">302</span>
          Available
        </div>
      </div>

      <div class="cart__line"></div>

      <div class="cart__row">
        <div class="cart__description">
          Buy and sell the first phygital wine with digital currency.
          <br />
          Delivered on demand worldwide.
          <a href="#"> Learn more</a>
        </div>
      </div>

      <div class="cart__row-btns">
        <s-button type="primary" size="big" class="btn w-100">BUY</s-button>
        <s-button type="secondary" size="big" class="btn">Sell</s-button>
        <s-button type="secondary" size="big" class="btn">Redeem</s-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { Action, Getter, State } from 'vuex-class';
import { api, components, mixins } from '@soramitsu/soraneo-wallet-web';
import { KnownAssets, KnownSymbols, FPNumber, Operation, quote } from '@sora-substrate/util';
import type { Subscription } from '@polkadot/x-rxjs';
import type {
  AccountAsset,
  CodecString,
  LiquiditySourceTypes,
  LPRewardsInfo,
  NetworkFeesObject,
  QuotePaths,
  QuotePayload,
} from '@sora-substrate/util';

import TranslationMixin from '@/components/mixins/TranslationMixin';

import {
  getMaxValue,
  hasInsufficientBalance,
  hasInsufficientXorForFee,
  asZeroValue,
  formatAssetBalance,
  debouncedInputHandler,
} from '@/utils';
import { lazyComponent } from '@/router';
import { Components, NOIR_TOKEN_ADDRESS } from '@/consts';

const namespace = 'swap';

@Component({
  components: {
    TokenLogo: lazyComponent(Components.TokenLogo),
    ConfirmSwap: lazyComponent(Components.ConfirmSwap),
    FormattedAmount: components.FormattedAmount,
    FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue,
  },
})
export default class Swap extends Mixins(mixins.FormattedAmountMixin, TranslationMixin, mixins.LoadingMixin) {
  @State((state) => state[namespace].paths) paths!: QuotePaths;
  @State((state) => state[namespace].liquidityProviderFee) liquidityProviderFee!: CodecString;
  @State((state) => state[namespace].isAvailable) isAvailable!: boolean;
  @State((state) => state[namespace].isAvailableChecking) isAvailableChecking!: boolean;
  @State((state) => state[namespace].isExchangeB) isExchangeB!: boolean;
  @State((state) => state[namespace].payload) payload!: QuotePayload;
  @State((state) => state[namespace].fromValue) fromValue!: string;
  @State((state) => state[namespace].toValue) toValue!: string;

  @Getter networkFees!: NetworkFeesObject;
  @Getter nodeIsConnected!: boolean;
  @Getter isLoggedIn!: boolean;
  @Getter slippageTolerance!: string;
  @Getter('tokenXOR', { namespace: 'assets' }) tokenXOR!: AccountAsset;
  @Getter('tokenFrom', { namespace }) tokenFrom!: AccountAsset;
  @Getter('tokenTo', { namespace }) tokenTo!: AccountAsset;
  @Getter('swapLiquiditySource', { namespace }) liquiditySource!: LiquiditySourceTypes;
  @Getter('pairLiquiditySourcesAvailable', { namespace }) pairLiquiditySourcesAvailable!: boolean;

  @Action('setTokenFromAddress', { namespace }) setTokenFromAddress!: (address?: string) => Promise<void>;
  @Action('setTokenToAddress', { namespace }) setTokenToAddress!: (address?: string) => Promise<void>;
  @Action('setFromValue', { namespace }) setFromValue!: (value: string) => Promise<void>;
  @Action('setToValue', { namespace }) setToValue!: (value: string) => Promise<void>;
  @Action('setAmountWithoutImpact', { namespace }) setAmountWithoutImpact!: (amount: CodecString) => Promise<void>;
  @Action('setExchangeB', { namespace }) setExchangeB!: (isExchangeB: boolean) => Promise<void>;
  @Action('setLiquidityProviderFee', { namespace }) setLiquidityProviderFee!: (value: CodecString) => Promise<void>;
  @Action('checkSwap', { namespace }) checkSwap!: AsyncVoidFn;
  @Action('reset', { namespace }) reset!: AsyncVoidFn;
  @Action('getAssets', { namespace: 'assets' }) getAssets!: AsyncVoidFn;
  @Action('updatePairLiquiditySources', { namespace }) updatePairLiquiditySources!: AsyncVoidFn;
  @Action('updatePaths', { namespace }) updatePaths!: AsyncVoidFn;

  @Action('setRewards', { namespace }) setRewards!: (rewards: Array<LPRewardsInfo>) => Promise<void>;
  @Action('setSubscriptionPayload', { namespace }) setSubscriptionPayload!: (payload: QuotePayload) => Promise<void>;
  @Action('resetSubscriptions', { namespace }) resetSubscriptions!: AsyncVoidFn;
  @Action('updateSubscriptions', { namespace }) updateSubscriptions!: AsyncVoidFn;

  @Watch('liquiditySource')
  private handleLiquiditySourceChange(): void {
    this.subscribeOnSwapReserves();
  }

  @Watch('isLoggedIn')
  private handleLoggedInStateChange(isLoggedIn: boolean, wasLoggedIn: boolean): void {
    if (!wasLoggedIn && isLoggedIn) {
      this.recountSwapValues();
    }
  }

  @Watch('nodeIsConnected')
  private updateConnectionSubsriptions(nodeConnected: boolean) {
    if (nodeConnected) {
      this.updateSubscriptions();
      this.subscribeOnSwapReserves();
    } else {
      this.resetSubscriptions();
      this.cleanSwapReservesSubscription();
    }
  }

  readonly delimiters = FPNumber.DELIMITERS_CONFIG;
  KnownSymbols = KnownSymbols;
  isTokenFromSelected = false;
  showSelectTokenDialog = false;
  showConfirmSwapDialog = false;
  isRecountingProcess = false;
  liquidityReservesSubscription: Nullable<Subscription> = null;
  recountSwapValues = debouncedInputHandler(this.runRecountSwapValues, 100);

  get areTokensSelected(): boolean {
    return !!(this.tokenFrom && this.tokenTo);
  }

  get isZeroFromAmount(): boolean {
    return asZeroValue(this.fromValue);
  }

  get isZeroToAmount(): boolean {
    return asZeroValue(this.toValue);
  }

  get hasZeroAmount(): boolean {
    return this.isZeroFromAmount || this.isZeroToAmount;
  }

  get areZeroAmounts(): boolean {
    return this.isZeroFromAmount && this.isZeroToAmount;
  }

  get fromFiatAmount(): string {
    return this.fromValue ? this.getFiatAmountByString(this.fromValue, this.tokenFrom) || '0' : '0';
  }

  get toFiatAmount(): string {
    return this.toValue ? this.getFiatAmountByString(this.toValue, this.tokenTo) || '0' : '0';
  }

  get isXorOutputSwap(): boolean {
    return this.tokenTo?.address === KnownAssets.get(KnownSymbols.XOR)?.address;
  }

  get preparedForSwap(): boolean {
    return this.isLoggedIn && this.areTokensSelected;
  }

  get isInsufficientLiquidity(): boolean {
    return (
      this.isAvailable &&
      this.preparedForSwap &&
      !this.areZeroAmounts &&
      this.hasZeroAmount &&
      asZeroValue(this.liquidityProviderFee)
    );
  }

  get isInsufficientBalance(): boolean {
    return this.preparedForSwap && hasInsufficientBalance(this.tokenFrom, this.fromValue, this.networkFee);
  }

  get isInsufficientXorForFee(): boolean {
    const isInsufficientXorForFee =
      this.preparedForSwap && hasInsufficientXorForFee(this.tokenXOR, this.networkFee, this.isXorOutputSwap);
    if (isInsufficientXorForFee || !this.isXorOutputSwap) {
      return isInsufficientXorForFee;
    }
    // It's required for XOR output without XOR or with XOR balance < network fee
    const xorBalance = this.getFPNumberFromCodec(this.tokenXOR.balance.transferable, this.tokenXOR.decimals);
    const fpNetworkFee = this.getFPNumberFromCodec(this.networkFee, this.tokenXOR.decimals).sub(xorBalance);
    const fpAmount = this.getFPNumber(this.toValue, this.tokenXOR.decimals).sub(
      FPNumber.gt(fpNetworkFee, this.Zero) ? fpNetworkFee : this.Zero
    );
    return FPNumber.lte(fpAmount, this.Zero);
  }

  get tokenFromPrice(): Nullable<CodecString> {
    return this.tokenFrom ? this.getAssetFiatPrice(this.tokenFrom) : null;
  }

  get tokenToPrice(): Nullable<CodecString> {
    return this.tokenTo ? this.getAssetFiatPrice(this.tokenTo) : null;
  }

  get networkFee(): CodecString {
    return this.networkFees[Operation.Swap];
  }

  get isConfirmSwapDisabled(): boolean {
    return (
      !this.areTokensSelected ||
      !this.isAvailable ||
      this.hasZeroAmount ||
      this.isInsufficientLiquidity ||
      this.isInsufficientBalance ||
      this.isInsufficientXorForFee
    );
  }

  created() {
    this.withApi(async () => {
      await this.getAssets();

      const xorAddress = KnownAssets.get(KnownSymbols.XOR)?.address;
      await this.setTokenFromAddress(xorAddress);
      await this.setTokenToAddress(NOIR_TOKEN_ADDRESS);
      await this.checkSwapSources();
    });
  }

  formatBalance(token: AccountAsset): string {
    return formatAssetBalance(token);
  }

  resetFieldFrom(): void {
    this.setFromValue('');
  }

  resetFieldTo(): void {
    this.setToValue('');
  }

  handleInputFieldFrom(value: string, recount = true): void {
    if (!this.areTokensSelected || asZeroValue(value)) {
      this.resetFieldTo();
    }

    if (value === this.fromValue) return;

    this.setFromValue(value);

    if (recount) {
      this.recountSwapValues();
    }
  }

  handleInputFieldTo(value: string, recount = true): void {
    if (!this.areTokensSelected || asZeroValue(value)) {
      this.resetFieldFrom();
    }

    if (value === this.toValue) return;

    this.setToValue(value);

    if (recount) {
      this.recountSwapValues();
    }
  }

  private runRecountSwapValues(): void {
    const value = this.isExchangeB ? this.toValue : this.fromValue;
    if (!this.areTokensSelected || asZeroValue(value)) return;

    const setOppositeValue = this.isExchangeB ? this.setFromValue : this.setToValue;
    const resetOppositeValue = this.isExchangeB ? this.resetFieldFrom : this.resetFieldTo;
    const oppositeToken = this.isExchangeB ? this.tokenFrom : this.tokenTo;

    try {
      const { amount, fee, rewards, amountWithoutImpact } = quote(
        this.tokenFrom.address,
        this.tokenTo.address,
        value,
        !this.isExchangeB,
        [this.liquiditySource].filter(Boolean),
        this.paths,
        this.payload
      );

      setOppositeValue(this.getStringFromCodec(amount, oppositeToken.decimals));
      this.setAmountWithoutImpact(amountWithoutImpact);
      this.setLiquidityProviderFee(fee);
      this.setRewards(rewards);
    } catch (error: any) {
      console.error(error);
      resetOppositeValue();
    } finally {
      this.isRecountingProcess = false;
    }
  }

  private cleanSwapReservesSubscription(): void {
    if (!this.liquidityReservesSubscription) {
      return;
    }
    this.liquidityReservesSubscription.unsubscribe();
    this.liquidityReservesSubscription = null;
  }

  private subscribeOnSwapReserves(): void {
    this.cleanSwapReservesSubscription();
    if (!this.areTokensSelected) return;

    this.liquidityReservesSubscription = api
      .subscribeOnSwapReserves(this.tokenFrom.address, this.tokenTo.address, this.liquiditySource)
      .subscribe(this.onChangeSwapReserves);
  }

  private async checkSwapSources(): Promise<void> {
    await Promise.all([this.checkSwap(), this.updatePairLiquiditySources(), this.updatePaths()]);
  }

  private async onChangeSwapReserves(payload: QuotePayload): Promise<void> {
    await this.setSubscriptionPayload(payload);

    if (!this.isAvailable) {
      await this.checkSwapSources();
    }

    this.runRecountSwapValues();
  }

  handleFocusField(isExchangeB = false): void {
    const isZeroValue = isExchangeB ? this.isZeroToAmount : this.isZeroFromAmount;
    const prevFocus = this.isExchangeB;

    this.setExchangeB(isExchangeB);

    if (isZeroValue) {
      this.resetFieldFrom();
      this.resetFieldTo();
    }

    if (prevFocus !== this.isExchangeB) {
      this.recountSwapValues();
    }
  }

  async handleSwitchTokens(): Promise<void> {
    this.isRecountingProcess = true;

    const [fromAddress, toAddress] = [this.tokenFrom.address, this.tokenTo.address];

    await this.setTokenFromAddress(toAddress);
    await this.setTokenToAddress(fromAddress);
    await this.checkSwapSources();

    if (this.isExchangeB) {
      this.setExchangeB(false);
      this.handleInputFieldFrom(this.toValue, false);
    } else {
      this.setExchangeB(true);
      this.handleInputFieldTo(this.fromValue, false);
    }

    this.subscribeOnSwapReserves();
  }

  handleMaxValue(): void {
    this.setExchangeB(false);

    const max = getMaxValue(this.tokenFrom, this.networkFee);

    this.handleInputFieldFrom(max);
  }

  openSelectTokenDialog(isTokenFrom: boolean): void {
    this.isTokenFromSelected = isTokenFrom;
    this.showSelectTokenDialog = true;
  }

  async selectToken(token: AccountAsset): Promise<void> {
    if (token) {
      if (this.isTokenFromSelected) {
        await this.setTokenFromAddress(token.address);
      } else {
        await this.setTokenToAddress(token.address);
      }

      await this.checkSwapSources();

      this.subscribeOnSwapReserves();
    }
  }

  handleConfirmSwap(): void {
    this.showConfirmSwapDialog = true;
  }

  async confirmSwap(isSwapConfirmed: boolean): Promise<void> {
    if (isSwapConfirmed) {
      this.resetFieldFrom();
      this.resetFieldTo();
      await this.setExchangeB(false);
    }
  }

  destroyed(): void {
    this.reset();
    this.cleanSwapReservesSubscription();
  }
}
</script>

<style lang="scss" scoped>
.el-form--actions {
  @include buttons;
  @include full-width-button('action-button');
  @include vertical-divider('el-button--switch-tokens', $inner-spacing-medium);
}

.el-button.neumorphic.s-action:disabled {
  &,
  &:hover {
    &.el-button--switch-tokens.loading {
      border-color: transparent;
      box-shadow: var(--s-shadow-element-pressed);
    }
  }
}

.page-header--swap {
  justify-content: space-between;
  align-items: center;
}
.price-difference {
  display: flex;
  align-items: center;

  & > * {
    flex-shrink: 0;
  }

  &__value {
    font-weight: 600;
    font-size: var(--s-font-size-small);

    & > span {
      padding-right: 2px;
    }
  }
}
</style>
