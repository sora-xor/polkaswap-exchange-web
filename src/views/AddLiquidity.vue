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
        is-select-available
        :is-max-available="isFirstMaxButtonAvailable"
        :title="t('createPair.deposit')"
        :token="firstToken"
        :value="firstTokenValue"
        :disabled="!areTokensSelected"
        @input="handleTokenChange($event, setFirstTokenValue)"
        @focus="setFocusedField(FocusedField.First)"
        @max="handleAddLiquidityMaxValue($event, setFirstTokenValue)"
        @select="openSelectTokenDialog(true)"
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
        @focus="setFocusedField(FocusedField.Second)"
        @max="handleAddLiquidityMaxValue($event, setSecondTokenValue)"
        @select="openSelectTokenDialog(false)"
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
        <div v-if="!(isAvailable && isNotFirstLiquidityProvider) && emptyAssets" class="info-line-container">
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
      :visible.sync="showSelectTokenDialog"
      :connected="isLoggedIn"
      :asset="isFirstTokenSelected ? secondToken : firstToken"
      :is-main-token-providers="isFirstTokenSelected"
      :disabled-custom="isFirstTokenSelected"
      @select="selectToken"
    />

    <confirm-token-pair-dialog
      :visible.sync="showConfirmDialog"
      :parent-loading="parentLoading || loading"
      :share-of-pool="shareOfPool"
      :first-token="firstToken"
      :second-token="secondToken"
      :first-token-value="firstTokenValue"
      :second-token-value="secondTokenValue"
      :price="price"
      :price-reversed="priceReversed"
      :slippage-tolerance="slippageToleranceValue"
      :insufficient-balance-token-symbol="insufficientBalanceTokenSymbol"
      @confirm="handleConfirmAddLiquidity"
    />

    <confirm-dialog :visible.sync="showConfirmTxDialog" @confirm="confirmTransactionDialog" />

    <network-fee-warning-dialog
      :visible.sync="showWarningFeeDialog"
      :fee="removeLiquidityFormattedFee"
      @confirm="confirmNetworkFeeWariningDialog"
    />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { api, components, mixins } from '@soramitsu/soraneo-wallet-web';
import { FPNumber, Operation } from '@sora-substrate/util';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import type { CodecString } from '@sora-substrate/util';
import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

import TokenSelectMixin from '@/components/mixins/TokenSelectMixin';
import BaseTokenPairMixin from '@/components/mixins/BaseTokenPairMixin';
import ConfirmDialogMixin from '@/components/mixins/ConfirmDialogMixin';
import NetworkFeeDialogMixin from '@/components/mixins/NetworkFeeDialogMixin';

import router, { lazyComponent } from '@/router';
import { Components, PageNames } from '@/consts';
import { getter, action, mutation, state } from '@/store/decorators';
import { getMaxValue, isMaxButtonAvailable, hasInsufficientBalance, getAssetBalance } from '@/utils';
import { FocusedField } from '@/store/addLiquidity/types';
import type { LiquidityParams } from '@/store/pool/types';

type SetValue = (v: string) => Promise<void>;

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    SelectToken: lazyComponent(Components.SelectToken),
    SlippageTolerance: lazyComponent(Components.SlippageTolerance),
    ConfirmTokenPairDialog: lazyComponent(Components.ConfirmTokenPairDialog),
    NetworkFeeWarningDialog: lazyComponent(Components.NetworkFeeWarningDialog),
    TokenInput: lazyComponent(Components.TokenInput),
    AddLiquidityTransactionDetails: lazyComponent(Components.AddLiquidityTransactionDetails),
    ConfirmDialog: components.ConfirmDialog,
    InfoLine: components.InfoLine,
  },
})
export default class AddLiquidity extends Mixins(
  mixins.TransactionMixin,
  mixins.NetworkFeeWarningMixin,
  mixins.ConfirmTransactionMixin,
  BaseTokenPairMixin,
  NetworkFeeDialogMixin,
  ConfirmDialogMixin,
  TokenSelectMixin
) {
  readonly FocusedField = FocusedField;

  @state.settings.slippageTolerance slippageToleranceValue!: string;

  @getter.assets.xor private xor!: AccountAsset;
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @getter.addLiquidity.shareOfPool shareOfPool!: string;
  @getter.addLiquidity.liquidityInfo liquidityInfo!: Nullable<AccountLiquidity>;
  @getter.addLiquidity.isNotFirstLiquidityProvider isNotFirstLiquidityProvider!: boolean;
  @getter.settings.isDesktop private isDesktop!: boolean;

  @action.addLiquidity.setFirstTokenAddress setFirstTokenAddress!: (address: string) => Promise<void>;
  @action.addLiquidity.setSecondTokenAddress setSecondTokenAddress!: (address: string) => Promise<void>;
  @action.addLiquidity.setFirstTokenValue setFirstTokenValue!: (address: string) => Promise<void>;
  @action.addLiquidity.setSecondTokenValue setSecondTokenValue!: (address: string) => Promise<void>;
  @action.addLiquidity.addLiquidity private addLiquidity!: AsyncVoidFn;
  @action.addLiquidity.setDataFromLiquidity private setData!: (args: LiquidityParams) => Promise<void>;
  @action.addLiquidity.updateSubscriptions updateSubscriptions!: AsyncVoidFn;
  @action.addLiquidity.resetSubscriptions resetSubscriptions!: AsyncVoidFn;
  @action.addLiquidity.resetData resetData!: AsyncVoidFn;

  @mutation.addLiquidity.setFocusedField setFocusedField!: (value: FocusedField) => void;

  showSelectTokenDialog = false;
  isFirstTokenSelected = false;
  insufficientBalanceTokenSymbol = '';

  @Watch('isLoggedIn')
  private handleLoggedInStateChange(isLoggedIn: boolean, wasLoggedIn: boolean): void {
    if (wasLoggedIn && !isLoggedIn) {
      this.handleBack();
    }
  }

  @Watch('nodeIsConnected')
  private updateConnectionSubsriptions(nodeConnected: boolean) {
    if (nodeConnected) {
      this.updateSubscriptions();
    } else {
      this.resetSubscriptions();
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
    this.resetData();
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
    const params: { type: Operation; amount?: FPNumber } = {
      type: Operation.AddLiquidity,
    };
    if (this.firstAddress === XOR.address) {
      params.amount = this.getFPNumber(this.firstTokenValue);
    }
    return this.isXorSufficientForNextTx(params);
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
    if (this.isLoggedIn && this.areTokensSelected) {
      if (hasInsufficientBalance(this.firstToken as AccountAsset, this.firstTokenValue, this.networkFee)) {
        this.insufficientBalanceTokenSymbol = (this.firstToken as AccountAsset).symbol;
        return true;
      }
      if (hasInsufficientBalance(this.secondToken as AccountAsset, this.secondTokenValue, this.networkFee)) {
        this.insufficientBalanceTokenSymbol = (this.secondToken as AccountAsset).symbol;
        return true;
      }
    }
    this.insufficientBalanceTokenSymbol = '';
    return false;
  }

  async handleAddLiquidityMaxValue(token: Nullable<AccountAsset>, setValue: SetValue): Promise<void> {
    if (!token) return;
    await this.handleTokenChange(getMaxValue(token, this.networkFee), setValue);
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

  async handleTokenChange(value: string, setValue: SetValue): Promise<void> {
    await setValue(value);
  }

  getTokenBalance(token: any): CodecString {
    return getAssetBalance(token);
  }

  openSelectTokenDialog(isFirstToken: boolean): void {
    this.isFirstTokenSelected = isFirstToken;
    this.showSelectTokenDialog = true;
  }

  async selectToken(token: AccountAsset): Promise<void> {
    const address = token?.address;
    if (address) {
      await this.withSelectAssetLoading(async () => {
        if (this.isFirstTokenSelected) {
          await this.setFirstTokenAddress(address);
        } else {
          await this.setSecondTokenAddress(address);
        }
      });
    }
  }

  async handleConfirmAddLiquidity(): Promise<void> {
    await this.handleConfirmDialog(async () => {
      if (this.isDesktop) {
        this.openConfirmationDialog();
        await this.waitOnNextTxConfirmation();
        if (!this.isTxDialogConfirmed) {
          return;
        }
      }

      await this.withNotifications(this.addLiquidity);
      api.lockPair();
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
