<template>
  <div class="cart" v-loading="loading">
    <div class="cart__bg-1"></div>
    <div class="cart__bg-2"></div>
    <img src="img/cloud-pink.png" loading="lazy" alt="" class="cloud-pink" />
    <img src="img/cloud-perple.png" loading="lazy" alt="" class="cloud-perple" />
    <div class="blur-circle-1"></div>
    <div class="blur-circle-2"></div>

    <!-- <img src="img/cart-float-img.png" loading="lazy" alt="" class="cart__float-img" /> -->

    <div class="cart__content">
      <div class="cart__corner corner">
        <div class="corner__inner">
          <!-- <div class="corner__circle">
            <img src="img/corner-circle-stroke.png" loading="lazy" alt="" class="corner__circle-stroke first" />
            <img src="img/corner-circle-stroke.png" loading="lazy" alt="" class="corner__circle-stroke second" />
          </div> -->
        </div>

        <!-- <img src="img/bottle.png" loading="lazy" alt="" class="corner__bottle-img" /> -->
        <video class="bottle-animation" loop="" muted="" autoplay="" playsinline="" src="video/bottle.webm"></video>
        <!-- <div id="bottle" class="corner__bottle-img bottle-animation" width="203" height="504" /> -->
      </div>

      <div class="cart__row">
        <div class="cart__currency">$NOIR</div>
      </div>

      <div class="cart__row">
        <div class="cart__title">NEW MOON EDITION 1</div>
      </div>

      <div :class="[isLoggedIn ? 'cart__spacer-2' : 'cart__spacer']"></div>

      <div v-if="!isLoggedIn" class="cart__row">
        <div class="pricing-stats">
          <div
            class="qwest pricing-stats__qwest pointer"
            data-text="Dynamic Pricing Stats Dynamic Pricing Stats Dynamic Pricing Stats"
          >
            ?
          </div>
          <span class="pricing-stats__text">Dynamic Pricing Stats</span>
        </div>
      </div>

      <div v-else class="cart__row m-b-36">
        <count-input v-model="selectedCount" :min="1" :max="total" />
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

      <template v-if="isLoggedIn && tokenFrom && tokenTo">
        <table class="text-title-1 w-100 m-b-20">
          <tr>
            <td>XOR Balance</td>
            <td class="t-a-r">{{ formattedXorBalance }} XOR</td>
          </tr>

          <tr>
            <td>NOIR Balance</td>
            <td class="t-a-r">{{ formattedNoirBalance }} NOIR</td>
          </tr>
        </table>

        <div class="cart__line m-b-20"></div>

        <table v-if="tokenFrom" class="text-title-1 w-100 m-b-20">
          <tr>
            <td>Buy For:</td>
            <td class="t-a-r">{{ formatStringValue(fromValue) }} XOR</td>
          </tr>
          <tr>
            <td>Sell For:</td>
            <td class="t-a-r">{{ formatStringValue(fromValueReversed) }} XOR</td>
          </tr>
        </table>

        <div class="cart__line m-b-20"></div>

        <table v-if="tokenFrom" class="text-title-1 w-100 m-b-20">
          <tr>
            <td>Network fee:</td>
            <td class="t-a-r">{{ formattedSwapNetworkFee }} XOR</td>
          </tr>
        </table>
      </template>

      <template v-else>
        <div class="cart__line m-b-26"></div>

        <div class="cart__row">
          <div class="cart__description">
            Buy and sell the first phygital wine with digital currency.
            <br />
            Delivered on demand worldwide.
            <a class="color-pink pointer" @click="openEditionDialog">Learn more</a>
          </div>
        </div>
      </template>

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
import { api, components, mixins } from '@soramitsu/soraneo-wallet-web';
import { FPNumber, Operation } from '@sora-substrate/util';
import { KnownSymbols, XOR } from '@sora-substrate/util/build/assets/consts';
import type { Subscription } from '@polkadot/x-rxjs';
import type { CodecString, NetworkFeesObject } from '@sora-substrate/util';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';
import type { QuotePaths, QuotePayload, PrimaryMarketsEnabledAssets } from '@sora-substrate/util/build/swap/types';
import type { LiquiditySourceTypes } from '@sora-substrate/util/build/swap/consts';

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';

import { action, getter, mutation, state } from '@/store/decorators';
import { hasInsufficientBalance, asZeroValue, formatAssetBalance, debouncedInputHandler } from '@/utils';
import { lazyComponent } from '@/router';
import { Components, NOIR_TOKEN_ADDRESS } from '@/consts';

// import bottle from './bottle.js';

@Component({
  components: {
    FormattedAmount: components.FormattedAmount,
    FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue,
    CountInput: lazyComponent(Components.CountInput),
  },
})
export default class Cart extends Mixins(mixins.FormattedAmountMixin, mixins.TransactionMixin, WalletConnectMixin) {
  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;
  @state.settings.slippageTolerance private slippageTolerance!: string;
  @state.swap.paths private paths!: QuotePaths;
  @state.swap.payload private payload!: QuotePayload;
  @state.swap.fromValue private fromValue!: string;
  @state.swap.fromValueReversed private fromValueReversed!: string;
  @state.swap.toValue private toValue!: string;
  @state.noir.total total!: number;

  @getter.swap.swapLiquiditySource private liquiditySource!: Nullable<LiquiditySourceTypes>;
  @getter.settings.nodeIsConnected nodeIsConnected!: boolean;
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @getter.swap.tokenFrom tokenFrom!: AccountAsset;
  @getter.swap.tokenTo tokenTo!: AccountAsset;
  @getter.swap.isAvailable isAvailable!: boolean;
  @getter.noir.noirBalance noirBalance!: CodecString;
  @getter.noir.xorBalance xorBalance!: CodecString;

  @mutation.swap.setFromValue private setFromValue!: (value: string) => void;
  @mutation.swap.setFromValueReversed private setFromValueReversed!: (value: string) => void;
  @mutation.swap.setToValue private setToValue!: (value: string) => void;
  @mutation.swap.setPrimaryMarketsEnabledAssets private setEnabledAssets!: (args: PrimaryMarketsEnabledAssets) => void;
  @mutation.noir.setRedeemDialogVisibility private setRedeemDialogVisibility!: (flag: boolean) => void;
  @mutation.noir.setEditionDialogVisibility private setEditionDialogVisibility!: (flag: boolean) => void;

  @action.swap.setTokenFromAddress private setTokenFromAddress!: (address?: string) => Promise<void>;
  @action.swap.setTokenToAddress private setTokenToAddress!: (address?: string) => Promise<void>;
  @action.swap.reset private reset!: AsyncVoidFn;
  @action.swap.setSubscriptionPayload private setSubscriptionPayload!: (payload: QuotePayload) => Promise<void>;
  @action.swap.resetSubscriptions private resetSubscriptions!: AsyncVoidFn;
  @action.swap.updateSubscriptions private updateSubscriptions!: AsyncVoidFn;

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
      this.subscribeOnEnabledAssets();
      this.subscribeOnSwapReserves();
    } else {
      this.resetSubscriptions();
      this.cleanEnabledAssetsSubscription();
      this.cleanSwapReservesSubscription();
    }
  }

  readonly delimiters = FPNumber.DELIMITERS_CONFIG;
  KnownSymbols = KnownSymbols;
  liquidityReservesSubscription: Nullable<Subscription> = null;
  enabledAssetsSubscription: Nullable<Subscription> = null;
  recountSwapValues = debouncedInputHandler(this.runRecountSwapValues, 100);

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

  get availableForRedemption(): number {
    if (!this.payload || !this.tokenTo) return 0;

    const reserves = this.payload.reserves.xyk[this.tokenTo.address][1];
    const value = this.getFPNumberFromCodec(reserves, this.tokenTo.decimals).toNumber();

    return Math.floor(value);
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
      const xorAddress = XOR.address;
      await this.setTokenFromAddress(xorAddress);
      await this.setTokenToAddress(NOIR_TOKEN_ADDRESS);
      this.setToValue('1');

      if (!this.enabledAssetsSubscription) {
        this.subscribeOnEnabledAssets();
      }
      if (!this.liquidityReservesSubscription) {
        this.subscribeOnSwapReserves();
      }
    });
  }

  // mounted(): void {
  //   bottle();
  // }

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
      const { amount: amountBuy } = api.swap.getResult(
        this.tokenFrom as AccountAsset,
        this.tokenTo as AccountAsset,
        this.toValue,
        false,
        [this.liquiditySource].filter(Boolean) as LiquiditySourceTypes[],
        this.paths,
        this.payload
      );

      const { amount: amountSell } = api.swap.getResult(
        this.tokenTo as AccountAsset,
        this.tokenFrom as AccountAsset,
        this.toValue,
        true,
        [this.liquiditySource].filter(Boolean) as LiquiditySourceTypes[],
        this.paths,
        this.payload
      );

      this.setFromValue(this.getStringFromCodec(amountBuy));
      this.setFromValueReversed(this.getStringFromCodec(amountSell));
    } catch (error: any) {
      console.error(error);
      this.resetFieldFrom();
    }
  }

  private cleanEnabledAssetsSubscription(): void {
    if (!this.enabledAssetsSubscription) {
      return;
    }
    this.enabledAssetsSubscription.unsubscribe();
    this.enabledAssetsSubscription = null;
  }

  private subscribeOnEnabledAssets(): void {
    this.cleanEnabledAssetsSubscription();

    this.enabledAssetsSubscription = api.swap.subscribeOnPrimaryMarketsEnabledAssets().subscribe(this.setEnabledAssets);
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

    this.liquidityReservesSubscription = api.swap
      .subscribeOnReserves(this.tokenFrom.address, this.tokenTo.address, this.liquiditySource as LiquiditySourceTypes)
      .subscribe(this.onChangeSwapReserves);
  }

  private async onChangeSwapReserves(payload: QuotePayload): Promise<void> {
    await this.setSubscriptionPayload(payload);

    this.runRecountSwapValues();
  }

  // noir nethods
  async buy(): Promise<void> {
    try {
      await this.withNotifications(
        async () =>
          await api.swap.execute(
            this.tokenFrom as AccountAsset, // XOR
            this.tokenTo as AccountAsset, // NOIR
            this.fromValue,
            this.toValue,
            this.slippageTolerance,
            true,
            this.liquiditySource as LiquiditySourceTypes
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
          await api.swap.execute(
            this.tokenTo, // NOIR
            this.tokenFrom, // XOR
            this.toValue,
            this.fromValueReversed,
            this.slippageTolerance,
            false,
            this.liquiditySource as LiquiditySourceTypes
          )
      );
    } catch (error) {
      console.error(error);
    }
  }

  redeem(): void {
    this.setRedeemDialogVisibility(true);
  }

  openEditionDialog(): void {
    this.setEditionDialogVisibility(true);
  }

  beforeDestroy(): void {
    this.cleanEnabledAssetsSubscription();
    this.cleanSwapReservesSubscription();
  }

  destroyed(): void {
    this.reset();
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

.cart .available {
  text-align: right;
}

.bottle-animation {
  height: 480px;
  background: transparent;
  position: absolute;
  bottom: 0;
  left: 50%;
  top: 50%;
  transform: translateX(-50%) translateY(-50%);
}
</style>
