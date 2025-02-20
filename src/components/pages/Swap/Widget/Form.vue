<template>
  <base-widget class="swap-widget" :title="t('exchange.Swap')" v-bind="$attrs">
    <template #filters>
      <swap-status-action-badge>
        <template #label>{{ t('marketText') }}:</template>
        <template #value>{{ swapMarketAlgorithm }}</template>
        <template #action>
          <s-button class="el-button--settings" type="action" icon="basic-settings-24" @click="openSettingsDialog" />
        </template>
      </swap-status-action-badge>
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
      />

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
        @click="connectSoraWallet"
      >
        {{ t('connectWalletText') }}
      </s-button>
      <s-button
        v-else
        class="action-button s-typography-button--large"
        data-test-name="confirmSwap"
        type="primary"
        :disabled="isConfirmSwapDisabled"
        :loading="loading || quoteLoading || isSelectAssetLoading"
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

      <swap-transaction-details :disabled="!areTokensSelected || hasZeroAmount" class="swap-details">
        <template #reference>
          <info-line
            :label="t('networkFeeText')"
            :label-tooltip="t('networkFeeTooltipText')"
            :value="networkFeeFormatted"
            :asset-symbol="xorSymbol"
            :fiat-value="getFiatAmountByCodecString(networkFee)"
            is-formatted
            class="swap-details-info-line"
          />
        </template>
      </swap-transaction-details>

      <select-token
        :visible.sync="showSelectTokenDialog"
        :connected="isLoggedIn"
        :asset="isTokenFromSelected ? tokenTo : tokenFrom"
        @select="handleSelectToken"
      />
      <swap-loss-warning-dialog
        :visible.sync="lossWarningVisibility"
        :value="fiatDifferenceFormatted"
        @confirm="handleConfirm"
      />
      <swap-confirm
        :visible.sync="confirmDialogVisibility"
        :is-insufficient-balance="isInsufficientBalance"
        @confirm="exchangeTokens"
      />
      <swap-settings :visible.sync="showSettings" />
    </div>
  </base-widget>
</template>

<script lang="ts">
import { FPNumber, Operation } from '@sora-substrate/sdk';
import { KnownSymbols, XOR } from '@sora-substrate/sdk/build/assets/consts';
import { api, components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import ConfirmDialogMixin from '@/components/mixins/ConfirmDialogMixin';
import InternalConnectMixin from '@/components/mixins/InternalConnectMixin';
import SwapAmountsMixin from '@/components/mixins/SwapAmountsMixin';
import TokenSelectMixin from '@/components/mixins/TokenSelectMixin';
import { Components, MarketAlgorithms } from '@/consts';
import { lazyComponent } from '@/router';
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
import type { CodecString, NetworkFeesObject } from '@sora-substrate/sdk';
import type { AccountAsset, Asset } from '@sora-substrate/sdk/build/assets/types';
import type { DexId } from '@sora-substrate/sdk/build/dex/consts';
import type { SwapQuoteData } from '@sora-substrate/sdk/build/swap/types';
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
    FormattedAmount: components.FormattedAmount,
    InfoLine: components.InfoLine,
  },
})
export default class SwapFormWidget extends Mixins(
  mixins.FormattedAmountMixin,
  mixins.TransactionMixin,
  TokenSelectMixin,
  ConfirmDialogMixin,
  InternalConnectMixin,
  SwapAmountsMixin
) {
  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;

  @state.swap.isExchangeB isExchangeB!: boolean;
  @state.swap.isAvailable isAvailable!: boolean;
  @state.swap.swapQuote private swapQuote!: Nullable<SwapQuote>;
  @state.swap.allowLossPopup private allowLossPopup!: boolean;
  @state.swap.selectedDexId private selectedDexId!: number;
  @state.settings.slippageTolerance private slippageTolerance!: string;

  @getter.assets.xor private xor!: AccountAsset;
  @getter.swap.swapLiquiditySource liquiditySource!: Nullable<LiquiditySourceTypes>;
  @getter.settings.nodeIsConnected nodeIsConnected!: boolean;
  @getter.settings.debugEnabled private debugEnabled!: boolean;
  @getter.swap.swapMarketAlgorithm swapMarketAlgorithm!: MarketAlgorithms;

  @mutation.swap.setAmountWithoutImpact private setAmountWithoutImpact!: (amount?: CodecString) => void;
  @mutation.swap.setExchangeB private setExchangeB!: (isExchangeB: boolean) => void;
  @mutation.swap.setLiquidityProviderFee private setLiquidityProviderFee!: (value?: CodecString) => void;
  @mutation.swap.setRewards private setRewards!: (rewards?: Array<LPRewardsInfo>) => void;
  @mutation.swap.setRoute private setRoute!: (route?: Array<string>) => void;
  @mutation.swap.setDistribution private setDistribution!: (distribution?: Distribution[][]) => void;
  @mutation.swap.selectDexId private selectDexId!: (dexId?: DexId) => void;
  @mutation.swap.setSubscriptionPayload private setSubscriptionPayload!: (payload?: SwapQuoteData) => void;

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
  lossWarningVisibility = false;
  quoteSubscription: Nullable<Subscription> = null;
  quoteLoading = false;
  recountSwapValues = debouncedInputHandler(this.runRecountSwapValues, 100);

  get xorSymbol(): string {
    return ' ' + XOR.symbol;
  }

  get networkFeeFormatted(): string {
    return this.formatCodecNumber(this.networkFee);
  }

  get tokenFromSymbol(): string {
    return this.tokenFrom?.symbol ?? '';
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

  private async runRecountSwapValues(): Promise<void> {
    const value = this.isExchangeB ? this.toValue : this.fromValue;

    if (!this.areTokensSelected || asZeroValue(value) || !this.swapQuote) {
      this.setAmountWithoutImpact();
      this.setLiquidityProviderFee();
      this.setRewards();
      this.setRoute();
      this.setDistribution();
      this.selectDexId();
      return;
    }

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

      // [DEBUG]
      if (this.debugEnabled) {
        const rpcResult = await api.swap.getResultRpc(
          (this.tokenFrom as Asset).address,
          (this.tokenTo as Asset).address,
          value,
          this.isExchangeB,
          this.liquiditySource ?? undefined
        );

        console.table({
          frontend: amount,
          backend: rpcResult.amount,
          difference: +amount - +rpcResult.amount,
        });
      }

      setOppositeValue(this.getStringFromCodec(amount, oppositeToken.decimals));
      this.setAmountWithoutImpact(amountWithoutImpact as string);
      this.setLiquidityProviderFee(fee as CodecString);
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

    this.quoteLoading = true;

    const observableQuote = api.swap.getDexesSwapQuoteObservable(
      (this.tokenFrom as AccountAsset).address,
      (this.tokenTo as AccountAsset).address
    );

    if (observableQuote) {
      this.quoteSubscription = observableQuote.subscribe((quoteData) => {
        this.setSubscriptionPayload(quoteData);
        this.runRecountSwapValues();
        this.quoteLoading = false;
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
      this.handleConfirm();
    }
  }

  handleConfirm(): void {
    this.confirmOrExecute(this.exchangeTokens);
  }

  async exchangeTokens(): Promise<void> {
    if (this.isConfirmSwapDisabled) return;

    await this.withNotifications(async () => {
      await api.swap.execute(
        this.tokenFrom as AccountAsset,
        this.tokenTo as AccountAsset,
        this.fromValue,
        this.toValue,
        this.slippageTolerance,
        this.isExchangeB,
        this.liquiditySource as LiquiditySourceTypes,
        this.selectedDexId
      );

      this.resetFieldFrom();
      this.resetFieldTo();
      this.setExchangeB(false);
    });
  }

  openSettingsDialog(): void {
    this.showSettings = true;
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
  @include buttons;
  @include full-width-button('action-button');
  @include full-width-button('swap-details', 0);
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
  margin-right: $inner-spacing-mini;
  &,
  &:hover {
    color: inherit;
  }
}
</style>
