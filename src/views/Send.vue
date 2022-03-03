<template>
  <s-form v-loading="parentLoading" class="container el-form--actions" :show-message="false">
    <generic-page-header class="page-header--swap" :title="t(`send.${isSend ? PageNames.Send : PageNames.Exchange}`)">
      <status-action-badge v-if="!isSend || isSwapAndSend">
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
          <span class="input-title--uppercase input-title--primary input-title--label">{{ t('transfers.from') }}</span>
          <span
            class="input-title--uppercase input-title--primary"
            v-if="areTokensSelected && !isZeroToAmount && isExchangeB"
          >({{ t('swap.estimated') }})</span>
        </div>
        <div v-if="isLoggedIn && tokenFrom && tokenFrom.balance" class="input-title">
          <span class="input-title--uppercase input-title--desc">{{ t('send.balance') }}</span>
          <span class="input-title--uppercase input-title--primary input-title--value">{{
            formatBalance(tokenFrom)
          }}</span>
        </div>
      </div>
      <div slot="right" class="s-flex el-buttons">
        <s-button
          v-if="tokenFrom && isMaxSwapAvailable"
          class="el-button--max s-typography-button--extra-small"
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
        <token-address
          v-if="tokenFrom"
          :name="tokenFrom.name"
          :symbol="tokenFrom.symbol"
          :address="tokenFrom.address"
          class="input-title"
        />
      </div>
    </s-float-input>

    <s-button
      class="el-button--switch-tokens"
      type="action"
      icon="arrows-swap-90-24"
      :disabled="!areTokensSelected || assetsAreEqual || isRecountingProcess"
      @click="handleSwitchTokens"
    />

    <s-float-input
      class="s-input--token-value"
      has-locale-string
      size="medium"
      :value="valueToDisplayed"
      :decimals="(tokenTo || {}).decimals"
      :disabled="assetsAreEqual"
      :delimiters="delimiters"
      :max="getMax((tokenTo || {}).address)"
      @input="handleInputFieldTo"
      @focus="handleFocusField(true)"
    >
      <div slot="top" class="input-line">
        <div class="input-title">
          <span class="input-title--uppercase input-title--primary input-title--label">{{ t('transfers.to') }}</span>
          <span
            class="input-title--uppercase input-title--primary"
            v-if="areTokensSelected && !isZeroFromAmount && !isExchangeB"
          >({{ t('swap.estimated') }})</span>
        </div>
        <div v-if="isLoggedIn && tokenTo && tokenTo.balance" class="input-title">
          <span class="input-title--uppercase input-title--desc">{{ t('send.balance') }}</span>
          <span class="input-title--uppercase input-title--primary input-title--value">{{
            formatBalance(tokenTo)
          }}</span>
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
        <token-address
          v-if="tokenTo"
          :name="tokenTo.name"
          :symbol="tokenTo.symbol"
          :address="tokenTo.address"
          class="input-title"
        />
      </div>
    </s-float-input>

    <s-input
      v-if="isSend"
      class="address-input"
      :maxlength="128"
      :placeholder="t('walletSend.address')"
      border-radius="mini"
      v-model="address"
    />

    <template v-if="!isSend || isSwapAndSend">
      <slippage-tolerance class="slippage-tolerance-settings" />
      <swap-info v-if="areTokensSelected && !hasZeroAmount" class="info-line-container" />
    </template>
    <template v-else>
      <info-line
        v-if="isLoggedIn"
        :label="t('swap.networkFee')"
        :tooltip-content="t('swap.networkFeeTooltip')"
        :value="formattedNetworkFee"
        :asset-symbol="KnownSymbols.XOR"
      />
    </template>
    <s-button
      v-if="!isLoggedIn"
      type="primary"
      class="action-button s-typography-button--large"
      @click="handleConnectWallet"
    >
      {{ t('swap.connectWallet') }}
    </s-button>
    <s-button
      v-else-if="isSend"
      type="primary"
      class="action-button s-typography-button--large"
      :disabled="sendButtonDisabled"
      @click="handleConfirm"
    >
      {{ sendButtonText }}
    </s-button>
    <s-button
      v-else
      type="primary"
      :disabled="isConfirmSwapDisabled"
      :loading="isRecountingProcess || isAvailableChecking"
      class="action-button s-typography-button--large"
      @click="handleConfirm"
    >
      <template v-if="!validAddress">
        {{ t('walletSend.badAddress') }}
      </template>
      <template v-else-if="!areTokensSelected">
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
        {{ t('send.insufficientBalance', { tokenSymbol: tokenFrom.symbol }) }}
      </template>
      <template v-else-if="isInsufficientXorForFee">
        {{ t('send.insufficientBalance', { tokenSymbol: KnownSymbols.XOR }) }}
      </template>
      <template v-else>
        {{ t('send.exchange') }}
      </template>
    </s-button>

    <select-token
      :visible.sync="showSelectTokenDialog"
      :connected="isLoggedIn"
      :asset="excludedAsset"
      @select="selectToken"
    />

    <confirm-swap
      :visible.sync="showConfirmSwapDialog"
      :isInsufficientBalance="isInsufficientBalance"
      :value-to="valueToDisplayed"
      :from="account.address"
      :to="address"
      :is-swap-and-send="isSwapAndSend"
      @confirm="confirmSwap"
    />
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
import { Action, Getter, State } from 'vuex-class';
import { api, mixins } from '@soramitsu/soraneo-wallet-web';
import { CodecString, FPNumber } from '@sora-substrate/util';
import type { Subscription } from '@polkadot/x-rxjs';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import type { AccountAsset, Asset } from '@sora-substrate/util/build/assets/types';
import type { LiquiditySourceTypes } from '@sora-substrate/util/build/swap/consts';
import type { LPRewardsInfo } from '@sora-substrate/util/build/rewards/types';
import { KnownAssets, KnownSymbols } from '@sora-substrate/util/build/assets/consts';
import type { QuotePaths, QuotePayload, PrimaryMarketsEnabledAssets } from '@sora-substrate/util/build/swap/types';

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
// import { bridgeApi } from '@/utils/bridge';

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
    ConfirmSend: lazyComponent(Components.ConfirmSend),
    StatusActionBadge: lazyComponent(Components.StatusActionBadge),
    TokenSelectButton: lazyComponent(Components.TokenSelectButton),
    TokenAddress: lazyComponent(Components.TokenAddress),
    InfoLine: lazyComponent(Components.InfoLine),
  },
})
export default class Swap extends Mixins(TranslationMixin, mixins.LoadingMixin, mixins.NumberFormatterMixin) {
  readonly PageNames = PageNames;

  @Getter account!: any;
  @Getter nodeIsConnected!: boolean;
  @Getter isLoggedIn!: boolean;
  @Getter slippageTolerance!: string;
  @Getter('tokenXOR', { namespace: 'assets' }) tokenXOR!: AccountAsset;
  @Getter('tokenFrom', { namespace }) tokenFrom!: AccountAsset;
  @Getter('tokenTo', { namespace }) tokenTo!: AccountAsset;
  @Getter('fromValue', { namespace }) fromValue!: string;
  @Getter('toValue', { namespace }) toValue!: string;
  @Getter('isExchangeB', { namespace }) isExchangeB!: boolean;
  @Getter('networkFee', { namespace }) networkFee!: CodecString;
  @Getter('liquidityProviderFee', { namespace }) liquidityProviderFee!: CodecString;
  @Getter('isAvailableSend', { namespace }) isAvailable!: boolean;
  @Getter('isAvailableChecking', { namespace }) isAvailableChecking!: boolean;
  @Getter('swapLiquiditySource', { namespace }) liquiditySource!: LiquiditySourceTypes;
  @Getter('pairLiquiditySourcesAvailable', { namespace }) pairLiquiditySourcesAvailable!: boolean;
  @Getter('swapMarketAlgorithm', { namespace }) swapMarketAlgorithm!: string;
  @Getter('minMaxReceived', { namespace }) minMaxReceived!: CodecString;

  @Action('setTokenFromAddress', { namespace }) setTokenFromAddress!: (address?: string) => Promise<void>;
  @Action('setTokenToAddress', { namespace }) setTokenToAddress!: (address?: string) => Promise<void>;
  @Action('setFromValue', { namespace }) setFromValue!: (value: string) => Promise<void>;
  @Action('setToValue', { namespace }) setToValue!: (value: string) => Promise<void>;
  @Action('setMinMaxReceived', { namespace }) setMinMaxReceived!: (value: CodecString) => Promise<void>;
  @Action('setExchangeB', { namespace }) setExchangeB!: (isExchangeB: boolean) => Promise<void>;
  @Action('setLiquidityProviderFee', { namespace }) setLiquidityProviderFee!: (value: CodecString) => Promise<void>;
  @Action('setNetworkFee', { namespace }) setNetworkFee!: (value: CodecString) => Promise<void>;
  @Action('checkSwap', { namespace }) checkSwap!: AsyncVoidFn;
  @Action('reset', { namespace }) reset!: AsyncVoidFn;
  @Action('getPrices', { namespace: 'prices' }) getPrices!: (options: any) => Promise<void>;
  @Action('resetPrices', { namespace: 'prices' }) resetPrices!: AsyncVoidFn;
  @Action('getAssets', { namespace: 'assets' }) getAssets!: AsyncVoidFn;
  @Action('setPairLiquiditySources', { namespace }) setPairLiquiditySources!: (
    liquiditySources: Array<LiquiditySourceTypes>
  ) => Promise<void>;

  @Action('setRewards', { namespace }) setRewards!: (rewards: Array<LPRewardsInfo>) => Promise<void>;
  @Action('resetSubscriptions', { namespace }) resetSubscriptions!: AsyncVoidFn;
  @Action('updateSubscriptions', { namespace }) updateSubscriptions!: AsyncVoidFn;
  @Action('setSubscriptionPayload', { namespace }) setSubscriptionPayload!: (payload: QuotePayload) => Promise<void>;
  @Action('setPrimaryMarketsEnabledAssets', { namespace }) setPrimaryMarketsEnabledAssets!: (
    assets: PrimaryMarketsEnabledAssets
  ) => Promise<void>;

  @State((state) => state[namespace].paths) paths!: QuotePaths;
  @State((state) => state[namespace].payload) payload!: QuotePayload;

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
      this.getNetworkFee();
      this.recountSwapValues();
    }
  }

  @Watch('nodeIsConnected')
  private updateConnectionSubsriptions(nodeConnected: boolean) {
    if (nodeConnected) {
      this.updateSubscriptions();
      this.subscribeOnSwapReserves();
      this.subscribeOnEnabledAssets();
    } else {
      this.resetSubscriptions();
      this.cleanSwapReservesSubscription();
      this.cleanEnabledAssetsSubscription();
    }
  }

  @Watch('isSwapAndSend')
  private updateFee() {
    this.getNetworkFee();
  }

  @Watch('isSend')
  private updateView() {
    this.resetPage();
    // this.initPage();
  }

  readonly delimiters = FPNumber.DELIMITERS_CONFIG;
  KnownSymbols = KnownSymbols;
  isInsufficientAmount = false;
  insufficientAmountTokenSymbol = '';
  isTokenFromSelected = false;
  showSettings = false;
  showSelectTokenDialog = false;
  showConfirmSwapDialog = false;
  showConfirmSendDialog = false;
  isRecountingProcess = false;
  liquidityReservesSubscription: Nullable<Subscription> = null;
  address = '';
  enabledAssetsSubscription: Nullable<Subscription> = null;

  get isSend(): boolean {
    return this.$route.name === PageNames.Send;
  }

  get assetsAreEqual(): boolean {
    return this.areTokensSelected && this.tokenFrom.address === this.tokenTo.address;
  }

  get excludedAsset(): AccountAsset | undefined {
    if (!this.isSend) {
      return this.isTokenFromSelected ? this.tokenTo : this.tokenFrom;
    }

    return undefined;
  }

  get isSwapAndSend(): boolean {
    return this.isSend && this.areTokensSelected && !this.assetsAreEqual && !this.emptyAddress;
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

  get emptyAddress(): boolean {
    return !this.address.trim();
  }

  get validAddress(): boolean {
    const check = (address: string): boolean => api.validateAddress(address) && this.account.address !== address;

    return this.isSend ? !this.emptyAddress && check(this.address) : this.emptyAddress || check(this.address);
  }

  get sendButtonDisabled(): boolean {
    return (
      (!this.assetsAreEqual && (this.isInsufficientLiquidity || !this.isAvailable)) ||
      !this.validAddress ||
      this.isZeroFromAmount ||
      this.isInsufficientXorForFee ||
      this.isInsufficientBalance ||
      this.isInsufficientAmount ||
      this.hasZeroAmount ||
      !this.areTokensSelected
    );

    // !validAddress ||
    //     !areTokensSelected ||
    //     !isAvailable ||
    //     hasZeroAmount ||
    //     isInsufficientLiquidity ||
    //     isInsufficientAmount ||
    //     isInsufficientBalance ||
    //     isInsufficientXorForFee
  }

  get sendButtonText(): string {
    if (!this.assetsAreEqual) {
      if (!this.isAvailable) {
        return this.t('swap.pairIsNotCreated');
      }
      if (this.isInsufficientLiquidity) {
        return this.t('swap.insufficientLiquidity');
      }
    }

    if (this.isZeroFromAmount) {
      return this.t('walletSend.enterAmount');
    }

    if (!this.validAddress) {
      return this.t(`walletSend.${this.emptyAddress ? 'enterAddress' : 'badAddress'}`);
    }

    if (this.isInsufficientXorForFee) {
      return this.t('exchange.insufficientBalance', { tokenSymbol: KnownSymbols.XOR });
    }

    if (this.isInsufficientBalance) {
      return this.t('exchange.insufficientBalance', { tokenSymbol: this.tokenFrom.symbol });
    }

    if (this.isSwapAndSend) {
      return this.t('send.exchangeAndSend');
    }

    return this.t('exchange.send');
  }

  get formattedNetworkFee(): string {
    return this.formatCodecNumber(this.networkFee);
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
    return !this.assetsAreEqual && (this.isZeroFromAmount || this.isZeroToAmount);
  }

  get areZeroAmounts(): boolean {
    return this.isZeroFromAmount && this.isZeroToAmount;
  }

  get isXorOutputSwap(): boolean {
    return this.tokenTo?.address === KnownAssets.get(KnownSymbols.XOR)?.address;
  }

  get isMaxSwapAvailable(): boolean {
    return (
      this.isLoggedIn &&
      isMaxButtonAvailable(
        this.isSend || this.areTokensSelected,
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
    return this.isLoggedIn && (this.isSend ? !!this.tokenFrom : this.areTokensSelected);
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
      this.preparedForSwap &&
      hasInsufficientXorForFee(this.tokenXOR, this.networkFee, this.isXorOutputSwap && !this.isSwapAndSend);

    if (isInsufficientXorForFee || !this.isXorOutputSwap) {
      return isInsufficientXorForFee;
    }
    // It's required for XOR output without XOR or with XOR balance < network fee
    const zero = this.getFPNumber(0, this.tokenXOR.decimals);
    const xorBalance = this.getFPNumberFromCodec(this.tokenXOR.balance.transferable, this.tokenXOR.decimals);
    const fpNetworkFee = this.getFPNumberFromCodec(this.networkFee, this.tokenXOR.decimals).sub(xorBalance);
    const fpAmount = this.getFPNumber(this.valueToDisplayed, this.tokenXOR.decimals).sub(
      FPNumber.gt(fpNetworkFee, zero) ? fpNetworkFee : zero
    );

    return FPNumber.lte(fpAmount, zero);
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

  // created() {
  //   this.withApi(async () => {
  //     await this.getAssets();
  //     await this.initPage();
  //     if (!this.enabledAssetsSubscription) {
  //       this.subscribeOnEnabledAssets();
  //     }
  //   });
  // }

  created() {
    this.withApi(async () => {
      // await this.getAssets();
      if (!this.tokenFrom) {
        const xorAddress = KnownAssets.get(KnownSymbols.XOR)?.address;
        await this.setTokenFromAddress(xorAddress);
        await this.setTokenToAddress();
      }

      if (!this.enabledAssetsSubscription) {
        this.subscribeOnEnabledAssets();
      }
      // await this.getNetworkFee();
      await Promise.all([this.updatePairLiquiditySources(), this.getNetworkFee()]);
      await this.checkSwap();
    });
  }

  // async initPage(): Promise<void> {
  //   if (!this.tokenFrom) {
  //     const xorAddress = KnownAssets.get(KnownSymbols.XOR)?.address;
  //     await this.setTokenFromAddress(xorAddress);

  //     if (this.isSend) {
  //       await this.setTokenToAddress(xorAddress);
  //     }
  //   }
  //   if (this.areTokensSelected && !this.isSend) {
  //     await this.checkSwap();
  //   }
  //   await Promise.all([this.updatePairLiquiditySources(), this.getNetworkFee()]);
  // }

  resetPage(): void {
    this.reset();
    this.resetAddress();
    this.cleanSwapReservesSubscription();
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

  resetAddress(): void {
    this.address = '';
  }

  async getNetworkFee(): Promise<void> {
    if (!this.isLoggedIn) return;

    if (this.isSwapAndSend) {
      this.setNetworkFee(this.calcSwapAndSendFee);
    } else if (this.isSend) {
      this.setNetworkFee(this.calcSendFee);
    } else {
      this.setNetworkFee(this.calcExchangeFee);
    }
  }

  get calcSendFee(): string {
    return api.NetworkFee.Transfer;
  }

  get calcExchangeFee(): string {
    return api.NetworkFee.Swap;
  }

  get calcSwapAndSendFee(): string {
    return api.NetworkFee.SwapAndSend;
  }

  async updatePairLiquiditySources(): Promise<void> {
    const isPair = !!this.tokenFrom?.address && !!this.tokenTo?.address;

    //  const sources = isPair
    //   ? await api.getListEnabledSourcesForPath(this.tokenFrom?.address, this.tokenTo?.address)
    //   : [];

    //  const sources = isPair
    //       ?
    //           await (bridgeApi.api.rpc as any).liquidityProxy.listEnabledSourcesForPath(
    //             0,
    //             this.tokenFrom?.address,
    //             this.tokenTo?.address
    //           )
    //   : [];

    const sources = isPair
      ? await api.swap.getEnabledLiquiditySourcesForPair(this.tokenFrom?.address, this.tokenTo?.address)
      : [];

    // await this.setPairLiquiditySources(sources.toJSON() as Array<LiquiditySourceTypes>);
    await this.setPairLiquiditySources(sources);
  }

  private async onChangeSwapReserves(payload: QuotePayload): Promise<void> {
    await this.setSubscriptionPayload(payload);

    this.runRecountSwapValues();
  }

  private subscribeOnSwapReserves(): void {
    this.cleanSwapReservesSubscription();
    if (!this.areTokensSelected) return;
    this.liquidityReservesSubscription = api.swap
      .subscribeOnReserves(this.tokenFrom.address, this.tokenTo.address, this.liquiditySource)
      .subscribe(this.onChangeSwapReserves);
  }

  // private subscribeOnSwapReserves(): void {
  //   this.cleanSwapReservesSubscription();
  //   if (!this.areTokensSelected) return;

  //   this.liquidityReservesSubscription = api.swap
  //     .subscribeOnReserves(this.tokenFrom.address, this.tokenTo.address, this.liquiditySource)
  //     .subscribe(this.runRecountSwapValues);
  // }

  private subscribeOnEnabledAssets(): void {
    this.cleanEnabledAssetsSubscription();
    this.enabledAssetsSubscription = api.swap
      .subscribeOnPrimaryMarketsEnabledAssets()
      .subscribe(this.setPrimaryMarketsEnabledAssets);
  }

  private cleanEnabledAssetsSubscription(): void {
    if (!this.enabledAssetsSubscription) {
      return;
    }
    this.enabledAssetsSubscription.unsubscribe();
    this.enabledAssetsSubscription = null;
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

      const { amount, fee, rewards } = await api.swap.getResult(
        this.tokenFrom as Asset,
        this.tokenTo as Asset,
        value,
        this.isExchangeB,
        [this.liquiditySource].filter(Boolean),
        this.paths,
        this.payload
      );

      setOppositeValue(this.getStringFromCodec(amount, oppositeToken.decimals));
      this.setLiquidityProviderFee(fee);
      this.setRewards(rewards);

      await Promise.all([this.calcMinMaxRecieved(), this.updatePrices()]);
    } catch (error: any) {
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

  private async calcMinMaxRecieved(): Promise<void> {
    const minMaxReceived = await api.swap.getMinMaxValue(
      this.tokenFrom as Asset,
      this.tokenTo as Asset,
      this.fromValue,
      this.toValue,
      this.isExchangeB,
      this.slippageTolerance
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

    if (isExchangeB) {
      this.setToValue(this.valueToDisplayed);
    }

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
      await this.checkSwap();
      this.subscribeOnSwapReserves();
    }
  }

  handleConfirm(): void {
    if (!this.isSend || this.isSwapAndSend) {
      this.showConfirmSwapDialog = true;
    } else {
      this.showConfirmSendDialog = true;
    }
  }

  async confirmSwap(isSwapConfirmed: boolean): Promise<void> {
    if (isSwapConfirmed) {
      this.resetFieldFrom();
      this.resetFieldTo();
      this.resetPrices();
      this.resetAddress();
      await this.setExchangeB(false);
    }
  }

  async confirmSend(isSendConfirmed: boolean): Promise<void> {
    if (isSendConfirmed) {
      this.resetFieldFrom();
      this.resetAddress();
    }
  }

  openSettingsDialog(): void {
    this.showSettings = true;
  }

  destroyed(): void {
    this.resetPage();
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

.page-header--swap {
  justify-content: space-between;
  align-items: center;
}

.address-input {
  margin: $inner-spacing-medium 0;
}
</style>
