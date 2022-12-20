<template>
  <s-form v-loading="parentLoading" class="container el-form--actions" :show-message="false">
    <generic-page-header class="page-header--swap" :title="t(`adar.send.${isSend ? PageNames.Send : PageNames.Swap}`)">
      <status-action-badge v-if="!assetsAreEqual">
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
    <!-- <s-float-input
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
    </s-float-input> -->
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
      type="action"
      icon="arrows-swap-90-24"
      :disabled="!areTokensSelected || assetsAreEqual"
      @click="handleSwitchTokens"
    />
    <!-- <s-float-input
      class="s-input--token-value"
      size="medium"
      :value="valueToDisplayed"
      :disabled="assetsAreEqual"
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
            v-if="areTokensSelected && !isZeroFromAmount && !isExchangeB && !assetsAreEqual"
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
        <div v-if="tokenTo && tokenToPrice && !assetsAreEqual" class="price-difference">
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
    </s-float-input> -->
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
    <!-- SEND -->
    <s-input
      v-if="isSend"
      class="address-input"
      :maxlength="128"
      :placeholder="t('walletSend.address')"
      border-radius="mini"
      v-model="address"
    />
    <slippage-tolerance v-if="!isSend || !assetsAreEqual" class="slippage-tolerance-settings" />
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
      @click="handleConfirm"
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
      <template v-else-if="isSend && emptyAddress">
        {{ t('walletSend.enterAddress') }}
      </template>
      <template v-else-if="isSend && !validAddress">
        {{ t('walletSend.badAddress') }}
      </template>
      <template v-else-if="isSwapAndSend">
        {{ t('adar.send.exchangeAndSend') }}
      </template>
      <template v-else-if="assetsAreEqual">
        {{ t('walletSend.title') }}
      </template>
      <template v-else>
        {{ t('adar.send.exchange') }}
      </template>
    </s-button>
    <swap-transaction-details
      v-if="areTokensSelected && !hasZeroAmount && validAddress"
      class="info-line-container"
      :info-only="false"
      :operation="operation"
    />
    <select-token
      :visible.sync="showSelectTokenDialog"
      :connected="isLoggedIn"
      :asset="excludedAsset"
      @select="selectToken"
    />
    <swap-confirm
      :visible.sync="showConfirmSwapDialog"
      :isInsufficientBalance="isInsufficientBalance"
      :value-to="valueToDisplayed"
      :from="account.address"
      :to="address"
      :is-swap-and-send="isSwapAndSend"
      @confirm="confirmSwap"
    />
    <!-- <swap-confirm
      :visible.sync="showConfirmSwapDialog"
      :isInsufficientBalance="isInsufficientBalance"
      @confirm="confirmSwap"
    /> -->
    <confirm-send
      :visible.sync="showConfirmSendDialog"
      :isInsufficientBalance="isInsufficientBalance"
      :from="account.address"
      :to="address"
      @confirm="confirmSend"
    />
    <settings-dialog :visible.sync="showSettings" />
  </s-form>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { api, components, mixins, WALLET_TYPES } from '@soramitsu/soraneo-wallet-web';
import { FPNumber, Operation } from '@sora-substrate/util';
import { KnownSymbols, XOR } from '@sora-substrate/util/build/assets/consts';
import type { Subscription } from 'rxjs';
import type { CodecString, NetworkFeesObject } from '@sora-substrate/util';
import type { AccountAsset, Asset } from '@sora-substrate/util/build/assets/types';
import type { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import type {
  QuotePaths,
  QuotePayload,
  PrimaryMarketsEnabledAssets,
  LPRewardsInfo,
  SwapResult,
} from '@sora-substrate/liquidity-proxy/build/types';
import { getter, state, mutation, action } from '@/store/decorators';

import TranslationMixin from '@/components/mixins/TranslationMixin';

import {
  isMaxButtonAvailable,
  getMaxValue,
  hasInsufficientBalance,
  hasInsufficientXorForFee,
  asZeroValue,
  getAssetBalance,
  debouncedInputHandler,
  formatAssetBalance,
} from '@/utils';
import router, { lazyComponent } from '@/router';
import { Components, PageNames, MarketAlgorithms } from '@/consts';
import { DexQuoteData } from '@/store/swap/types';
import { DexId } from '@sora-substrate/util/build/dex/consts';

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    SettingsDialog: lazyComponent(Components.SettingsDialog),
    SlippageTolerance: lazyComponent(Components.SlippageTolerance),
    TokenLogo: components.TokenLogo,
    SelectToken: lazyComponent(Components.SelectToken),
    SwapConfirm: lazyComponent(Components.SwapConfirm),
    ConfirmSend: lazyComponent(Components.ConfirmSend),
    StatusActionBadge: lazyComponent(Components.StatusActionBadge),
    TokenSelectButton: lazyComponent(Components.TokenSelectButton),
    TokenAddress: components.TokenAddress,
    ValueStatusWrapper: lazyComponent(Components.ValueStatusWrapper),
    SwapTransactionDetails: lazyComponent(Components.SwapTransactionDetails),
    FormattedAmount: components.FormattedAmount,
    FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue,
  },
})
export default class Send extends Mixins(mixins.FormattedAmountMixin, TranslationMixin, mixins.LoadingMixin) {
  // SEND _____________________________________________________
  readonly PageNames = PageNames;
  address = '';
  showConfirmSendDialog = false;

  @getter.wallet.account.account account!: WALLET_TYPES.PolkadotJsAccount;
  @getter.swap.minMaxReceived private minMaxReceived!: CodecString;

  @Watch('isSend')
  private updateView(value: boolean): void {
    this.cleanSwapReservesSubscription();
    this.resetAddress();
    this.reset();
    if (!this.tokenFrom) {
      this.setTokenFromAddress(XOR.address);
    }
    if (this.assetsAreEqual && !value) {
      this.setTokenToAddress();
    }
    this.subscribeOnEnabledAssets();
  }

  get emptyAddress(): boolean {
    return !this.address.trim();
  }

  get validAddress(): boolean {
    if (!this.isSend) return true;

    return !this.emptyAddress && api.validateAddress(this.address) && this.account.address !== this.address;
  }

  get isSend(): boolean {
    return this.$route.name === PageNames.Send;
  }

  get isSwapAndSend(): boolean {
    return this.isSend && this.areTokensSelected && !this.assetsAreEqual && !this.emptyAddress;
  }

  get assetsAreEqual(): boolean {
    return this.areTokensSelected && this.tokenFrom?.address === this.tokenTo?.address;
  }

  get valueToDisplayed(): string {
    if (this.isSend && !this.assetsAreEqual && !this.isExchangeB && this.tokenTo && this.toValue) {
      return this.getStringFromCodec(this.minMaxReceived, this.tokenTo.decimals);
    }

    if (this.assetsAreEqual) {
      return this.fromValue;
    }

    return this.toValue;
  }

  get excludedAsset(): Nullable<AccountAsset> | undefined {
    if (!this.isSend) {
      return this.isTokenFromSelected ? this.tokenTo : this.tokenFrom;
    }

    return undefined;
  }

  get operation(): Operation {
    if (!this.isSend) {
      return Operation.Swap;
    }
    return this.assetsAreEqual ? Operation.Transfer : Operation.SwapAndSend;
  }

  resetAddress(): void {
    this.address = '';
  }

  confirmSend(isSendConfirmed: boolean): void {
    if (isSendConfirmed) {
      this.resetFieldFrom();
      this.resetAddress();
    }
  }

  handleConfirm(): void {
    if (!this.isSend || this.isSwapAndSend) {
      this.showConfirmSwapDialog = true;
    } else {
      this.showConfirmSendDialog = true;
    }
  }
  // __________________________________________________________

  // @state.swap.paths private paths!: QuotePaths;
  // @state.swap.payload private payload!: QuotePayload;
  @state.swap.dexQuoteData private dexQuoteData!: Record<DexId, DexQuoteData>;
  @state.swap.isExchangeB isExchangeB!: boolean;
  @state.swap.fromValue fromValue!: string;
  @state.swap.toValue toValue!: string;

  @mutation.swap.setPrimaryMarketsEnabledAssets private setEnabledAssets!: (args: PrimaryMarketsEnabledAssets) => void;
  @mutation.swap.setFromValue private setFromValue!: (value: string) => void;
  @mutation.swap.setToValue private setToValue!: (value: string) => void;
  @mutation.swap.setAmountWithoutImpact private setAmountWithoutImpact!: (amount: CodecString) => void;
  @mutation.swap.setExchangeB private setExchangeB!: (isExchangeB: boolean) => void;
  @mutation.swap.setLiquidityProviderFee private setLiquidityProviderFee!: (value: CodecString) => void;
  @mutation.swap.setRewards private setRewards!: (rewards: Array<LPRewardsInfo>) => void;

  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @getter.settings.nodeIsConnected nodeIsConnected!: boolean;
  @getter.assets.xor private tokenXOR!: AccountAsset;
  @getter.swap.swapLiquiditySource private liquiditySource!: Nullable<LiquiditySourceTypes>;
  @getter.swap.tokenFrom tokenFrom!: Nullable<AccountAsset>;
  @getter.swap.tokenTo tokenTo!: Nullable<AccountAsset>;
  @getter.swap.isAvailable isAvailable!: boolean;
  @getter.swap.marketAlgorithmsAvailable marketAlgorithmsAvailable!: boolean;
  @getter.swap.swapMarketAlgorithm swapMarketAlgorithm!: MarketAlgorithms;

  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;

  @action.swap.setTokenFromAddress private setTokenFromAddress!: (address?: string) => Promise<void>;
  @action.swap.setTokenToAddress private setTokenToAddress!: (address?: string) => Promise<void>;
  @action.swap.reset private reset!: AsyncFnWithoutArgs;
  // @action.swap.setSubscriptionPayload private setSubscriptionPayload!: (payload: QuotePayload) => Promise<void>;
  @action.swap.setSubscriptionPayload private setSubscriptionPayload!: (data: {
    dexId: number;
    payload: QuotePayload;
  }) => void;

  @action.swap.resetSubscriptions private resetSubscriptions!: AsyncFnWithoutArgs;
  @action.swap.updateSubscriptions private updateSubscriptions!: AsyncFnWithoutArgs;
  @mutation.swap.selectDexId private selectDexId!: (dexId: DexId) => void;
  @state.swap.enabledAssets private enabledAssets!: PrimaryMarketsEnabledAssets;
  @action.swap.updateSubscriptions private updateBalanceSubscriptions!: AsyncFnWithoutArgs;

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
    if (!this.tokenFrom) return '0';
    return this.fromValue ? this.getFiatAmountByString(this.fromValue, this.tokenFrom) || '0' : '0';
  }

  get toFiatAmount(): string {
    if (!this.tokenTo) return '0';
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
    if (!(this.tokenFrom && this.tokenTo)) return false;
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
      !this.assetsAreEqual && this.isAvailable && this.preparedForSwap && !this.areZeroAmounts && this.hasZeroAmount
    );
  }

  get isInsufficientBalance(): boolean {
    if (!this.tokenFrom) return false;
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
    const fpAmount = this.getFPNumber(this.valueToDisplayed, this.tokenXOR.decimals).sub(
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
    return this.networkFees[this.operation];
  }

  get isConfirmSwapDisabled(): boolean {
    return (
      !this.areTokensSelected ||
      !this.isAvailable ||
      !this.validAddress ||
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
      }
      if (this.assetsAreEqual && !this.isSend) {
        await this.setTokenToAddress();
      }

      // if (!this.enabledAssetsSubscription) {
      //   this.subscribeOnEnabledAssets();
      // }
      this.enableSwapSubscriptions();
    });
  }

  private enableSwapSubscriptions(): void {
    this.updateBalanceSubscriptions();
    this.subscribeOnEnabledAssets();
  }

  getTokenBalance(token: AccountAsset): CodecString {
    return getAssetBalance(token);
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

  // private runRecountSwapValues(): void {
  //   const value = this.isExchangeB ? this.toValue : this.fromValue;
  //   if (!this.areTokensSelected || asZeroValue(value) || this.assetsAreEqual) return;

  //   const setOppositeValue = this.isExchangeB ? this.setFromValue : this.setToValue;
  //   const resetOppositeValue = this.isExchangeB ? this.resetFieldFrom : this.resetFieldTo;
  //   const oppositeToken = (this.isExchangeB ? this.tokenFrom : this.tokenTo) as AccountAsset;

  //   try {
  //     // TODO: [ARCH] Asset -> AccountAsset
  //     const { amount, fee, rewards, amountWithoutImpact } = api.swap.getResult(
  //       this.tokenFrom as Asset,
  //       this.tokenTo as Asset,
  //       value,
  //       this.isExchangeB,
  //       [this.liquiditySource].filter(Boolean) as Array<LiquiditySourceTypes>,
  //       this.paths,
  //       this.payload
  //     );

  //     setOppositeValue(this.getStringFromCodec(amount, oppositeToken.decimals));
  //     this.setAmountWithoutImpact(amountWithoutImpact);
  //     this.setLiquidityProviderFee(fee);
  //     this.setRewards(rewards);
  //   } catch (error: any) {
  //     console.error(error);
  //     resetOppositeValue();
  //   }
  // }
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

      const { amount, amountWithoutImpact, fee, rewards } = results[bestDexId];

      setOppositeValue(this.getStringFromCodec(amount, oppositeToken.decimals));
      this.setAmountWithoutImpact(amountWithoutImpact as string);
      this.setLiquidityProviderFee(fee);
      this.setRewards(rewards);
      this.selectDexId(bestDexId);
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

  // private subscribeOnEnabledAssets(): void {
  //   this.cleanEnabledAssetsSubscription();
  //   this.enabledAssetsSubscription = api.swap.subscribeOnPrimaryMarketsEnabledAssets().subscribe(this.setEnabledAssets);
  // }

  private subscribeOnEnabledAssets(): void {
    this.cleanEnabledAssetsSubscription();
    this.enabledAssetsSubscription = api.swap.subscribeOnPrimaryMarketsEnabledAssets().subscribe((enabledAssets) => {
      this.setEnabledAssets(enabledAssets);
      this.subscribeOnSwapReserves();
    });
  }

  private cleanSwapReservesSubscription(): void {
    if (!this.liquidityReservesSubscription) {
      return;
    }
    this.liquidityReservesSubscription.unsubscribe();
    this.liquidityReservesSubscription = null;
  }

  // private subscribeOnSwapReserves(): void {
  //   this.cleanSwapReservesSubscription();
  //   if (!this.areTokensSelected || this.assetsAreEqual) return;
  //   this.liquidityReservesSubscription = api.swap
  //     .subscribeOnReserves(
  //       (this.tokenFrom as AccountAsset).address,
  //       (this.tokenTo as AccountAsset).address,
  //       this.liquiditySource as LiquiditySourceTypes
  //     )
  //     .subscribe(this.onChangeSwapReserves);
  // }

  private subscribeOnSwapReserves(): void {
    this.cleanSwapReservesSubscription();

    if (!this.areTokensSelected) return;

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
      });
  }

  // private async onChangeSwapReserves(payload: QuotePayload): Promise<void> {
  //   await this.setSubscriptionPayload(payload);

  //   this.runRecountSwapValues();
  // }

  handleFocusField(isExchangeB = false): void {
    const isZeroValue = isExchangeB ? this.isZeroToAmount : this.isZeroFromAmount;
    const prevFocus = this.isExchangeB;

    // SEND
    if (isExchangeB) {
      this.setToValue(this.valueToDisplayed);
    }

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
    if (!(this.tokenFrom && this.tokenTo)) return;
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

  async selectToken(token: AccountAsset): Promise<void> {
    if (token) {
      if (this.isTokenFromSelected) {
        await this.setTokenFromAddress(token.address);
      } else {
        await this.setTokenToAddress(token.address);
      }
      this.subscribeOnSwapReserves();
    }
  }

  async confirmSwap(isSwapConfirmed: boolean): Promise<void> {
    if (isSwapConfirmed) {
      this.resetFieldFrom();
      this.resetFieldTo();
      this.resetAddress(); // SEND
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

.el-button--switch-tokens {
  border-radius: 100%;
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

.address-input {
  margin: $inner-spacing-medium 0;
}
</style>
