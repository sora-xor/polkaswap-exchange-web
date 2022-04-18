<template>
  <div v-loading="parentLoading" class="container">
    <generic-page-header
      has-button-back
      :title="t('createPair.title')"
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
            v-if="isAvailable && isFirstMaxButtonAvailable"
            class="el-button--max s-typography-button--small"
            type="primary"
            alternative
            size="mini"
            border-radius="mini"
            @click="handleMaxValue(firstToken, setFirstTokenValue)"
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
            v-if="isAvailable && isSecondMaxButtonAvailable"
            class="el-button--max s-typography-button--small"
            type="primary"
            alternative
            size="mini"
            border-radius="mini"
            @click="handleMaxValue(secondToken, setSecondTokenValue)"
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
        @click="handleCreatePair"
      >
        <template v-if="!areTokensSelected">
          {{ t('buttons.chooseTokens') }}
        </template>
        <template v-else-if="!isAvailable">
          {{ t('createPair.alreadyCreated') }}
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
    </s-form>

    <template v-if="areTokensSelected && isAvailable">
      <div v-if="isEmptyBalance" class="info-line-container">
        <p class="info-line-container__title">{{ t('createPair.firstLiquidityProvider') }}</p>
        <info-line>
          <template #info-line-prefix>
            <p class="info-line--first-liquidity" v-html="t('createPair.firstLiquidityProviderInfo')" />
          </template>
        </info-line>
      </div>
      <create-pair-transaction-details v-else :info-only="false" />
    </template>

    <select-token
      :visible.sync="showSelectSecondTokenDialog"
      :connected="isLoggedIn"
      :asset="firstToken"
      @select="selectSecondTokenAddress($event.address)"
    />

    <confirm-token-pair-dialog
      :visible.sync="showConfirmDialog"
      :parent-loading="parentLoading"
      :first-token="firstToken"
      :second-token="secondToken"
      :first-token-value="firstTokenValue"
      :second-token-value="secondTokenValue"
      :price="price"
      :price-reversed="priceReversed"
      :slippage-tolerance="slippageTolerance"
      @confirm="confirmCreatePair"
    />

    <network-fee-warning-dialog
      :visible.sync="showWarningFeeDialog"
      :fee="formattedFee"
      @confirm="confirmNetworkFeeWariningDialog"
    />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { FPNumber, Operation } from '@sora-substrate/util';
import { XOR } from '@sora-substrate/util/build/assets/consts';

import TokenPairMixinInstance from '@/components/mixins/TokenPairMixin';
import NetworkFeeDialogMixin from '@/components/mixins/NetworkFeeDialogMixin';
import { TokenPairNamespace } from '@/components/mixins/BaseTokenPairMixin';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { action } from '@/store/decorators';

const namespace = TokenPairNamespace.CreatePair;

const TokenPairMixin = TokenPairMixinInstance(namespace);

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    SelectToken: lazyComponent(Components.SelectToken),
    TokenLogo: lazyComponent(Components.TokenLogo),
    SlippageTolerance: lazyComponent(Components.SlippageTolerance),
    ConfirmTokenPairDialog: lazyComponent(Components.ConfirmTokenPairDialog),
    NetworkFeeWarningDialog: lazyComponent(Components.NetworkFeeWarningDialog),
    CreatePairTransactionDetails: lazyComponent(Components.CreatePairTransactionDetails),
    TokenSelectButton: lazyComponent(Components.TokenSelectButton),
    FormattedAmount: components.FormattedAmount,
    FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue,
    InfoLine: components.InfoLine,
    TokenAddress: components.TokenAddress,
  },
})
export default class CreatePair extends Mixins(mixins.NetworkFeeWarningMixin, TokenPairMixin, NetworkFeeDialogMixin) {
  @action.createPair.createPair private createPair!: AsyncVoidFn;

  readonly delimiters = FPNumber.DELIMITERS_CONFIG;

  get formattedFirstTokenValue(): string {
    return this.formatStringValue(this.firstTokenValue.toString());
  }

  get formattedSecondTokenValue(): string {
    return this.formatStringValue(this.secondTokenValue.toString());
  }

  get isXorSufficientForNextOperation(): boolean {
    return this.isXorSufficientForNextTx({
      type: Operation.CreatePair,
      amount: this.getFPNumber(this.firstTokenValue),
    });
  }

  async created(): Promise<void> {
    await this.withParentLoading(async () => {
      await this.setFirstTokenAddress(XOR.address);
    });
  }

  async handleCreatePair(): Promise<void> {
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

  confirmCreatePair(): Promise<void> {
    return this.handleConfirm(this.createPair);
  }
}
</script>

<style lang="scss" scoped>
.info-line--first-liquidity {
  color: var(--s-color-base-content-secondary);
  font-size: var(--s-font-size-mini);
}

.el-form--actions {
  @include buttons;
  @include full-width-button('action-button');
}

@include vertical-divider;
@include vertical-divider('el-divider');
</style>
