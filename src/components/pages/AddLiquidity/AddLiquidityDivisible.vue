<template>
  <div v-loading="parentLoading">
    <s-form class="el-form--actions" :show-message="false">
      <token-input
        :balance="getTokenBalance(firstToken)"
        is-select-available
        :is-max-available="isFirstMaxButtonAvailable"
        :title="t('createPair.deposit')"
        :token="token"
        :value="tokenValue"
        :disabled="!areTokensSelected"
        @input="handleTokenChange($event)"
        @focus="setFocusedField(FocusedField.First)"
        @max="handleAddLiquidityMaxValue($event)"
        @select="openSelectTokenDialog(showAllAssets)"
      />

      <slippage-tolerance class="slippage-tolerance-settings" />

      <template>
        <div v-if="!tokenValue" class="liquidity-division-info">
          <p>Polkaswap will automatically split XOR between two tokens to maintain a balanced LP pool</p>
        </div>
        <div v-else class="liquidity-division-info">
          <p>{{ `Your ${tokenValue} ${token.symbol} will be split into` }}</p>
          <div class="liquidity-division-info-result">
            <div class="liquidity-division-info-result__value">
              <token-logo :token="firstToken" size="small" class="token-logo liquidity-options__token-logo" />
              <span>{{ `${firstTokenSplitResult} ${firstToken.symbol}` }}</span>
            </div>
            <div class="liquidity-division-info-result__value">
              <token-logo :token="secondToken" size="small" class="token-logo liquidity-options__token-logo" />
              <span>{{ `${secondTokenSplitResult} ${secondToken.symbol}` }}</span>
            </div>
          </div>
        </div>
        <p class="liquidity-division-info-sign">You’ll be signing 2 transactions (Swap & Supply).</p>
      </template>

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
      is-add-liquidity
      :visible.sync="showSelectTokenDialog"
      :connected="isLoggedIn"
      :asset="isFirstTokenSelected ? secondToken : firstToken"
      :is-first-token-selected="isFirstTokenSelected"
      :disabled-custom="isFirstTokenSelected"
      @select="selectToken"
    />

    <add-liquidity-confirm
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

    <network-fee-warning-dialog
      :visible.sync="showWarningFeeDialog"
      :fee="removeLiquidityFormattedFee"
      @confirm="confirmNetworkFeeWariningDialog"
    />
  </div>
</template>

<script lang="ts">
import { FPNumber, Operation } from '@sora-substrate/util';
import { XOR, XSTUSD } from '@sora-substrate/util/build/assets/consts';
import { components, mixins, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator';

import BaseTokenPairMixin from '@/components/mixins/BaseTokenPairMixin';
import ConfirmDialogMixin from '@/components/mixins/ConfirmDialogMixin';
import NetworkFeeDialogMixin from '@/components/mixins/NetworkFeeDialogMixin';
import SelectedTokenRouteMixin from '@/components/mixins/SelectedTokensRouteMixin';
import TokenSelectMixin from '@/components/mixins/TokenSelectMixin';
import { Components, PageNames } from '@/consts';
import router, { lazyComponent } from '@/router';
import { FocusedField, AddLiquidityType } from '@/store/addLiquidity/types';
import { getter, action, mutation, state } from '@/store/decorators';
import type { LiquidityParams } from '@/store/pool/types';
import { getMaxValue, isMaxButtonAvailable, hasInsufficientBalance, getAssetBalance } from '@/utils';

import type { CodecString } from '@sora-substrate/util';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';
import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';

@Component({
  components: {
    AddLiquidityConfirm: lazyComponent(Components.AddLiquidityConfirm),
    AddLiquidityTransactionDetails: lazyComponent(Components.AddLiquidityTransactionDetails),
    SelectToken: lazyComponent(Components.SelectToken),
    SlippageTolerance: lazyComponent(Components.SlippageTolerance),
    NetworkFeeWarningDialog: lazyComponent(Components.NetworkFeeWarningDialog),
    TokenInput: lazyComponent(Components.TokenInput),
    InfoLine: components.InfoLine,
    TokenLogo: components.TokenLogo,
  },
})
export default class AddLiquidityDivisible extends Mixins(
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
  @state.addLiquidity.liquidityOption liquidityOption!: AddLiquidityType;

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

  @Prop({ type: String }) readonly currentTab!: string;

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

  get firstTokenSplitResult(): any {
    return FPNumber.fromNatural(this.firstTokenValue).div(new FPNumber(2));
  }

  get secondTokenSplitResult(): any {
    // CALCULATE SWAP RESULT FROM firstTokenSplitResult / 2!!!
    return FPNumber.fromNatural(this.secondTokenValue).format(2);
  }

  get token() {
    if (this.liquidityOption === AddLiquidityType.DivisibleFirstToken) return this.firstToken;
    if (this.liquidityOption === AddLiquidityType.DivisibleSecondToken) return this.secondToken;
    return this.firstToken;
  }

  get tokenValue() {
    if (this.liquidityOption === AddLiquidityType.DivisibleFirstToken) return this.firstTokenValue;
    if (this.liquidityOption === AddLiquidityType.DivisibleSecondToken) return this.secondTokenValue;
    return this.firstTokenValue;
  }

  get showAllAssets(): boolean {
    if (this.liquidityOption === AddLiquidityType.DivisibleFirstToken) return true;
    if (this.liquidityOption === AddLiquidityType.DivisibleSecondToken) return false;
    return true;
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

  async handleAddLiquidityMaxValue(token: Nullable<AccountAsset>): Promise<void> {
    if (!token) return;
    await this.handleTokenChange(getMaxValue(token, this.networkFee));
  }

  async handleAddLiquidity(): Promise<void> {
    if (this.allowFeePopup && !this.isXorSufficientForNextOperation) {
      this.openWarningFeeDialog();
      await this.waitOnNextTxFailureConfirmation();
      if (!this.isWarningFeeDialogConfirmed) {
        return;
      }
      this.isWarningFeeDialogConfirmed = false;
    }
    this.openConfirmDialog();
  }

  async handleTokenChange(value: string): Promise<void> {
    if (this.liquidityOption === AddLiquidityType.DivisibleFirstToken) {
      await this.setFirstTokenValue(value);
    }
    if (this.liquidityOption === AddLiquidityType.DivisibleSecondToken) {
      await this.setSecondTokenValue(value);
    }
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

.liquidity-division-info {
  background: #f7f3f4;
  margin-top: 16px;
  height: 100px;
  box-shadow: -5px -5px 10px #ffffff, 1px 1px 10px rgba(0, 0, 0, 0.1), inset 1px 1px 2px rgba(255, 255, 255, 0.8);
  border-radius: 24px;
  font-style: normal;
  font-weight: 400;
  font-size: 16px;
  width: 100%;
  line-height: 150%;
  letter-spacing: -0.02em;
  color: #2a171f;
  padding: 16px 8px 8px 16px;

  &-result {
    display: flex;
    &__value {
      display: flex;
      margin-right: 24px;

      span {
        margin-left: 8px;
        font-weight: 700;
        font-size: 18px;
      }
    }
  }

  &-sign {
    font-size: 16px;
    margin-top: 24px;
    color: #a19a9d;
    align-self: self-start;
  }
}
</style>
