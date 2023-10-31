<template>
  <div class="swap-container">
    <s-form v-loading="parentLoading" class="container container--swap el-form--actions" :show-message="false">
      <generic-page-header class="page-header--swap" :title="t('exchange.Swap')">
        <div class="swap-settings-buttons">
          <swap-status-action-badge>
            <template #label>{{ t('marketText') }}:</template>
            <template #value>{{ swapMarketAlgorithm }}</template>
            <template #action>
              <s-button
                class="el-button--settings"
                type="action"
                icon="basic-settings-24"
                @click="openSettingsDialog"
              />
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
        </div>
      </generic-page-header>

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
        {{ t('swap.connectWallet') }}
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
          {{ t('swap.pairIsNotCreated') }}
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
    </s-form>
    <swap-chart
      v-if="chartsEnabled"
      :token-from="tokenFrom"
      :token-to="tokenTo"
      :is-available="isAvailable"
      class="swap-chart"
    />
  </div>
</template>

<script lang="ts">
import { FPNumber, Operation } from '@sora-substrate/util';
import { KnownSymbols, XOR } from '@sora-substrate/util/build/assets/consts';
import { api, components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import SelectedTokenRouteMixin from '@/components/mixins/SelectedTokensRouteMixin';
import TokenSelectMixin from '@/components/mixins/TokenSelectMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components, MarketAlgorithms, PageNames, ZeroStringValue } from '@/consts';
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
import { DifferenceStatus, getDifferenceStatus } from '@/utils/swap';

import type { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import type { LPRewardsInfo, SwapQuote } from '@sora-substrate/liquidity-proxy/build/types';
import type { CodecString, NetworkFeesObject } from '@sora-substrate/util';
import type { AccountAsset, Asset } from '@sora-substrate/util/build/assets/types';
import type { DexId } from '@sora-substrate/util/build/dex/consts';
import type { SwapQuoteData } from '@sora-substrate/util/build/swap/types';
import type { Subscription } from 'rxjs';

@Component({
  components: {
    SwapSettings: lazyComponent(Components.SwapSettings),
    SwapConfirm: lazyComponent(Components.SwapConfirm),
    SwapStatusActionBadge: lazyComponent(Components.SwapStatusActionBadge),
    SwapTransactionDetails: lazyComponent(Components.SwapTransactionDetails),
    SwapChart: lazyComponent(Components.SwapChart),
    SwapLossWarningDialog: lazyComponent(Components.SwapLossWarningDialog),
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    SlippageTolerance: lazyComponent(Components.SlippageTolerance),
    SelectToken: lazyComponent(Components.SelectToken),
    TokenInput: lazyComponent(Components.TokenInput),
    ValueStatusWrapper: lazyComponent(Components.ValueStatusWrapper),
    SvgIconButton: lazyComponent(Components.SvgIconButton),
    FormattedAmount: components.FormattedAmount,
  },
})
export default class Swap extends Mixins(
  mixins.FormattedAmountMixin,
  mixins.LoadingMixin,
  TranslationMixin,
  TokenSelectMixin,
  SelectedTokenRouteMixin
) {
  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;
  @state.swap.isExchangeB isExchangeB!: boolean;
  @state.swap.fromValue fromValue!: string;
  @state.swap.toValue toValue!: string;
  @state.swap.isAvailable isAvailable!: boolean;
  @state.swap.swapQuote private swapQuote!: Nullable<SwapQuote>;
  @state.swap.allowLossPopup private allowLossPopup!: boolean;

  @getter.assets.xor private xor!: AccountAsset;
  @getter.swap.swapLiquiditySource private liquiditySource!: Nullable<LiquiditySourceTypes>;
  @getter.settings.chartsFlagEnabled chartsFlagEnabled!: boolean;
  @getter.settings.nodeIsConnected private nodeIsConnected!: boolean;
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

  get fromFiatAmount(): string {
    if (!(this.tokenFrom && this.fromValue)) return ZeroStringValue;
    return this.getFiatAmountByString(this.fromValue, this.tokenFrom) || ZeroStringValue;
  }

  get toFiatAmount(): string {
    if (!(this.tokenTo && this.toValue)) return ZeroStringValue;
    return this.getFiatAmountByString(this.toValue, this.tokenTo) || ZeroStringValue;
  }

  get fiatDifference(): string {
    const thousandRegExp = new RegExp(`\\${FPNumber.DELIMITERS_CONFIG.thousand}`, 'g');
    const decimalsRegExp = new RegExp(`\\${FPNumber.DELIMITERS_CONFIG.decimal}`, 'g');
    const toNumberString = (value: string) => value.replace(thousandRegExp, '').replace(decimalsRegExp, '.');

    const a = toNumberString(this.fromFiatAmount);
    const b = toNumberString(this.toFiatAmount);

    if (asZeroValue(a) || asZeroValue(b)) return '0';

    const from = new FPNumber(a);
    const to = new FPNumber(b);
    const difference = to.sub(from).div(from).mul(this.Hundred).toFixed(2);

    return difference;
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

  created() {
    this.withApi(async () => {
      this.parseCurrentRoute();
      if (this.tokenFrom && this.tokenTo) {
        this.updateRouteAfterSelectTokens(this.tokenFrom, this.tokenTo);
      } else if (this.isValidRoute && this.firstRouteAddress && this.secondRouteAddress) {
        await this.setTokenFromAddress(this.firstRouteAddress);
        await this.setTokenToAddress(this.secondRouteAddress);
      } else if (!this.tokenFrom) {
        await this.setTokenFromAddress(XOR.address);
        await this.setTokenToAddress();
      }
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
        result: { amount, amountWithoutImpact, fee, rewards, route },
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

    this.updateRouteAfterSelectTokens(this.tokenFrom, this.tokenTo);
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

  /** Overrides SelectedTokenRouteMixin */
  async setData(params: { firstAddress: string; secondAddress: string }): Promise<void> {
    await this.setTokenFromAddress(params.firstAddress);
    await this.setTokenToAddress(params.secondAddress);
    this.subscribeOnQuote();
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
    this.updateRouteAfterSelectTokens(this.tokenFrom, this.tokenTo);
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

<style lang="scss">
.app-main--has-charts {
  .swap-chart {
    flex-grow: 1;
    max-width: $inner-window-width;

    @include desktop {
      max-width: calc(#{$inner-window-width} * 2);
    }
  }
}
</style>

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

.swap-container {
  display: flex;
  flex-flow: row wrap;
  justify-content: center;
  align-items: flex-start;
  gap: $inner-spacing-medium;

  @include desktop {
    flex-flow: row nowrap;
  }
}

.container--swap {
  margin: 0;
}

.page-header--swap {
  justify-content: space-between;
  align-items: center;
}

.swap-settings-buttons {
  display: flex;
  align-items: center;

  & > *:not(:first-child) {
    margin-left: $inner-spacing-small;
  }
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
