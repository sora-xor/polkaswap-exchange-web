<template>
  <s-form v-loading="parentLoading" class="container el-form--actions" :show-message="false">
    <generic-page-header class="page-header--swap" :title="t('exchange.Swap')">
      <status-action-badge>
        <template #label>{{ t('marketText') }}:</template>
        <template #value>{{ swapMarketAlgorithm }}</template>
        <template #action>
          <s-button
            class="el-button--settings"
            type="action"
            icon="basic-settings-24"
            :disabled="!marketAlgorithmsAvailable"
            @click="openSettingsDialog"
          />
        </template>
      </status-action-badge>
    </generic-page-header>
    <s-float-input
      class="s-input--token-value"
      size="medium"
      :value="fromValue"
      :decimals="(tokenFrom || {}).decimals"
      has-locale-string
      :delimiters="delimiters"
      :max="getMax((tokenFrom || {}).address)"
      @input="handleInputFieldFrom"
      @focus="handleFocusField(false)"
    >
      <div slot="top" class="input-line">
        <div class="input-title">
          <span class="input-title--uppercase input-title--primary">{{ t('transfers.from') }}</span>
          <span
            v-if="areTokensSelected && !isZeroToAmount && isExchangeB"
            class="input-title--uppercase input-title--primary"
          >
            ({{ t('swap.estimated') }})
          </span>
        </div>
        <div v-if="isLoggedIn && tokenFrom && tokenFrom.balance" class="input-value">
          <span class="input-value--uppercase">{{ t('exchange.balance') }}</span>
          <formatted-amount-with-fiat-value
            value-can-be-hidden
            with-left-shift
            value-class="input-value--primary"
            :value="formatBalance(tokenFrom)"
            :fiat-value="getFiatBalance(tokenFrom)"
          />
        </div>
      </div>
      <div slot="right" class="s-flex el-buttons">
        <s-button
          v-if="tokenFrom && isMaxSwapAvailable"
          class="el-button--max s-typography-button--small"
          type="primary"
          alternative
          size="mini"
          border-radius="mini"
          @click="handleMaxValue"
        >
          {{ t('buttons.max') }}
        </s-button>
        <token-select-button
          class="el-button--select-token"
          icon="chevron-down-rounded-16"
          :token="tokenFrom"
          @click="openSelectTokenDialog(true)"
        />
      </div>
      <div slot="bottom" class="input-line input-line--footer">
        <formatted-amount v-if="tokenFrom && tokenFromPrice" is-fiat-value :value="fromFiatAmount" />
        <token-address
          v-if="tokenFrom"
          :name="tokenFrom.name"
          :symbol="tokenFrom.symbol"
          :address="tokenFrom.address"
          class="input-value"
        />
      </div>
    </s-float-input>
    <s-button
      class="el-button--switch-tokens"
      type="action"
      icon="arrows-swap-90-24"
      :disabled="!areTokensSelected"
      @click="handleSwitchTokens"
    />
    <s-float-input
      class="s-input--token-value"
      size="medium"
      :value="toValue"
      :decimals="(tokenTo || {}).decimals"
      has-locale-string
      :delimiters="delimiters"
      :max="getMax((tokenTo || {}).address)"
      @input="handleInputFieldTo"
      @focus="handleFocusField(true)"
    >
      <div slot="top" class="input-line">
        <div class="input-title">
          <span class="input-title--uppercase input-title--primary">{{ t('transfers.to') }}</span>
          <span
            v-if="areTokensSelected && !isZeroFromAmount && !isExchangeB"
            class="input-title--uppercase input-title--primary"
          >
            ({{ t('swap.estimated') }})
          </span>
        </div>
        <div v-if="isLoggedIn && tokenTo && tokenTo.balance" class="input-value">
          <span class="input-value--uppercase">{{ t('exchange.balance') }}</span>
          <formatted-amount-with-fiat-value
            value-can-be-hidden
            with-left-shift
            value-class="input-value--primary"
            :value="formatBalance(tokenTo)"
            :fiat-value="getFiatBalance(tokenTo)"
          />
        </div>
      </div>
      <div slot="right" class="s-flex el-buttons">
        <token-select-button
          class="el-button--select-token"
          icon="chevron-down-rounded-16"
          :token="tokenTo"
          @click="openSelectTokenDialog(false)"
        />
      </div>
      <div slot="bottom" class="input-line input-line--footer">
        <div v-if="tokenTo && tokenToPrice" class="price-difference">
          <formatted-amount is-fiat-value :value="toFiatAmount" />
          <value-status-wrapper :value="fiatDifference" class="price-difference__value">
            (<formatted-amount :value="fiatDifferenceFormatted">%</formatted-amount>)
          </value-status-wrapper>
        </div>
        <token-address
          v-if="tokenTo"
          :name="tokenTo.name"
          :symbol="tokenTo.symbol"
          :address="tokenTo.address"
          class="input-value"
        />
      </div>
    </s-float-input>
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
      type="primary"
      :disabled="isConfirmSwapDisabled"
      :loading="isSelectAssetLoading"
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
        {{ t('exchange.insufficientBalance', { tokenSymbol: tokenFrom.symbol }) }}
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
      @select="selectToken"
    />
    <confirm-swap
      :visible.sync="showConfirmSwapDialog"
      :isInsufficientBalance="isInsufficientBalance"
      @confirm="confirmSwap"
    />
    <settings-dialog :visible.sync="showSettings" />
  </s-form>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { Action, Getter, State } from 'vuex-class';
import { api, components, mixins } from '@soramitsu/soraneo-wallet-web';
import { FPNumber, Operation } from '@sora-substrate/util';
import { KnownSymbols, XOR } from '@sora-substrate/util/build/assets/consts';
import type { Subscription } from '@polkadot/x-rxjs';
import type { CodecString, NetworkFeesObject } from '@sora-substrate/util';
import type { AccountAsset, Asset } from '@sora-substrate/util/build/assets/types';
import type { LiquiditySourceTypes } from '@sora-substrate/util/build/swap/consts';
import type { QuotePaths, QuotePayload, PrimaryMarketsEnabledAssets } from '@sora-substrate/util/build/swap/types';
import type { LPRewardsInfo } from '@sora-substrate/util/build/rewards/types';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import TokenSelectMixin from '@/components/mixins/TokenSelectMixin';

import {
  isMaxButtonAvailable,
  getMaxValue,
  hasInsufficientBalance,
  hasInsufficientXorForFee,
  asZeroValue,
  formatAssetBalance,
  debouncedInputHandler,
} from '@/utils';
import router, { lazyComponent } from '@/router';
import { Components, PageNames } from '@/consts';

const namespace = 'swap';

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    SettingsDialog: lazyComponent(Components.SettingsDialog),
    SlippageTolerance: lazyComponent(Components.SlippageTolerance),
    TokenLogo: lazyComponent(Components.TokenLogo),
    SelectToken: lazyComponent(Components.SelectToken),
    ConfirmSwap: lazyComponent(Components.ConfirmSwap),
    StatusActionBadge: lazyComponent(Components.StatusActionBadge),
    TokenSelectButton: lazyComponent(Components.TokenSelectButton),
    TokenAddress: lazyComponent(Components.TokenAddress),
    ValueStatusWrapper: lazyComponent(Components.ValueStatusWrapper),
    SwapTransactionDetails: lazyComponent(Components.SwapTransactionDetails),
    FormattedAmount: components.FormattedAmount,
    FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue,
  },
})
export default class Swap extends Mixins(
  mixins.FormattedAmountMixin,
  TranslationMixin,
  mixins.LoadingMixin,
  TokenSelectMixin
) {
  @State((state) => state[namespace].paths) paths!: QuotePaths;
  @State((state) => state[namespace].liquidityProviderFee) liquidityProviderFee!: CodecString;
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
  @Getter('isAvailable', { namespace }) isAvailable!: boolean;
  @Getter('swapLiquiditySource', { namespace }) liquiditySource!: LiquiditySourceTypes;
  @Getter('marketAlgorithmsAvailable', { namespace }) marketAlgorithmsAvailable!: boolean;
  @Getter('swapMarketAlgorithm', { namespace }) swapMarketAlgorithm!: string;

  @Action('setTokenFromAddress', { namespace }) setTokenFromAddress!: (address?: string) => Promise<void>;
  @Action('setTokenToAddress', { namespace }) setTokenToAddress!: (address?: string) => Promise<void>;
  @Action('setFromValue', { namespace }) setFromValue!: (value: string) => Promise<void>;
  @Action('setToValue', { namespace }) setToValue!: (value: string) => Promise<void>;
  @Action('setAmountWithoutImpact', { namespace }) setAmountWithoutImpact!: (amount: CodecString) => Promise<void>;
  @Action('setExchangeB', { namespace }) setExchangeB!: (isExchangeB: boolean) => Promise<void>;
  @Action('setLiquidityProviderFee', { namespace }) setLiquidityProviderFee!: (value: CodecString) => Promise<void>;
  @Action('reset', { namespace }) reset!: AsyncVoidFn;

  @Action('setPrimaryMarketsEnabledAssets', { namespace }) setPrimaryMarketsEnabledAssets!: (
    assets: PrimaryMarketsEnabledAssets
  ) => Promise<void>;

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
  isTokenFromSelected = false;
  showSettings = false;
  showSelectTokenDialog = false;
  showConfirmSwapDialog = false;
  liquidityReservesSubscription: Nullable<Subscription> = null;
  enabledAssetsSubscription: Nullable<Subscription> = null;
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
    return (
      this.isLoggedIn &&
      isMaxButtonAvailable(
        this.areTokensSelected,
        this.tokenFrom,
        this.fromValue,
        this.networkFee,
        this.tokenXOR,
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

      if (!this.enabledAssetsSubscription) {
        this.subscribeOnEnabledAssets();
      }
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
      // TODO: [ARCH] Asset -> AccountAsset
      const { amount, fee, rewards, amountWithoutImpact } = api.swap.getResult(
        this.tokenFrom as Asset,
        this.tokenTo as Asset,
        value,
        this.isExchangeB,
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
    this.enabledAssetsSubscription = api.swap
      .subscribeOnPrimaryMarketsEnabledAssets()
      .subscribe(this.setPrimaryMarketsEnabledAssets);
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
      .subscribeOnReserves(this.tokenFrom.address, this.tokenTo.address, this.liquiditySource)
      .subscribe(this.onChangeSwapReserves);
  }

  private async onChangeSwapReserves(payload: QuotePayload): Promise<void> {
    await this.setSubscriptionPayload(payload);

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
    const [fromAddress, toAddress] = [this.tokenFrom.address, this.tokenTo.address];

    await this.setTokenFromAddress(toAddress);
    await this.setTokenToAddress(fromAddress);

    if (this.isExchangeB) {
      this.setExchangeB(false);
      this.handleInputFieldFrom(this.toValue);
    } else {
      this.setExchangeB(true);
      this.handleInputFieldTo(this.fromValue);
    }

    this.subscribeOnSwapReserves();
  }

  handleMaxValue(): void {
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

  async selectToken(token: AccountAsset): Promise<void> {
    if (token) {
      this.setSelectAssetLoading(true);
      if (this.isTokenFromSelected) {
        await this.setTokenFromAddress(token.address);
      } else {
        await this.setTokenToAddress(token.address);
      }

      this.subscribeOnSwapReserves();
      this.setSelectAssetLoading(false);
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

  openSettingsDialog(): void {
    this.showSettings = true;
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
