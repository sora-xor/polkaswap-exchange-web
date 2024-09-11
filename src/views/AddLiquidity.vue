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
        :loading="loading || isSelectAssetLoading"
        @click="handleAddLiquidity"
      >
        <template v-if="!areTokensSelected">
          {{ t('buttons.chooseTokens') }}
        </template>
        <template v-else-if="emptyAssets">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else-if="isInsufficientBalance">
          {{ t('insufficientBalanceText', { tokenSymbol: insufficientBalanceTokenSymbol }) }}
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
      is-add-liquidity
      :visible.sync="showSelectTokenDialog"
      :connected="isLoggedIn"
      :asset="isFirstTokenSelected ? secondToken : firstToken"
      :is-first-token-selected="isFirstTokenSelected"
      :disabled-custom="isFirstTokenSelected"
      @select="selectToken"
    />

    <add-liquidity-confirm
      :visible.sync="confirmDialogVisibility"
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
      @confirm="depositLiquidity"
    />

    <network-fee-warning-dialog
      :visible.sync="showWarningFeeDialog"
      :fee="removeLiquidityFormattedFee"
      @confirm="confirmNetworkFeeWariningDialog"
    />
  </div>
</template>

<script lang="ts">
import { Operation } from '@sora-substrate/sdk';
import { XOR, XSTUSD } from '@sora-substrate/sdk/build/assets/consts';
import { components, mixins, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import BaseTokenPairMixin from '@/components/mixins/BaseTokenPairMixin';
import ConfirmDialogMixin from '@/components/mixins/ConfirmDialogMixin';
import NetworkFeeDialogMixin from '@/components/mixins/NetworkFeeDialogMixin';
import SelectedTokenRouteMixin from '@/components/mixins/SelectedTokensRouteMixin';
import TokenSelectMixin from '@/components/mixins/TokenSelectMixin';
import { Components, PageNames } from '@/consts';
import router, { lazyComponent } from '@/router';
import { FocusedField } from '@/store/addLiquidity/types';
import { getter, action, mutation, state } from '@/store/decorators';
import type { LiquidityParams } from '@/store/pool/types';
import { getMaxValue, isMaxButtonAvailable, hasInsufficientBalance, getAssetBalance } from '@/utils';

import type { CodecString } from '@sora-substrate/sdk';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { AccountLiquidity } from '@sora-substrate/sdk/build/poolXyk/types';

type SetValue = (v: string) => Promise<void>;

@Component({
  components: {
    AddLiquidityConfirm: lazyComponent(Components.AddLiquidityConfirm),
    AddLiquidityTransactionDetails: lazyComponent(Components.AddLiquidityTransactionDetails),
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    SelectToken: lazyComponent(Components.SelectToken),
    SlippageTolerance: lazyComponent(Components.SlippageTolerance),
    NetworkFeeWarningDialog: lazyComponent(Components.NetworkFeeWarningDialog),
    TokenInput: lazyComponent(Components.TokenInput),
    InfoLine: components.InfoLine,
  },
})
export default class AddLiquidity extends Mixins(
  mixins.TransactionMixin,
  mixins.NetworkFeeWarningMixin,
  BaseTokenPairMixin,
  NetworkFeeDialogMixin,
  ConfirmDialogMixin,
  TokenSelectMixin,
  SelectedTokenRouteMixin
) {
  readonly FocusedField = FocusedField;

  @state.settings.slippageTolerance slippageToleranceValue!: string;

  @getter.assets.xor private xor!: AccountAsset;
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @getter.addLiquidity.shareOfPool shareOfPool!: string;
  @getter.addLiquidity.liquidityInfo liquidityInfo!: Nullable<AccountLiquidity>;
  @getter.addLiquidity.isNotFirstLiquidityProvider isNotFirstLiquidityProvider!: boolean;

  @action.addLiquidity.setFirstTokenAddress private setFirstTokenAddress!: (address: string) => Promise<void>;
  @action.addLiquidity.setSecondTokenAddress private setSecondTokenAddress!: (address: string) => Promise<void>;
  @action.addLiquidity.addLiquidity private addLiquidity!: AsyncFnWithoutArgs;
  @action.addLiquidity.updateSubscriptions private updateSubscriptions!: AsyncFnWithoutArgs;
  @action.addLiquidity.resetSubscriptions private resetSubscriptions!: AsyncFnWithoutArgs;
  @action.addLiquidity.resetData private resetData!: AsyncFnWithoutArgs;
  @action.addLiquidity.setDataFromLiquidity setData!: (args: LiquidityParams) => Promise<void>; // Overrides SelectedTokenRouteMixin
  @action.addLiquidity.setFirstTokenValue setFirstTokenValue!: (address: string) => Promise<void>;
  @action.addLiquidity.setSecondTokenValue setSecondTokenValue!: (address: string) => Promise<void>;

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
      this.parseCurrentRoute();
      if (this.isValidRoute && this.firstRouteAddress && this.secondRouteAddress) {
        await this.setData({
          firstAddress: this.firstRouteAddress,
          secondAddress: this.secondRouteAddress,
        });
      } else {
        await this.setFirstTokenAddress(XOR.address);
      }
    });
  }

  destroyed(): void {
    this.resetData();
  }

  get areTokensSelected(): boolean {
    return !!(this.firstToken && this.secondToken);
  }

  get removeLiquidityFormattedFee(): string {
    return this.formatCodecNumber(this.networkFees[Operation.RemoveLiquidity]);
  }

  get isXorSufficientForNextOperation(): boolean {
    const params: WALLET_CONSTS.NetworkFeeWarningOptions = {
      type: this.isAvailable ? Operation.AddLiquidity : Operation.CreatePair,
    };

    if (this.firstToken?.address === XOR.address) {
      params.amount = this.getFPNumber(this.firstTokenValue);
      params.isXor = true;
    }
    return this.isXorSufficientForNextTx(params);
  }

  get isFirstMaxButtonAvailable(): boolean {
    if (!(this.firstToken && this.isLoggedIn)) return false;

    return isMaxButtonAvailable(this.firstToken, this.firstTokenValue, this.networkFee, this.xor);
  }

  get isSecondMaxButtonAvailable(): boolean {
    if (!(this.secondToken && this.isLoggedIn)) return false;

    return isMaxButtonAvailable(this.secondToken, this.secondTokenValue, this.networkFee, this.xor);
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
    if (this.allowFeePopup && !this.isXorSufficientForNextOperation) {
      this.openWarningFeeDialog();
      await this.waitOnFeeWarningConfirmation();
      if (!this.isWarningFeeDialogConfirmed) {
        return;
      }
      this.isWarningFeeDialogConfirmed = false;
    }

    this.confirmOrExecute(this.depositLiquidity);
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
        if (this.firstToken?.address === XSTUSD.address && this.secondToken?.address === XOR.address) {
          await this.setFirstTokenAddress(XOR.address);
          await this.setSecondTokenAddress(XSTUSD.address);
        }
      });
    }
    this.updateRouteAfterSelectTokens(this.firstToken, this.secondToken);
  }

  async depositLiquidity(): Promise<void> {
    await this.withNotifications(async () => {
      await this.addLiquidity();
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
