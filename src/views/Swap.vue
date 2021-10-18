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
            :disabled="!pairLiquiditySourcesAvailable"
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
          <span class="input-value--primary">{{ formatBalance(tokenFrom) }}</span>
          <formatted-amount v-if="tokenFromPrice" :value="getFiatBalance(tokenFrom)" is-fiat-value />
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
        <formatted-amount v-if="tokenFrom && tokenFromPrice" :value="fromFiatAmount" is-fiat-value />
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
      :class="{ loading: isRecountingProcess }"
      type="action"
      icon="arrows-swap-90-24"
      :disabled="!areTokensSelected || isRecountingProcess"
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
          <span class="input-value--primary">{{ formatBalance(tokenTo) }}</span>
          <formatted-amount v-if="tokenToPrice" :value="getFiatBalance(tokenTo)" is-fiat-value />
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
          <formatted-amount :value="toFiatAmount" is-fiat-value />
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
    <swap-info v-if="areTokensSelected && !hasZeroAmount" class="info-line-container" />
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
      :loading="isRecountingProcess || isAvailableChecking"
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
      <template v-else-if="isAvailable && isInsufficientLiquidity">
        {{ t('swap.insufficientLiquidity') }}
      </template>
      <template v-else-if="isInsufficientAmount">
        {{ t('swap.insufficientAmount', { tokenSymbol: insufficientAmountTokenSymbol }) }}
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
import {
  KnownAssets,
  KnownSymbols,
  CodecString,
  AccountAsset,
  LiquiditySourceTypes,
  LPRewardsInfo,
  FPNumber,
  Operation,
  NetworkFeesObject,
} from '@sora-substrate/util';
import type { Subscription } from '@polkadot/x-rxjs';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import LoadingMixin from '@/components/mixins/LoadingMixin';

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

import { quote } from '@/services/liquidityProxy';

const namespace = 'swap';

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    SettingsDialog: lazyComponent(Components.SettingsDialog),
    SlippageTolerance: lazyComponent(Components.SlippageTolerance),
    SwapInfo: lazyComponent(Components.SwapInfo),
    TokenLogo: lazyComponent(Components.TokenLogo),
    SelectToken: lazyComponent(Components.SelectToken),
    ConfirmSwap: lazyComponent(Components.ConfirmSwap),
    StatusActionBadge: lazyComponent(Components.StatusActionBadge),
    TokenSelectButton: lazyComponent(Components.TokenSelectButton),
    TokenAddress: lazyComponent(Components.TokenAddress),
    ValueStatusWrapper: lazyComponent(Components.ValueStatusWrapper),
    FormattedAmount: components.FormattedAmount as any,
  },
})
export default class Swap extends Mixins(mixins.FormattedAmountMixin, TranslationMixin, LoadingMixin) {
  @State((state) => state[namespace].pairLiquiditySources) pairLiquiditySources!: Array<LiquiditySourceTypes>;

  @Getter networkFees!: NetworkFeesObject;
  @Getter nodeIsConnected!: boolean;
  @Getter isLoggedIn!: boolean;
  @Getter slippageTolerance!: string;
  @Getter('tokenXOR', { namespace: 'assets' }) tokenXOR!: AccountAsset;
  @Getter('tokenFrom', { namespace }) tokenFrom!: AccountAsset;
  @Getter('tokenTo', { namespace }) tokenTo!: AccountAsset;
  @Getter('fromValue', { namespace }) fromValue!: string;
  @Getter('toValue', { namespace }) toValue!: string;
  @Getter('isExchangeB', { namespace }) isExchangeB!: boolean;
  @Getter('liquidityProviderFee', { namespace }) liquidityProviderFee!: CodecString;
  @Getter('isAvailable', { namespace }) isAvailable!: boolean;
  @Getter('isAvailableChecking', { namespace }) isAvailableChecking!: boolean;
  @Getter('swapLiquiditySource', { namespace }) liquiditySource!: LiquiditySourceTypes;
  @Getter('pairLiquiditySourcesAvailable', { namespace }) pairLiquiditySourcesAvailable!: boolean;
  @Getter('swapMarketAlgorithm', { namespace }) swapMarketAlgorithm!: string;
  @Getter('payload', { namespace }) payload!: any; // TODO: type

  @Action('setTokenFromAddress', { namespace }) setTokenFromAddress!: (address?: string) => Promise<void>;
  @Action('setTokenToAddress', { namespace }) setTokenToAddress!: (address?: string) => Promise<void>;
  @Action('setFromValue', { namespace }) setFromValue!: (value: string) => Promise<void>;
  @Action('setToValue', { namespace }) setToValue!: (value: string) => Promise<void>;
  @Action('setMinMaxReceived', { namespace }) setMinMaxReceived!: (value: CodecString) => Promise<void>;
  @Action('setAmountWithoutImpact', { namespace }) setAmountWithoutImpact!: (amount: CodecString) => Promise<void>;
  @Action('setExchangeB', { namespace }) setExchangeB!: (isExchangeB: boolean) => Promise<void>;
  @Action('setLiquidityProviderFee', { namespace }) setLiquidityProviderFee!: (value: CodecString) => Promise<void>;
  @Action('checkSwap', { namespace }) checkSwap!: AsyncVoidFn;
  @Action('reset', { namespace }) reset!: AsyncVoidFn;
  @Action('getPrices', { namespace: 'prices' }) getPrices!: (options: any) => Promise<void>;
  @Action('resetPrices', { namespace: 'prices' }) resetPrices!: AsyncVoidFn;
  @Action('getAssets', { namespace: 'assets' }) getAssets!: AsyncVoidFn;
  @Action('setPairLiquiditySources', { namespace }) setPairLiquiditySources!: (
    liquiditySources: Array<LiquiditySourceTypes>
  ) => Promise<void>;

  @Action('setRewards', { namespace }) setRewards!: (rewards: Array<LPRewardsInfo>) => Promise<void>;
  @Action('setSubscriptionPayload', { namespace }) setSubscriptionPayload!: (payload) => Promise<void>; // TODO: type
  @Action('resetSubscriptions', { namespace }) resetSubscriptions!: AsyncVoidFn;
  @Action('updateSubscriptions', { namespace }) updateSubscriptions!: AsyncVoidFn;

  @Watch('slippageTolerance')
  private handleSlippageToleranceChange(): void {
    this.calcMinMaxRecieved();
  }

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
  isInsufficientAmount = false;
  insufficientAmountTokenSymbol = '';
  isTokenFromSelected = false;
  showSettings = false;
  showSelectTokenDialog = false;
  showConfirmSwapDialog = false;
  isRecountingProcess = false;
  liquidityReservesSubscription: Nullable<Subscription> = null;

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
    return new FPNumber(this.fiatDifference).toLocaleString();
  }

  get isXorOutputSwap(): boolean {
    return this.tokenTo?.address === KnownAssets.get(KnownSymbols.XOR)?.address;
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
      this.isInsufficientAmount ||
      this.isInsufficientBalance ||
      this.isInsufficientXorForFee
    );
  }

  created() {
    this.withApi(async () => {
      await this.getAssets();
      if (!this.tokenFrom) {
        const xorAddress = KnownAssets.get(KnownSymbols.XOR)?.address;
        await this.setTokenFromAddress(xorAddress);
        await this.setTokenToAddress();
      }
      if (this.areTokensSelected) {
        await this.checkSwap();
      }
      await this.updatePairLiquiditySources();
    });
  }

  formatBalance(token): string {
    return formatAssetBalance(token);
  }

  resetFieldFrom(): void {
    this.setFromValue('');
  }

  resetFieldTo(): void {
    this.setToValue('');
  }

  async updatePairLiquiditySources(): Promise<void> {
    const isPair = !!this.tokenFrom?.address && !!this.tokenTo?.address;

    const sources = isPair
      ? await api.getListEnabledSourcesForPath(this.tokenFrom?.address, this.tokenTo?.address)
      : [];

    await this.setPairLiquiditySources(sources);
  }

  async handleInputFieldFrom(value): Promise<any> {
    if (!this.areTokensSelected || asZeroValue(value)) {
      this.resetFieldTo();
    }

    if (value !== this.fromValue) {
      this.setFromValue(value);
      await this.recountSwapValues();
    }
  }

  async handleInputFieldTo(value): Promise<any> {
    if (!this.areTokensSelected || asZeroValue(value)) {
      this.resetFieldFrom();
    }

    if (value !== this.toValue) {
      this.setToValue(value);
      await this.recountSwapValues();
    }
  }

  private async runRecountSwapValues(): Promise<void> {
    if (this.isRecountingProcess) return;

    const value = this.isExchangeB ? this.toValue : this.fromValue;
    if (!this.areTokensSelected || asZeroValue(value)) return;

    const setOppositeValue = this.isExchangeB ? this.setFromValue : this.setToValue;
    const resetOppositeValue = this.isExchangeB ? this.resetFieldFrom : this.resetFieldTo;
    const oppositeToken = this.isExchangeB ? this.tokenFrom : this.tokenTo;

    try {
      this.isRecountingProcess = true;
      this.isInsufficientAmount = false;

      const { amount, fee, rewards, amountWithoutImpact } = await api.getSwapResult(
        this.tokenFrom.address,
        this.tokenTo.address,
        value,
        this.isExchangeB,
        this.liquiditySource
      );

      const result = quote(
        this.tokenFrom.address,
        this.tokenTo.address,
        value,
        !this.isExchangeB,
        [this.liquiditySource].filter(Boolean),
        this.pairLiquiditySources,
        this.payload
      );

      console.log(
        'amount:',
        amount,
        result.amount.toCodecString(),
        FPNumber.fromCodecValue(amount).div(result.amount).toString()
      );
      console.log('fee:', fee, result.fee.toCodecString(), FPNumber.fromCodecValue(fee).div(result.fee).toString());
      console.log(
        'amountWithoutImpact:',
        amountWithoutImpact,
        result.amountWithoutImpact.toCodecString(),
        FPNumber.fromCodecValue(amountWithoutImpact).div(result.amountWithoutImpact).toString()
      );

      setOppositeValue(this.getStringFromCodec(amount, oppositeToken.decimals));
      this.setAmountWithoutImpact(amountWithoutImpact);
      this.setLiquidityProviderFee(fee);
      this.setRewards(rewards);

      await Promise.all([this.calcMinMaxRecieved(), this.updatePrices()]);
    } catch (error) {
      resetOppositeValue();
      if (!this.isInsufficientAmountError(oppositeToken.symbol as string, error.message)) {
        throw error;
      }
    } finally {
      this.isRecountingProcess = false;
    }
  }

  recountSwapValues = debouncedInputHandler(this.runRecountSwapValues);

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

  private async onChangeSwapReserves(payload) {
    await this.setSubscriptionPayload(payload);

    if (!this.isAvailable) {
      this.checkSwap();
      this.updatePairLiquiditySources();
    }
    this.runRecountSwapValues();
  }

  private async calcMinMaxRecieved(): Promise<void> {
    const amount = this.isExchangeB ? this.fromValue : this.toValue;
    const minMaxReceived = await api.getMinMaxValue(
      this.tokenFrom?.address,
      this.tokenTo?.address,
      amount,
      this.slippageTolerance,
      this.isExchangeB
    );

    this.setMinMaxReceived(minMaxReceived);
  }

  private async updatePrices(): Promise<void> {
    if (this.areTokensSelected) {
      await this.getPrices({
        assetAAddress: this.tokenFrom.address,
        assetBAddress: this.tokenTo.address,
        amountA: this.fromValue,
        amountB: this.toValue,
      });
    }
  }

  isInsufficientAmountError(tokenSymbol: string, errorMessage): boolean {
    // TODO: If an input field has too many symbols this is a way to avoid an error, find another approach later
    if (errorMessage.indexOf('invalid string input for fixed point number') !== -1) {
      this.isInsufficientAmount = true;
      this.insufficientAmountTokenSymbol = tokenSymbol;
      this.resetPrices();
    }
    return this.isInsufficientAmount;
  }

  async handleFocusField(isExchangeB = false): Promise<void> {
    const isZeroValue = isExchangeB ? this.isZeroToAmount : this.isZeroFromAmount;
    const prevFocus = this.isExchangeB;

    this.setExchangeB(isExchangeB);

    if (isZeroValue) {
      this.resetFieldFrom();
      this.resetFieldTo();
    }

    if (prevFocus !== this.isExchangeB) {
      await this.recountSwapValues();
    }
  }

  async handleSwitchTokens(): Promise<void> {
    const [fromAddress, toAddress] = [this.tokenFrom.address, this.tokenTo.address];

    await this.setTokenFromAddress(toAddress);
    await this.setTokenToAddress(fromAddress);

    await this.updatePairLiquiditySources();

    if (this.isExchangeB) {
      this.setExchangeB(false);
      this.handleInputFieldFrom(this.toValue);
    } else {
      this.setExchangeB(true);
      this.handleInputFieldTo(this.fromValue);
    }

    this.subscribeOnSwapReserves();
  }

  async handleMaxValue(): Promise<void> {
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

  async selectToken(token: any): Promise<void> {
    if (token) {
      if (this.isTokenFromSelected) {
        await this.setTokenFromAddress(token.address);
      } else {
        await this.setTokenToAddress(token.address);
      }
      await Promise.all([this.checkSwap(), this.updatePairLiquiditySources()]);
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
      this.resetPrices();
      await this.setExchangeB(false);
    }
  }

  openSettingsDialog(): void {
    this.showSettings = true;
  }

  destroyed(): void {
    this.reset();
    this.cleanSwapReservesSubscription();
  }
}
</script>

<style lang="scss" scoped>
.el-form--actions {
  @include generic-input-lines;
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
