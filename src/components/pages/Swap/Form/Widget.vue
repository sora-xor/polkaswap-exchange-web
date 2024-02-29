<template>
  <base-widget v-loading="parentLoading" class="swap-widget" :title="t('exchange.Swap')" primary-title>
    <template #filters>
      <swap-status-action-badge>
        <template #label>{{ t('marketText') }}:</template>
        <template #value>{{ swapMarketAlgorithm }}</template>
        <template #action>
          <s-button class="el-button--settings" type="action" icon="basic-settings-24" @click="openSettingsDialog" />
        </template>
      </swap-status-action-badge>

      <svg-icon-button
        v-if="chartsFlagEnabled"
        icon="line-icon"
        size="medium"
        :tooltip="t('dexSettings.сhartsDescription')"
        :active="chartsEnabled"
        @click="toggleChart"
      />
    </template>

    <div class="swap-form">
      <token-input
        data-test-name="swapFrom"
        is-select-available
        :balance="getTokenBalance(tokenFrom)"
        :is-max-available="isMaxSwapAvailable"
        :title="t('transfers.from')"
        :token="tokenFrom"
        :value="fromValue"
        @input="handleInputFieldFrom"
        @focus="handleFocusField(false)"
        @max="handleMaxValue"
        @select="openSelectTokenDialog(true)"
      >
        <template #title-append v-if="areTokensSelected && !isZeroToAmount && isExchangeB">
          <span class="input-title--uppercase input-title--primary"> ({{ t('swap.estimated') }}) </span>
        </template>
      </token-input>

      <s-button
        class="el-button--switch-tokens"
        data-test-name="switchToken"
        type="action"
        icon="arrows-swap-90-24"
        :disabled="!areTokensSelected"
        @click="handleSwitchTokens"
      />

      <token-input
        data-test-name="swapTo"
        is-select-available
        :balance="getTokenBalance(tokenTo)"
        :title="t('transfers.to')"
        :token="tokenTo"
        :value="toValue"
        @input="handleInputFieldTo"
        @focus="handleFocusField(true)"
        @select="openSelectTokenDialog(false)"
      >
        <template #title-append v-if="areTokensSelected && !isZeroFromAmount && !isExchangeB">
          <span class="input-title--uppercase input-title--primary"> ({{ t('swap.estimated') }}) </span>
        </template>
        <template #fiat-amount-append v-if="tokenTo">
          <value-status-wrapper :value="fiatDifference" badge class="price-difference__value">
            <formatted-amount :value="fiatDifferenceFormatted">%</formatted-amount>
          </value-status-wrapper>
        </template>
      </token-input>

      <slippage-tolerance class="slippage-tolerance-settings" />

      <s-button
        v-if="!isLoggedIn"
        type="primary"
        class="action-button s-typography-button--large"
        @click="handleConnectWallet"
      >
        {{ t('connectWalletText') }}
      </s-button>
      <s-button
        v-else
        class="action-button s-typography-button--large"
        data-test-name="confirmSwap"
        type="primary"
        :disabled="isConfirmSwapDisabled"
        :loading="loading || isSelectAssetLoading"
        @click="handleSwapClick"
      >
        <template v-if="!areTokensSelected">
          {{ t('buttons.chooseTokens') }}
        </template>
        <template v-else-if="!isAvailable">
          {{ t('pairIsNotCreated') }}
        </template>
        <template v-else-if="areZeroAmounts">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else-if="isInsufficientLiquidity">
          {{ t('swap.insufficientLiquidity') }}
        </template>
        <template v-else-if="isInsufficientBalance">
          {{ t('insufficientBalanceText', { tokenSymbol: tokenFromSymbol }) }}
        </template>
        <template v-else-if="isInsufficientXorForFee">
          {{ t('insufficientBalanceText', { tokenSymbol: KnownSymbols.XOR }) }}
        </template>
        <template v-else>
          <s-icon
            v-if="isErrorFiatDifferenceStatus"
            name="notifications-alert-triangle-24"
            size="18"
            class="action-button-icon"
          />
          {{ t('exchange.Swap') }}
        </template>
      </s-button>

      <swap-transaction-details
        v-if="areTokensSelected && !hasZeroAmount"
        class="info-line-container"
        :info-only="false"
      />
      <select-token
        :visible.sync="showSelectTokenDialog"
        :connected="isLoggedIn"
        :asset="isTokenFromSelected ? tokenTo : tokenFrom"
        @select="handleSelectToken"
      />
      <swap-loss-warning-dialog
        :visible.sync="lossWarningVisibility"
        :value="fiatDifferenceFormatted"
        @confirm="showConfirmDialog"
      />
      <swap-confirm
        :visible.sync="confirmVisibility"
        :isInsufficientBalance="isInsufficientBalance"
        @confirm="confirmSwap"
      />
      <swap-settings :visible.sync="showSettings" />
    </div>
  </base-widget>
</template>

<script lang="ts">
import { FPNumber, Operation } from '@sora-substrate/util';
import { KnownSymbols, XOR } from '@sora-substrate/util/build/assets/consts';
import { api, components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import TokenSelectMixin from '@/components/mixins/TokenSelectMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components, MarketAlgorithms, PageNames } from '@/consts';
import router, { lazyComponent } from '@/router';
import { action, getter, mutation, state } from '@/store/decorators';
import {
  isMaxButtonAvailable,
  getMaxValue,
  hasInsufficientBalance,
  hasInsufficientXorForFee,
  asZeroValue,
  getAssetBalance,
  debouncedInputHandler,
} from '@/utils';
import { DifferenceStatus, getDifferenceStatus, calcFiatDifference } from '@/utils/swap';

import type { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import type { LPRewardsInfo, SwapQuote, Distribution } from '@sora-substrate/liquidity-proxy/build/types';
import type { CodecString, NetworkFeesObject } from '@sora-substrate/util';
import type { AccountAsset, Asset } from '@sora-substrate/util/build/assets/types';
import type { DexId } from '@sora-substrate/util/build/dex/consts';
import type { SwapQuoteData } from '@sora-substrate/util/build/swap/types';
import type { Subscription } from 'rxjs';

@Component({
  components: {
    BaseWidget: lazyComponent(Components.BaseWidget),
    SwapSettings: lazyComponent(Components.SwapSettings),
    SwapConfirm: lazyComponent(Components.SwapConfirm),
    SwapStatusActionBadge: lazyComponent(Components.SwapStatusActionBadge),
    SwapTransactionDetails: lazyComponent(Components.SwapTransactionDetails),
    SwapLossWarningDialog: lazyComponent(Components.SwapLossWarningDialog),
    SlippageTolerance: lazyComponent(Components.SlippageTolerance),
    SelectToken: lazyComponent(Components.SelectToken),
    TokenInput: lazyComponent(Components.TokenInput),
    ValueStatusWrapper: lazyComponent(Components.ValueStatusWrapper),
    SvgIconButton: lazyComponent(Components.SvgIconButton),
    FormattedAmount: components.FormattedAmount,
  },
})
export default class SwapFormWidget extends Mixins(
  mixins.FormattedAmountMixin,
  mixins.LoadingMixin,
  TranslationMixin,
  TokenSelectMixin
) {
  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;
  @state.swap.isExchangeB isExchangeB!: boolean;
  @state.swap.fromValue fromValue!: string;
  @state.swap.toValue toValue!: string;
  @state.swap.isAvailable isAvailable!: boolean;
  @state.swap.swapQuote private swapQuote!: Nullable<SwapQuote>;
  @state.swap.allowLossPopup private allowLossPopup!: boolean;

  @getter.assets.xor private xor!: AccountAsset;
  @getter.swap.swapLiquiditySource liquiditySource!: Nullable<LiquiditySourceTypes>;
  @getter.settings.chartsFlagEnabled chartsFlagEnabled!: boolean;
  @getter.settings.nodeIsConnected nodeIsConnected!: boolean;
  @getter.settings.chartsEnabled chartsEnabled!: boolean;
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @getter.swap.tokenFrom tokenFrom!: Nullable<AccountAsset>;
  @getter.swap.tokenTo tokenTo!: Nullable<AccountAsset>;
  @getter.swap.swapMarketAlgorithm swapMarketAlgorithm!: MarketAlgorithms;

  @mutation.settings.setChartsEnabled private setChartsEnabled!: (value: boolean) => void;
  @mutation.swap.setFromValue private setFromValue!: (value: string) => void;
  @mutation.swap.setToValue private setToValue!: (value: string) => void;
  @mutation.swap.setAmountWithoutImpact private setAmountWithoutImpact!: (amount: CodecString) => void;
  @mutation.swap.setExchangeB private setExchangeB!: (isExchangeB: boolean) => void;
  @mutation.swap.setLiquidityProviderFee private setLiquidityProviderFee!: (value: CodecString) => void;
  @mutation.swap.setRewards private setRewards!: (rewards: Array<LPRewardsInfo>) => void;
  @mutation.swap.setRoute private setRoute!: (route: Array<string>) => void;
  @mutation.swap.setDistribution private setDistribution!: (distribution: Distribution[][]) => void;
  @mutation.swap.selectDexId private selectDexId!: (dexId: DexId) => void;
  @mutation.swap.setSubscriptionPayload private setSubscriptionPayload!: (payload?: SwapQuoteData) => void;

  @action.swap.setTokenFromAddress private setTokenFromAddress!: (address?: string) => Promise<void>;
  @action.swap.setTokenToAddress private setTokenToAddress!: (address?: string) => Promise<void>;
  @action.swap.switchTokens private switchTokens!: AsyncFnWithoutArgs;
  @action.swap.reset private reset!: AsyncFnWithoutArgs;

  @action.swap.resetSubscriptions private resetBalanceSubscriptions!: AsyncFnWithoutArgs;
  @action.swap.updateSubscriptions private updateBalanceSubscriptions!: AsyncFnWithoutArgs;

  @Watch('liquiditySource')
  private handleLiquiditySourceChange(): void {
    this.runRecountSwapValues();
  }

  @Watch('nodeIsConnected')
  private updateConnectionSubsriptions(nodeConnected: boolean) {
    if (nodeConnected) {
      this.enableSwapSubscriptions();
    } else {
      this.resetSwapSubscriptions();
    }
  }

  readonly delimiters = FPNumber.DELIMITERS_CONFIG;
  KnownSymbols = KnownSymbols;
  isTokenFromSelected = false;
  showSettings = false;
  showSelectTokenDialog = false;
  confirmVisibility = false;
  lossWarningVisibility = false;
  quoteSubscription: Nullable<Subscription> = null;
  recountSwapValues = debouncedInputHandler(this.runRecountSwapValues, 100);

  get tokenFromSymbol(): string {
    return this.tokenFrom?.symbol ?? '';
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

  get fromFiatAmount(): FPNumber {
    if (!(this.tokenFrom && this.fromValue)) return FPNumber.ZERO;
    return this.getFPNumberFiatAmountByFPNumber(new FPNumber(this.fromValue), this.tokenFrom) ?? FPNumber.ZERO;
  }

  get toFiatAmount(): FPNumber {
    if (!(this.tokenTo && this.toValue)) return FPNumber.ZERO;
    return this.getFPNumberFiatAmountByFPNumber(new FPNumber(this.toValue), this.tokenTo) ?? FPNumber.ZERO;
  }

  get fiatDifference(): string {
    return calcFiatDifference(this.fromFiatAmount, this.toFiatAmount).toFixed(2);
  }

  get fiatDifferenceFormatted(): string {
    return this.formatStringValue(this.fiatDifference);
  }

  get isErrorFiatDifferenceStatus(): boolean {
    const value = Number(this.fiatDifference);
    const prepared = Number.isFinite(value) ? value : 0;
    const status = getDifferenceStatus(prepared);

    return status === DifferenceStatus.Error;
  }

  get isXorOutputSwap(): boolean {
    return this.tokenTo?.address === XOR.address;
  }

  get isMaxSwapAvailable(): boolean {
    if (!this.preparedForSwap) return false;

    return isMaxButtonAvailable(
      this.tokenFrom as AccountAsset,
      this.fromValue,
      this.networkFee,
      this.xor,
      this.isXorOutputSwap
    );
  }

  get preparedForSwap(): boolean {
    return this.isLoggedIn && this.areTokensSelected;
  }

  get isInsufficientLiquidity(): boolean {
    return this.isAvailable && this.preparedForSwap && !this.areZeroAmounts && this.hasZeroAmount;
  }

  get isInsufficientBalance(): boolean {
    if (!this.tokenFrom) return false;

    return this.preparedForSwap && hasInsufficientBalance(this.tokenFrom, this.fromValue, this.networkFee);
  }

  get isInsufficientXorForFee(): boolean {
    const isInsufficientXorForFee =
      this.preparedForSwap && hasInsufficientXorForFee(this.xor, this.networkFee, this.isXorOutputSwap);
    if (isInsufficientXorForFee || !this.isXorOutputSwap) {
      return isInsufficientXorForFee;
    }
    // It's required for XOR output without XOR or with XOR balance < network fee
    const xorBalance = this.getFPNumberFromCodec(this.xor.balance?.transferable ?? '0', this.xor.decimals);
    const fpNetworkFee = this.getFPNumberFromCodec(this.networkFee, this.xor.decimals).sub(xorBalance);
    const fpAmount = this.getFPNumber(this.toValue, this.xor.decimals).sub(
      FPNumber.gt(fpNetworkFee, this.Zero) ? fpNetworkFee : this.Zero
    );
    return FPNumber.lte(fpAmount, this.Zero);
  }

  get networkFee(): CodecString {
    return this.networkFees[Operation.Swap];
  }

  get isConfirmSwapDisabled(): boolean {
    return (
      !this.areTokensSelected ||
      !this.isAvailable ||
      this.areZeroAmounts ||
      this.isInsufficientLiquidity ||
      this.isInsufficientBalance ||
      this.isInsufficientXorForFee
    );
  }

  created(): void {
    this.withApi(async () => {
      // to update tbc & xst enabled assets
      await api.swap.update();

      this.enableSwapSubscriptions();
    });
  }

  getTokenBalance(token: Nullable<AccountAsset>): CodecString {
    return getAssetBalance(token);
  }

  resetFieldFrom(): void {
    this.setFromValue('');
  }

  resetFieldTo(): void {
    this.setToValue('');
  }

  handleInputFieldFrom(value: string): void {
    if (!this.areTokensSelected || asZeroValue(value)) {
      this.resetFieldTo();
    }

    if (value === this.fromValue) return;

    this.setFromValue(value);

    this.recountSwapValues();
  }

  handleInputFieldTo(value: string): void {
    if (!this.areTokensSelected || asZeroValue(value)) {
      this.resetFieldFrom();
    }

    if (value === this.toValue) return;

    this.setToValue(value);

    this.recountSwapValues();
  }

  private runRecountSwapValues(): void {
    const value = this.isExchangeB ? this.toValue : this.fromValue;
    if (!this.areTokensSelected || asZeroValue(value) || !this.swapQuote) return;
    const setOppositeValue = this.isExchangeB ? this.setFromValue : this.setToValue;
    const resetOppositeValue = this.isExchangeB ? this.resetFieldFrom : this.resetFieldTo;
    const oppositeToken = (this.isExchangeB ? this.tokenFrom : this.tokenTo) as AccountAsset;

    try {
      const {
        dexId,
        result: { amount, amountWithoutImpact, fee, rewards, route, distribution },
      } = this.swapQuote(
        (this.tokenFrom as Asset).address,
        (this.tokenTo as Asset).address,
        value,
        this.isExchangeB,
        [this.liquiditySource].filter(Boolean) as Array<LiquiditySourceTypes>
      );

      setOppositeValue(this.getStringFromCodec(amount, oppositeToken.decimals));
      this.setAmountWithoutImpact(amountWithoutImpact as string);
      this.setLiquidityProviderFee(fee);
      this.setRewards(rewards);
      this.setRoute(route as string[]);
      this.setDistribution(distribution as Distribution[][]);
      this.selectDexId(dexId);
    } catch (error: any) {
      console.error(error);
      resetOppositeValue();
    }
  }

  private resetQuoteSubscription(): void {
    this.quoteSubscription?.unsubscribe();
    this.quoteSubscription = null;
  }

  private async subscribeOnQuote(): Promise<void> {
    this.resetQuoteSubscription();

    if (!this.areTokensSelected) return;

    this.loading = true;

    const observableQuote = api.swap.getDexesSwapQuoteObservable(
      (this.tokenFrom as AccountAsset).address,
      (this.tokenTo as AccountAsset).address
    );

    if (observableQuote) {
      this.quoteSubscription = observableQuote.subscribe((quoteData) => {
        this.setSubscriptionPayload(quoteData);
        this.runRecountSwapValues();
        this.loading = false;
      });
    } else {
      this.setSubscriptionPayload();
    }
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
    if (!this.areTokensSelected) return;

    await this.switchTokens();

    this.runRecountSwapValues();
  }

  handleMaxValue(): void {
    if (!this.tokenFrom) return;

    this.setExchangeB(false);

    const max = getMaxValue(this.tokenFrom, this.networkFee);

    this.handleInputFieldFrom(max);
  }

  handleConnectWallet(): void {
    router.push({ name: PageNames.Wallet });
  }

  openSelectTokenDialog(isTokenFrom: boolean): void {
    this.isTokenFromSelected = isTokenFrom;
    this.showSelectTokenDialog = true;
  }

  async handleSelectToken(token: AccountAsset): Promise<void> {
    if (token) {
      await this.withSelectAssetLoading(async () => {
        if (this.isTokenFromSelected) {
          await this.setTokenFromAddress(token.address);
        } else {
          await this.setTokenToAddress(token.address);
        }
        this.subscribeOnQuote();
      });
    }
  }

  handleSwapClick(): void {
    if (this.isErrorFiatDifferenceStatus && this.allowLossPopup) {
      this.lossWarningVisibility = true;
    } else {
      this.showConfirmDialog();
    }
  }

  showConfirmDialog(): void {
    this.confirmVisibility = true;
  }

  async confirmSwap(isSwapConfirmed: boolean): Promise<void> {
    if (isSwapConfirmed) {
      this.resetFieldFrom();
      this.resetFieldTo();
      this.setExchangeB(false);
    }
  }

  openSettingsDialog(): void {
    this.showSettings = true;
  }

  toggleChart(): void {
    this.setChartsEnabled(!this.chartsEnabled);
  }

  private enableSwapSubscriptions(): void {
    this.updateBalanceSubscriptions();
    this.subscribeOnQuote();
  }

  private resetSwapSubscriptions(): void {
    this.resetBalanceSubscriptions();
    this.resetQuoteSubscription();
  }

  beforeDestroy(): void {
    this.resetSwapSubscriptions();
  }

  destroyed(): void {
    this.reset();
  }
}
</script>

<style lang="scss" scoped>
.swap-widget {
  max-width: $inner-window-width;

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

.swap-form {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
}

.price-difference {
  &__value {
    font-weight: 600;
    font-size: var(--s-font-size-small);
    white-space: nowrap;

    & > span {
      padding-right: 2px;
    }
  }
}

i.action-button-icon[class*=' s-icon-'] {
  &,
  &:hover {
    color: inherit;
  }
  margin-right: $inner-spacing-mini;
}
</style>
