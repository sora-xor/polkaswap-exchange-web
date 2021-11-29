<template>
  <div class="cart" v-loading="loading">
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

      <div class="cart__row cart__row--input-field">
        <div v-if="!isLoggedIn" class="pricing-stats">
          <div class="qwest pricing-stats__qwest">?</div>
          <span class="pricing-stats__text">Dynamic Pricing Stats</span>
        </div>

        <count-input v-else v-model="selectedCount" :min="1" :max="total" />
      </div>

      <div class="cart__row cart__row-price">
        <div v-if="fromFiatAmount" class="price">
          <formatted-amount is-fiat-value :value="fromFiatAmount" asset-symbol="USD" />
        </div>

        <div class="available">
          <span class="available__current">{{ availableForRedemption }}</span>
          /
          <span class="available__max">{{ total }}</span>
          <div>Available</div>
        </div>
      </div>

      <div v-if="isLoggedIn" class="cart__row cart__row--info">
        <div class="swap-info-line">
          <span>XOR balance:</span>
          <formatted-amount :value="formattedXorBalance" :asset-symbol="tokenFrom.symbol" />
        </div>
        <div class="swap-info-line">
          <span>NOIR balance:</span>
          <formatted-amount :value="formattedNoirBalance" :asset-symbol="tokenTo.symbol" />
        </div>
      </div>

      <div class="cart__line"></div>

      <div v-if="tokenFrom" class="cart__row cart__row--info">
        <div class="swap-info-line">
          <span>Buy for:</span>
          <formatted-amount :value="formatStringValue(fromValue)" :asset-symbol="tokenFrom.symbol" />
        </div>
        <div class="swap-info-line">
          <span>Sell for:</span>
          <formatted-amount :value="formatStringValue(fromValueReversed)" :asset-symbol="tokenFrom.symbol" />
        </div>
      </div>

      <div class="cart__line"></div>

      <div v-if="tokenFrom" class="cart__row cart__row--info">
        <div class="swap-info-line">
          <span>Network fee:</span>
          <formatted-amount :value="formattedSwapNetworkFee" :asset-symbol="tokenFrom.symbol" />
        </div>
      </div>

      <div class="cart__row">
        <div v-if="!isLoggedIn" class="cart__description">
          Buy and sell the first phygital wine with digital currency.
          <br />
          Delivered on demand worldwide.
          <a href="#"> Learn more</a>
        </div>
      </div>

      <div class="cart__row-btns">
        <template v-if="isLoggedIn">
          <s-button type="primary" size="big" class="btn w-100" :disabled="buyDisabled" @click="buy">BUY</s-button>
          <s-button type="secondary" size="big" class="btn" :disabled="sellDisabled" @click="sell">Sell</s-button>
          <s-button type="secondary" size="big" class="btn" :disabled="redeemDisabled" @click="redeem">Redeem</s-button>
        </template>
        <s-button v-else type="primary" size="big" class="btn w-100" @click="connectInternalWallet">
          Connect Wallet
        </s-button>
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
  NetworkFeesObject,
  QuotePaths,
  QuotePayload,
} from '@sora-substrate/util';

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';

import { hasInsufficientBalance, asZeroValue, formatAssetBalance, debouncedInputHandler } from '@/utils';
import { lazyComponent } from '@/router';
import { Components, NOIR_TOKEN_ADDRESS } from '@/consts';

const namespace = 'swap';

@Component({
  components: {
    FormattedAmount: components.FormattedAmount,
    FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue,
    CountInput: lazyComponent(Components.CountInput),
  },
})
export default class Swap extends Mixins(mixins.FormattedAmountMixin, mixins.TransactionMixin, WalletConnectMixin) {
  @State((state) => state[namespace].paths) paths!: QuotePaths;
  @State((state) => state[namespace].isAvailable) isAvailable!: boolean;
  @State((state) => state[namespace].isAvailableChecking) isAvailableChecking!: boolean;
  @State((state) => state[namespace].payload) payload!: QuotePayload;
  @State((state) => state[namespace].fromValue) fromValue!: string;
  @State((state) => state[namespace].fromValueReversed) fromValueReversed!: string;
  @State((state) => state[namespace].toValue) toValue!: string;

  @Getter networkFees!: NetworkFeesObject;
  @Getter nodeIsConnected!: boolean;
  @Getter isLoggedIn!: boolean;
  @Getter slippageTolerance!: string;
  @Getter('tokenFrom', { namespace }) tokenFrom!: AccountAsset;
  @Getter('tokenTo', { namespace }) tokenTo!: AccountAsset;
  @Getter('swapLiquiditySource', { namespace }) liquiditySource!: LiquiditySourceTypes;
  @Getter('pairLiquiditySourcesAvailable', { namespace }) pairLiquiditySourcesAvailable!: boolean;

  @Getter('noir/total') total!: number;
  @Getter('noir/availableForRedemption') availableForRedemption!: number;
  @Getter('noir/xorBalance') xorBalance!: CodecString;
  @Getter('noir/noirBalance') noirBalance!: CodecString;

  @Action('setTokenFromAddress', { namespace }) setTokenFromAddress!: (address?: string) => Promise<void>;
  @Action('setTokenToAddress', { namespace }) setTokenToAddress!: (address?: string) => Promise<void>;
  @Action('setFromValue', { namespace }) setFromValue!: (value: string) => Promise<void>;
  @Action('setFromValueReversed', { namespace }) setFromValueReversed!: (value: string) => Promise<void>;
  @Action('setToValue', { namespace }) setToValue!: (value: string) => Promise<void>;
  @Action('checkSwap', { namespace }) checkSwap!: AsyncVoidFn;
  @Action('reset', { namespace }) reset!: AsyncVoidFn;
  @Action('getAssets', { namespace: 'assets' }) getAssets!: AsyncVoidFn;
  @Action('updatePairLiquiditySources', { namespace }) updatePairLiquiditySources!: AsyncVoidFn;
  @Action('updatePaths', { namespace }) updatePaths!: AsyncVoidFn;

  @Action('setSubscriptionPayload', { namespace }) setSubscriptionPayload!: (payload: QuotePayload) => Promise<void>;
  @Action('resetSubscriptions', { namespace }) resetSubscriptions!: AsyncVoidFn;
  @Action('updateSubscriptions', { namespace }) updateSubscriptions!: AsyncVoidFn;

  @Action('setRedeemDialogVisibility', { namespace: 'noir' }) setRedeemDialogVisibility!: (
    flag: boolean
  ) => Promise<void>;

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
  liquidityReservesSubscription: Nullable<Subscription> = null;
  recountSwapValues = debouncedInputHandler(this.runRecountSwapValues, 100);

  redeemDialogVisibility = false;

  get formattedXorBalance(): string {
    return this.formatCodecNumber(this.xorBalance);
  }

  get formattedNoirBalance(): string {
    return this.formatCodecNumber(this.noirBalance);
  }

  get selectedCount(): number {
    return Number(this.toValue);
  }

  set selectedCount(value: number) {
    this.setToValue(String(value));
    this.runRecountSwapValues();
  }

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
    return this.fromValue && this.tokenFrom ? this.getFiatAmountByString(this.fromValue, this.tokenFrom) || '0' : '0';
  }

  get toFiatAmount(): string {
    return this.toValue && this.tokenTo ? this.getFiatAmountByString(this.toValue, this.tokenTo) || '0' : '0';
  }

  get preparedForSwap(): boolean {
    return this.isLoggedIn && this.areTokensSelected;
  }

  get isInsufficientLiquidity(): boolean {
    return this.isAvailable && this.preparedForSwap && !this.areZeroAmounts && this.hasZeroAmount;
  }

  get buyDisabled(): boolean {
    return (
      (this.preparedForSwap && hasInsufficientBalance(this.tokenFrom, this.fromValue, this.swapNetworkFee)) ||
      this.selectedCount > this.availableForRedemption
    );
  }

  get sellDisabled(): boolean {
    return this.preparedForSwap && hasInsufficientBalance(this.tokenTo, this.toValue, this.swapNetworkFee);
  }

  get redeemDisabled(): boolean {
    return this.preparedForSwap && hasInsufficientBalance(this.tokenTo, '1', this.transferNetworkFee);
  }

  get swapNetworkFee(): CodecString {
    return this.networkFees[Operation.Swap];
  }

  get formattedSwapNetworkFee(): string {
    return this.formatCodecNumber(this.swapNetworkFee);
  }

  get transferNetworkFee(): CodecString {
    return this.networkFees[Operation.Transfer];
  }

  created() {
    this.withApi(async () => {
      await this.getAssets();

      const xorAddress = KnownAssets.get(KnownSymbols.XOR)?.address;
      await this.setTokenFromAddress(xorAddress);
      await this.setTokenToAddress(NOIR_TOKEN_ADDRESS);
      await this.setToValue('1');
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

  private runRecountSwapValues(): void {
    try {
      const { amount: amountBuy } = quote(
        this.tokenFrom.address,
        this.tokenTo.address,
        this.toValue,
        false,
        [this.liquiditySource].filter(Boolean),
        this.paths,
        this.payload
      );

      const { amount: amountSell } = quote(
        this.tokenTo.address,
        this.tokenFrom.address,
        this.toValue,
        true,
        [this.liquiditySource].filter(Boolean),
        this.paths,
        this.payload
      );

      this.setFromValue(this.getStringFromCodec(amountBuy, this.tokenFrom.decimals));
      this.setFromValueReversed(this.getStringFromCodec(amountSell, this.tokenFrom.decimals));
    } catch (error: any) {
      console.error(error);
      this.resetFieldFrom();
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

  // noir nethods
  async buy(): Promise<void> {
    try {
      await this.withNotifications(
        async () =>
          await api.swap(
            this.tokenFrom.address, // XOR
            this.tokenTo.address, // NOIR
            this.fromValue,
            this.toValue,
            this.slippageTolerance,
            true,
            this.liquiditySource
          )
      );
    } catch (error) {
      console.error(error);
    }
  }

  async sell(): Promise<void> {
    try {
      await this.withNotifications(
        async () =>
          await api.swap(
            this.tokenTo.address, // NOIR
            this.tokenFrom.address, // XOR
            this.toValue,
            this.fromValueReversed,
            this.slippageTolerance,
            false,
            this.liquiditySource
          )
      );
    } catch (error) {
      console.error(error);
    }
  }

  async redeem(): Promise<void> {
    await this.setRedeemDialogVisibility(true);
  }

  destroyed(): void {
    this.reset();
    this.cleanSwapReservesSubscription();
  }
}
</script>

<style lang="scss">
.cart .el-loading-mask {
  border-radius: 35px;
  background-color: transparent;
}

.price {
  .formatted-amount {
    white-space: nowrap;
  }
  .formatted-amount--fiat-value {
    font-weight: 700 !important;
  }
  .formatted-amount__symbol {
    color: var(--s-color-theme-accent);
  }
}

.swap-info-line {
  display: flex;
  flex-flow: row nowrap;
  justify-content: space-between;
  width: 100%;
}
</style>
