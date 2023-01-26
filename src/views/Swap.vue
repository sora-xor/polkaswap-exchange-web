<template>
  <div class="swap-container">
    <s-form v-loading="parentLoading" class="container el-form--actions" :show-message="false">
      <generic-page-header class="page-header--swap" :title="t('exchange.Swap')">
        <div class="swap-settings-buttons">
          <status-action-badge>
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
          </status-action-badge>

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
          <value-status-wrapper :value="fiatDifference" class="price-difference__value">
            (<formatted-amount :value="fiatDifferenceFormatted">%</formatted-amount>)
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
        @click="handleConfirmSwap"
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
          {{ t('exchange.insufficientBalance', { tokenSymbol: tokenFromSymbol }) }}
        </template>
        <template v-else-if="isInsufficientXorForFee">
          {{ t('exchange.insufficientBalance', { tokenSymbol: KnownSymbols.XOR }) }}
        </template>
        <template v-else>
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
      <swap-confirm
        :visible.sync="showConfirmSwapDialog"
        :isInsufficientBalance="isInsufficientBalance"
        @confirm="confirmSwap"
      />
      <settings-dialog :visible.sync="showSettings" />
    </s-form>
    <swap-chart v-if="chartsEnabled" :token-from="tokenFrom" :token-to="tokenTo" :is-available="isAvailable" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { api, components, mixins } from '@soramitsu/soraneo-wallet-web';
import { FPNumber, Operation } from '@sora-substrate/util';
import { KnownSymbols, XOR } from '@sora-substrate/util/build/assets/consts';
import { DexId } from '@sora-substrate/util/build/dex/consts';
import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import type { Subscription } from 'rxjs';
import type { CodecString, NetworkFeesObject } from '@sora-substrate/util';
import type { AccountAsset, Asset } from '@sora-substrate/util/build/assets/types';
import type {
  QuotePayload,
  PrimaryMarketsEnabledAssets,
  LPRewardsInfo,
  SwapResult,
} from '@sora-substrate/liquidity-proxy/build/types';
import type { DexQuoteData } from '@/store/swap/types';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import TokenSelectMixin from '@/components/mixins/TokenSelectMixin';

import {
  isMaxButtonAvailable,
  getMaxValue,
  hasInsufficientBalance,
  hasInsufficientXorForFee,
  asZeroValue,
  getAssetBalance,
  debouncedInputHandler,
} from '@/utils';
import router, { lazyComponent } from '@/router';
import { Components, MarketAlgorithms, PageNames, ZeroStringValue } from '@/consts';
import { action, getter, mutation, state } from '@/store/decorators';

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    SettingsDialog: lazyComponent(Components.SettingsDialog),
    SlippageTolerance: lazyComponent(Components.SlippageTolerance),
    SelectToken: lazyComponent(Components.SelectToken),
    SwapConfirm: lazyComponent(Components.SwapConfirm),
    StatusActionBadge: lazyComponent(Components.StatusActionBadge),
    TokenInput: lazyComponent(Components.TokenInput),
    ValueStatusWrapper: lazyComponent(Components.ValueStatusWrapper),
    SwapTransactionDetails: lazyComponent(Components.SwapTransactionDetails),
    SwapChart: lazyComponent(Components.SwapChart),
    SvgIconButton: lazyComponent(Components.SvgIconButton),
    FormattedAmount: components.FormattedAmount,
  },
})
export default class Swap extends Mixins(
  mixins.FormattedAmountMixin,
  mixins.LoadingMixin,
  TranslationMixin,
  TokenSelectMixin
) {
  @state.settings.сhartsEnabled сhartsEnabled!: boolean;
  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;
  @state.swap.dexQuoteData private dexQuoteData!: Record<DexId, DexQuoteData>;
  @state.swap.enabledAssets private enabledAssets!: PrimaryMarketsEnabledAssets;
  @state.swap.isExchangeB isExchangeB!: boolean;
  @state.swap.fromValue fromValue!: string;
  @state.swap.toValue toValue!: string;

  @getter.assets.xor private xor!: AccountAsset;
  @getter.swap.swapLiquiditySource private liquiditySource!: Nullable<LiquiditySourceTypes>;
  @getter.settings.chartsFlagEnabled chartsFlagEnabled!: boolean;
  @getter.settings.nodeIsConnected nodeIsConnected!: boolean;
  @getter.settings.chartsEnabled chartsEnabled!: boolean;
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @getter.swap.tokenFrom tokenFrom!: Nullable<AccountAsset>;
  @getter.swap.tokenTo tokenTo!: Nullable<AccountAsset>;
  @getter.swap.isAvailable isAvailable!: boolean;
  @getter.swap.swapMarketAlgorithm swapMarketAlgorithm!: MarketAlgorithms;

  @mutation.settings.setChartsEnabled private setChartsEnabled!: (value: boolean) => void;
  @mutation.swap.setFromValue private setFromValue!: (value: string) => void;
  @mutation.swap.setToValue private setToValue!: (value: string) => void;
  @mutation.swap.setAmountWithoutImpact private setAmountWithoutImpact!: (amount: CodecString) => void;
  @mutation.swap.setExchangeB private setExchangeB!: (isExchangeB: boolean) => void;
  @mutation.swap.setLiquidityProviderFee private setLiquidityProviderFee!: (value: CodecString) => void;
  @mutation.swap.setPrimaryMarketsEnabledAssets private setEnabledAssets!: (args: PrimaryMarketsEnabledAssets) => void;
  @mutation.swap.setRewards private setRewards!: (rewards: Array<LPRewardsInfo>) => void;
  @mutation.swap.setPath private setPath!: (path: Array<string>) => void;
  @mutation.swap.selectDexId private selectDexId!: (dexId: DexId) => void;

  @action.swap.setTokenFromAddress private setTokenFromAddress!: (address?: string) => Promise<void>;
  @action.swap.setTokenToAddress private setTokenToAddress!: (address?: string) => Promise<void>;
  @action.swap.switchTokens private switchTokens!: AsyncFnWithoutArgs;
  @action.swap.reset private reset!: AsyncFnWithoutArgs;
  @action.swap.setSubscriptionPayload private setSubscriptionPayload!: (data: {
    dexId: number;
    payload: QuotePayload;
  }) => void;

  @action.swap.resetSubscriptions private resetBalanceSubscriptions!: AsyncFnWithoutArgs;
  @action.swap.updateSubscriptions private updateBalanceSubscriptions!: AsyncFnWithoutArgs;

  @Watch('liquiditySource')
  private handleLiquiditySourceChange(): void {
    this.subscribeOnSwapReserves();
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
  showConfirmSwapDialog = false;
  liquidityReservesSubscription: Nullable<Subscription> = null;
  enabledAssetsSubscription: Nullable<Subscription> = null;
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

  get isXorOutputSwap(): boolean {
    return this.tokenTo?.address === XOR.address;
  }

  get isMaxSwapAvailable(): boolean {
    if (!(this.tokenFrom && this.tokenTo)) return false;
    return (
      this.isLoggedIn &&
      isMaxButtonAvailable(
        this.areTokensSelected,
        this.tokenFrom,
        this.fromValue,
        this.networkFee,
        this.xor,
        false,
        this.isXorOutputSwap
      )
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
      if (!this.tokenFrom) {
        await this.setTokenFromAddress(XOR.address);
        await this.setTokenToAddress();
      }

      this.enableSwapSubscriptions();
    });
  }

  getTokenBalance(token: AccountAsset): CodecString {
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
    if (!this.areTokensSelected || asZeroValue(value)) return;
    const setOppositeValue = this.isExchangeB ? this.setFromValue : this.setToValue;
    const resetOppositeValue = this.isExchangeB ? this.resetFieldFrom : this.resetFieldTo;
    const oppositeToken = (this.isExchangeB ? this.tokenFrom : this.tokenTo) as AccountAsset;
    const dexes = api.dex.dexList;

    try {
      // TODO: [ARCH] Asset -> Asset | AccountAsset
      const results = dexes.reduce<{ [dexId: number]: SwapResult }>((buffer, { dexId }) => {
        const swapResult = api.swap.getResult(
          this.tokenFrom as Asset,
          this.tokenTo as Asset,
          value,
          this.isExchangeB,
          [this.liquiditySource].filter(Boolean) as Array<LiquiditySourceTypes>,
          this.dexQuoteData[dexId].paths,
          this.dexQuoteData[dexId].payload as QuotePayload,
          dexId as DexId
        );

        return { ...buffer, [dexId]: swapResult };
      }, {});

      let bestDexId: number = DexId.XOR;

      for (const currentDexId in results) {
        const currAmount = FPNumber.fromCodecValue(results[currentDexId].amount);
        const bestAmount = FPNumber.fromCodecValue(results[bestDexId].amount);

        if (currAmount.isZero()) continue;

        if (
          (FPNumber.isLessThan(currAmount, bestAmount) && this.isExchangeB) ||
          (FPNumber.isLessThan(bestAmount, currAmount) && !this.isExchangeB)
        ) {
          bestDexId = +currentDexId;
        }
      }

      const { amount, amountWithoutImpact, fee, rewards, path } = results[bestDexId];

      setOppositeValue(this.getStringFromCodec(amount, oppositeToken.decimals));
      this.setAmountWithoutImpact(amountWithoutImpact as string);
      this.setLiquidityProviderFee(fee);
      this.setRewards(rewards);
      this.setPath(path as string[]);
      this.selectDexId(bestDexId);
    } catch (error: any) {
      console.error(error);
      resetOppositeValue();
    }
  }

  private cleanEnabledAssetsSubscription(): void {
    this.enabledAssetsSubscription?.unsubscribe();
    this.enabledAssetsSubscription = null;
  }

  private subscribeOnEnabledAssetsAndSwapReserves(): void {
    this.cleanEnabledAssetsSubscription();
    this.enabledAssetsSubscription = api.swap.subscribeOnPrimaryMarketsEnabledAssets().subscribe((enabledAssets) => {
      this.setEnabledAssets(enabledAssets);
      this.subscribeOnSwapReserves();
    });
  }

  private cleanSwapReservesSubscription(): void {
    this.liquidityReservesSubscription?.unsubscribe();
    this.liquidityReservesSubscription = null;
  }

  private subscribeOnSwapReserves(): void {
    this.cleanSwapReservesSubscription();

    if (!this.areTokensSelected) return;

    this.loading = true;

    this.liquidityReservesSubscription = api.swap
      .subscribeOnAllDexesReserves(
        (this.tokenFrom as AccountAsset).address,
        (this.tokenTo as AccountAsset).address,
        this.enabledAssets,
        this.liquiditySource as LiquiditySourceTypes
      )
      .subscribe((results) => {
        results.forEach((result) => this.setSubscriptionPayload(result));
        this.runRecountSwapValues();
        this.loading = false;
      });
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

    this.subscribeOnSwapReserves();
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
        this.subscribeOnSwapReserves();
      });
    }
  }

  handleConfirmSwap(): void {
    this.showConfirmSwapDialog = true;
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
    this.subscribeOnEnabledAssetsAndSwapReserves();
  }

  private resetSwapSubscriptions(): void {
    this.resetBalanceSubscriptions();
    this.cleanEnabledAssetsSubscription();
    this.cleanSwapReservesSubscription();
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
  .container--charts {
    min-width: calc(#{$bridge-width} * 0.75);
  }
}
@include desktop {
  .app-main--has-charts {
    .swap-container {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding-top: $inner-spacing-medium;
      .el-form {
        flex-shrink: 0;
      }
      .el-form,
      .container--charts {
        margin-right: $basic-spacing-small;
        margin-left: $basic-spacing-small;
      }
    }
    .el-form--actions {
      flex-shrink: 0;
    }
  }
}

@include large-desktop {
  .app-main--has-charts {
    .container--charts {
      max-width: calc(#{$bridge-width} * 2);
      flex-grow: 1;
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
</style>
