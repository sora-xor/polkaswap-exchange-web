<template>
  <div v-loading="parentLoading" class="container">
    <generic-page-header
      has-button-back
      :title="t('addLiquidity.title')"
      :tooltip="t('pool.description')"
      @back="handleBack"
    />
    <s-form class="el-form--actions" :show-message="false">
      <s-float-input
        class="s-input--token-value"
        size="medium"
        :value="firstTokenValue"
        :decimals="firstTokenDecimals"
        has-locale-string
        :delimiters="delimiters"
        :max="getMax(firstTokenAddress)"
        :disabled="!areTokensSelected"
        @input="handleTokenChange($event, setFirstTokenValue)"
        @focus="setFocusedField('firstTokenValue')"
        @blur="resetFocusedField"
      >
        <div slot="top" class="input-line">
          <div class="input-title">
            <span class="input-title--uppercase input-title--primary">{{ t('createPair.deposit') }}</span>
          </div>
          <div v-if="isLoggedIn && firstToken" class="input-value">
            <span class="input-value--uppercase">{{ t('createPair.balance') }}</span>
            <formatted-amount-with-fiat-value
              value-can-be-hidden
              with-left-shift
              value-class="input-value--primary"
              :value="getFormattedTokenBalance(firstToken)"
              :fiat-value="getFiatBalance(firstToken)"
            />
          </div>
        </div>
        <div slot="right" class="s-flex el-buttons">
          <s-button
            v-if="isFirstMaxButtonAvailable"
            class="el-button--max s-typography-button--small"
            type="primary"
            alternative
            size="mini"
            border-radius="mini"
            @click="handleAddLiquidityMaxValue(firstToken, setFirstTokenValue)"
          >
            {{ t('buttons.max') }}
          </s-button>
          <token-select-button class="el-button--select-token" :token="firstToken" />
        </div>
        <div slot="bottom" class="input-line input-line--footer">
          <formatted-amount v-if="firstToken && firstTokenPrice" is-fiat-value :value="fiatFirstAmount" />
          <token-address
            v-if="firstToken"
            :name="firstToken.name"
            :symbol="firstToken.symbol"
            :address="firstToken.address"
            class="input-value"
          />
        </div>
      </s-float-input>
      <s-icon class="icon-divider" name="plus-16" />
      <s-float-input
        class="s-input--token-value"
        size="medium"
        :value="secondTokenValue"
        :decimals="secondTokenDecimals"
        has-locale-string
        :delimiters="delimiters"
        :max="getMax(secondTokenAddress)"
        :disabled="!areTokensSelected"
        @input="handleTokenChange($event, setSecondTokenValue)"
        @focus="setFocusedField('secondTokenValue')"
        @blur="resetFocusedField"
      >
        <div slot="top" class="input-line">
          <div class="input-title">
            <span class="input-title--uppercase input-title--primary">{{ t('createPair.deposit') }}</span>
          </div>
          <div v-if="isLoggedIn && secondToken" class="input-value">
            <span class="input-value--uppercase">{{ t('createPair.balance') }}</span>
            <formatted-amount-with-fiat-value
              value-can-be-hidden
              with-left-shift
              value-class="input-value--primary"
              :value="getFormattedTokenBalance(secondToken)"
              :fiat-value="getFiatBalance(secondToken)"
            />
          </div>
        </div>
        <div slot="right" class="s-flex el-buttons">
          <s-button
            v-if="isSecondMaxButtonAvailable"
            class="el-button--max s-typography-button--small"
            type="primary"
            alternative
            size="mini"
            border-radius="mini"
            @click="handleAddLiquidityMaxValue(secondToken, setSecondTokenValue)"
          >
            {{ t('buttons.max') }}
          </s-button>
          <token-select-button
            class="el-button--select-token"
            icon="chevron-down-rounded-16"
            :token="secondToken"
            @click="openSelectSecondTokenDialog"
          />
        </div>
        <div slot="bottom" class="input-line input-line--footer">
          <formatted-amount v-if="secondToken && secondTokenPrice" is-fiat-value :value="fiatSecondAmount" />
          <token-address
            v-if="secondToken"
            :name="secondToken.name"
            :symbol="secondToken.symbol"
            :address="secondToken.address"
            class="input-value"
          />
        </div>
      </s-float-input>
      <slippage-tolerance class="slippage-tolerance-settings" />
      <s-button
        type="primary"
        class="action-button s-typography-button--large"
        :disabled="!areTokensSelected || isEmptyBalance || isInsufficientBalance || !isAvailable"
        :loading="isSelectAssetLoading"
        @click="handleAddLiquidity"
      >
        <template v-if="!areTokensSelected">
          {{ t('buttons.chooseTokens') }}
        </template>
        <template v-else-if="!isAvailable">
          {{ t('addLiquidity.pairIsNotCreated') }}
        </template>
        <template v-else-if="isEmptyBalance">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else-if="isInsufficientBalance">
          {{ t('exchange.insufficientBalance', { tokenSymbol: insufficientBalanceTokenSymbol }) }}
        </template>
        <template v-else>
          {{ t('createPair.supply') }}
        </template>
      </s-button>
      <add-liquidity-transaction-details
        v-if="areTokensSelected && isAvailable && (!emptyAssets || (liquidityInfo || {}).balance)"
        :info-only="false"
        class="info-line-container"
      />
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
import { Component, Mixins } from 'vue-property-decorator';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { FPNumber, Operation } from '@sora-substrate/util';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

import TokenPairMixinInstance from '@/components/mixins/TokenPairMixin';
import NetworkFeeDialogMixin from '@/components/mixins/NetworkFeeDialogMixin';

import router, { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { getter, action, mutation, state } from '@/store/decorators';
import { TokenPairNamespace } from '@/components/mixins/BaseTokenPairMixin';
import type { LiquidityParams } from '@/store/pool/types';
import type { FocusedField } from '@/store/addLiquidity/types';

const namespace = TokenPairNamespace.AddLiquidity;

const TokenPairMixin = TokenPairMixinInstance(namespace);

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    SelectToken: lazyComponent(Components.SelectToken),
    TokenLogo: lazyComponent(Components.TokenLogo),
    SlippageTolerance: lazyComponent(Components.SlippageTolerance),
    ConfirmTokenPairDialog: lazyComponent(Components.ConfirmTokenPairDialog),
    NetworkFeeWarningDialog: lazyComponent(Components.NetworkFeeWarningDialog),
    TokenSelectButton: lazyComponent(Components.TokenSelectButton),
    TokenAddress: lazyComponent(Components.TokenAddress),
    AddLiquidityTransactionDetails: lazyComponent(Components.AddLiquidityTransactionDetails),
    FormattedAmount: components.FormattedAmount,
    FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue,
    InfoLine: components.InfoLine,
  },
})
export default class AddLiquidity extends Mixins(mixins.NetworkFeeWarningMixin, TokenPairMixin, NetworkFeeDialogMixin) {
  readonly delimiters = FPNumber.DELIMITERS_CONFIG;

  @state.addLiquidity.focusedField private focusedField!: FocusedField;

  @getter.addLiquidity.shareOfPool shareOfPool!: string;
  @getter.addLiquidity.liquidityInfo liquidityInfo!: Nullable<AccountLiquidity>;

  @action.addLiquidity.addLiquidity private addLiquidity!: AsyncVoidFn;
  @action.addLiquidity.setDataFromLiquidity private setData!: (args: LiquidityParams) => Promise<void>;

  @mutation.addLiquidity.setFocusedField setFocusedField!: (value: FocusedField) => void;
  @mutation.addLiquidity.resetFocusedField resetFocusedField!: VoidFunction;

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

  get firstAddress(): string {
    return router.currentRoute.params.firstAddress;
  }

  get secondAddress(): string {
    return router.currentRoute.params.secondAddress;
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
    return this.formatCodecNumber(this.networkFees.RemoveLiquidity);
  }

  get isXorSufficientForNextOperation(): boolean {
    return this.isXorSufficientForNextTx({
      type: Operation.AddLiquidity,
      amount: this.getFPNumber(this.firstTokenValue),
    });
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

  handleConfirmAddLiquidity(): Promise<void> {
    return this.handleConfirm(this.addLiquidity);
  }
}
</script>

<style lang="scss">
.el-form--actions {
  .s-input--token-value .el-input .el-input__inner {
    @include text-ellipsis;
  }
}
</style>

<style lang="scss" scoped>
.el-form--actions {
  @include buttons;
  @include full-width-button('action-button');
}

@include vertical-divider('icon-divider', $inner-spacing-medium);
@include vertical-divider('el-divider');
</style>
