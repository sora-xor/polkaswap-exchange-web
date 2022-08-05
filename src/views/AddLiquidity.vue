<template>
  <div v-loading="parentLoading" class="container">
    <generic-page-header
      has-button-back
      :title="t('addLiquidity.title')"
      :tooltip="t('pool.description')"
      @back="handleBack"
    />
    <s-form class="el-form--actions" :show-message="false">
      <token-input
        :balance="getTokenBalance(firstToken)"
        :is-max-available="isFirstMaxButtonAvailable"
        :title="t('createPair.deposit')"
        :token="firstToken"
        :value="firstTokenValue"
        :disabled="!areTokensSelected"
        @input="handleTokenChange($event, setFirstTokenValue)"
        @focus="setFocusedField('firstTokenValue')"
        @blur="resetFocusedField"
        @max="handleAddLiquidityMaxValue($event, setFirstTokenValue)"
      />

      <s-icon class="icon-divider" name="plus-16" />

      <token-input
        :balance="getTokenBalance(secondToken)"
        is-select-available
        :is-max-available="isSecondMaxButtonAvailable"
        :title="t('createPair.deposit')"
        :token="secondToken"
        :value="secondTokenValue"
        :disabled="!areTokensSelected"
        @input="handleTokenChange($event, setSecondTokenValue)"
        @focus="setFocusedField('secondTokenValue')"
        @blur="resetFocusedField"
        @max="handleAddLiquidityMaxValue($event, setSecondTokenValue)"
        @select="openSelectSecondTokenDialog"
      />

      <slippage-tolerance class="slippage-tolerance-settings" />

      <s-button
        type="primary"
        class="action-button s-typography-button--large"
        :disabled="!areTokensSelected || emptyAssets || isInsufficientBalance"
        :loading="isSelectAssetLoading"
        @click="handleAddLiquidity"
      >
        <template v-if="!areTokensSelected">
          {{ t('buttons.chooseTokens') }}
        </template>
        <template v-else-if="emptyAssets">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else-if="isInsufficientBalance">
          {{ t('exchange.insufficientBalance', { tokenSymbol: insufficientBalanceTokenSymbol }) }}
        </template>
        <template v-else>
          {{ t('createPair.supply') }}
        </template>
      </s-button>

      <template v-if="areTokensSelected">
        <div v-if="!isAvailable && emptyAssets" class="info-line-container">
          <p class="info-line-container__title">{{ t('createPair.firstLiquidityProvider') }}</p>
          <info-line>
            <template #info-line-prefix>
              <p class="info-line--first-liquidity" v-html="t('createPair.firstLiquidityProviderInfo')" />
            </template>
          </info-line>
        </div>

        <add-liquidity-transaction-details
          v-if="!emptyAssets || (liquidityInfo || {}).balance"
          :info-only="false"
          class="info-line-container"
        />
      </template>
    </s-form>

    <select-token
      :visible.sync="showSelectSecondTokenDialog"
      :connected="isLoggedIn"
      :asset="firstToken"
      @select="selectSecondTokenAddress($event.address)"
    />

    <confirm-token-pair-dialog
      :visible.sync="showConfirmDialog"
      :parent-loading="parentLoading"
      :share-of-pool="shareOfPool"
      :first-token="firstToken"
      :second-token="secondToken"
      :first-token-value="firstTokenValue"
      :second-token-value="secondTokenValue"
      :price="price"
      :price-reversed="priceReversed"
      :slippage-tolerance="slippageTolerance"
      @confirm="handleConfirmAddLiquidity"
    />

    <network-fee-warning-dialog
      :visible.sync="showWarningFeeDialog"
      :fee="removeLiquidityFormattedFee"
      @confirm="confirmNetworkFeeWariningDialog"
    />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { FPNumber, Operation } from '@sora-substrate/util';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import type { CodecString } from '@sora-substrate/util';
import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

import ConfirmDialogMixin from '@/components/mixins/ConfirmDialogMixin';
import TokenSelectMixin from '@/components/mixins/TokenSelectMixin';
import BaseTokenPairMixin from '@/components/mixins/BaseTokenPairMixin';
import NetworkFeeDialogMixin from '@/components/mixins/NetworkFeeDialogMixin';

import router, { lazyComponent } from '@/router';
import { Components, PageNames } from '@/consts';
import { getter, action, mutation, state } from '@/store/decorators';
import { getMaxValue, isMaxButtonAvailable, isXorAccountAsset, hasInsufficientBalance, getAssetBalance } from '@/utils';
import type { LiquidityParams } from '@/store/pool/types';
import type { FocusedField } from '@/store/addLiquidity/types';
import type { PricesPayload } from '@/store/prices/types';

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    SelectToken: lazyComponent(Components.SelectToken),
    SlippageTolerance: lazyComponent(Components.SlippageTolerance),
    ConfirmTokenPairDialog: lazyComponent(Components.ConfirmTokenPairDialog),
    NetworkFeeWarningDialog: lazyComponent(Components.NetworkFeeWarningDialog),
    TokenInput: lazyComponent(Components.TokenInput),
    AddLiquidityTransactionDetails: lazyComponent(Components.AddLiquidityTransactionDetails),
    InfoLine: components.InfoLine,
  },
})
export default class AddLiquidity extends Mixins(
  mixins.TransactionMixin,
  mixins.NetworkFeeWarningMixin,
  BaseTokenPairMixin,
  NetworkFeeDialogMixin,
  ConfirmDialogMixin,
  TokenSelectMixin
) {
  readonly delimiters = FPNumber.DELIMITERS_CONFIG;

  @state.settings.slippageTolerance slippageTolerance!: string;
  @state.addLiquidity.focusedField private focusedField!: FocusedField;

  @getter.assets.xor private xor!: AccountAsset;
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @getter.addLiquidity.shareOfPool shareOfPool!: string;
  @getter.addLiquidity.liquidityInfo liquidityInfo!: Nullable<AccountLiquidity>;

  @action.prices.getPrices getPrices!: (options?: PricesPayload) => Promise<void>;
  @action.addLiquidity.setFirstTokenAddress setFirstTokenAddress!: (address: string) => Promise<void>;
  @action.addLiquidity.setSecondTokenAddress setSecondTokenAddress!: (address: string) => Promise<void>;
  @action.addLiquidity.setFirstTokenValue setFirstTokenValue!: (address: string) => Promise<void>;
  @action.addLiquidity.setSecondTokenValue setSecondTokenValue!: (address: string) => Promise<void>;
  @action.addLiquidity.addLiquidity private addLiquidity!: AsyncVoidFn;
  @action.addLiquidity.setDataFromLiquidity private setData!: (args: LiquidityParams) => Promise<void>;
  @action.addLiquidity.resetData resetData!: (withAssets?: boolean) => Promise<void>;

  @mutation.prices.resetPrices resetPrices!: VoidFunction;
  @mutation.addLiquidity.setFocusedField setFocusedField!: (value: FocusedField) => void;
  @mutation.addLiquidity.resetFocusedField resetFocusedField!: VoidFunction;

  showSelectSecondTokenDialog = false;
  insufficientBalanceTokenSymbol = '';

  @Watch('isLoggedIn')
  private handleLoggedInStateChange(isLoggedIn: boolean, wasLoggedIn: boolean): void {
    if (wasLoggedIn && !isLoggedIn) {
      this.handleBack();
    }
  }

  async mounted(): Promise<void> {
    await this.withParentLoading(async () => {
      if (this.firstAddress && this.secondAddress) {
        await this.setData({
          firstAddress: this.firstAddress,
          secondAddress: this.secondAddress,
        });
        // If user don't have the liquidity (navigated through the address bar) redirect to the Pool page
        if (!this.liquidityInfo) {
          return this.handleBack();
        }
      } else {
        await this.setFirstTokenAddress(XOR.address);
      }
    });
  }

  destroyed(): void {
    this.resetPrices();
    this.resetData(!!(this.firstAddress && this.secondAddress));
  }

  get firstAddress(): string {
    return router.currentRoute.params.firstAddress;
  }

  get secondAddress(): string {
    return router.currentRoute.params.secondAddress;
  }

  get areTokensSelected(): boolean {
    return !!(this.firstToken && this.secondToken);
  }

  get chooseTokenClasses(): string {
    const buttonClass = 'el-button';
    const classes = [buttonClass, buttonClass + '--choose-token'];

    if (this.secondAddress) {
      classes.push(`${buttonClass}--disabled`);
    }

    return classes.join(' ');
  }

  get removeLiquidityFormattedFee(): string {
    return this.formatCodecNumber(this.networkFees[Operation.RemoveLiquidity]);
  }

  get isXorSufficientForNextOperation(): boolean {
    return this.isXorSufficientForNextTx({
      type: Operation.AddLiquidity,
      amount: this.getFPNumber(this.firstTokenValue),
    });
  }

  get isFirstMaxButtonAvailable(): boolean {
    if (!this.firstToken) return false;

    return (
      this.isLoggedIn &&
      isMaxButtonAvailable(this.areTokensSelected, this.firstToken, this.firstTokenValue, this.networkFee, this.xor)
    );
  }

  get isSecondMaxButtonAvailable(): boolean {
    if (!this.secondToken) return false;

    return (
      this.isLoggedIn &&
      isMaxButtonAvailable(this.areTokensSelected, this.secondToken, this.secondTokenValue, this.networkFee, this.xor)
    );
  }

  get isInsufficientBalance(): boolean {
    if (!(this.firstToken && this.secondToken)) return false;

    if (this.isLoggedIn && this.areTokensSelected) {
      if (isXorAccountAsset(this.firstToken) || isXorAccountAsset(this.secondToken)) {
        if (hasInsufficientBalance(this.firstToken, this.firstTokenValue, this.networkFee)) {
          this.insufficientBalanceTokenSymbol = this.firstToken.symbol;
          return true;
        }
        if (hasInsufficientBalance(this.secondToken, this.secondTokenValue, this.networkFee)) {
          this.insufficientBalanceTokenSymbol = this.secondToken.symbol;
          return true;
        }
      }
    }
    return false;
  }

  handleAddLiquidityMaxValue(token: Nullable<AccountAsset>, setValue: (v: string) => Promise<void>): void {
    if (this.focusedField) {
      this.resetFocusedField();
    }
    this.handleMaxValue(token, setValue);
  }

  async handleAddLiquidity(): Promise<void> {
    if (!this.isXorSufficientForNextOperation) {
      this.openWarningFeeDialog();
      await this.waitOnNextTxFailureConfirmation();
      if (!this.isWarningFeeDialogConfirmed) {
        return;
      }
      this.isWarningFeeDialogConfirmed = false;
    }
    this.openConfirmDialog();
  }

  handleMaxValue(token: Nullable<AccountAsset>, setValue: (v: string) => Promise<void>): void {
    if (!token) return;
    setValue(getMaxValue(token, this.networkFee));
    this.updatePrices();
  }

  async handleTokenChange(value: string, setValue: (v: string) => Promise<void>): Promise<void> {
    await setValue(value);
    this.updatePrices();
  }

  updatePrices(): void {
    this.getPrices({
      assetAAddress: this.firstToken?.address,
      assetBAddress: this.secondToken?.address,
      amountA: this.firstTokenValue,
      amountB: this.secondTokenValue,
    });
  }

  getTokenBalance(token: any): CodecString {
    return getAssetBalance(token);
  }

  openSelectSecondTokenDialog(): void {
    this.showSelectSecondTokenDialog = true;
  }

  async selectSecondTokenAddress(address: string): Promise<void> {
    await this.withSelectAssetLoading(async () => {
      this.setSecondTokenAddress(address);
    });
  }

  async handleConfirmAddLiquidity(): Promise<void> {
    await this.handleConfirmDialog(async () => {
      await this.withNotifications(this.addLiquidity);
      this.handleBack();
    });
  }

  handleBack(): void {
    router.push({ name: PageNames.Pool });
  }
}
</script>

<style lang="scss" scoped>
.info-line--first-liquidity {
  color: var(--s-color-base-content-secondary);
  font-size: var(--s-font-size-mini);
}

.el-form--actions {
  @include full-width-button('action-button');
}

@include vertical-divider('icon-divider', $inner-spacing-medium);
@include vertical-divider('el-divider');
</style>
