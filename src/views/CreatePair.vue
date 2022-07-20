<template>
  <div v-loading="parentLoading" class="container">
    <generic-page-header
      has-button-back
      :title="t('createPair.title')"
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
        @max="handleAddLiquidityMaxValue($event, setSecondTokenValue)"
        @select="openSelectSecondTokenDialog"
      />

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
    SlippageTolerance: lazyComponent(Components.SlippageTolerance),
    ConfirmTokenPairDialog: lazyComponent(Components.ConfirmTokenPairDialog),
    NetworkFeeWarningDialog: lazyComponent(Components.NetworkFeeWarningDialog),
    CreatePairTransactionDetails: lazyComponent(Components.CreatePairTransactionDetails),
    TokenInput: lazyComponent(Components.TokenInput),
    InfoLine: components.InfoLine,
  },
})
export default class CreatePair extends Mixins(mixins.NetworkFeeWarningMixin, TokenPairMixin, NetworkFeeDialogMixin) {
  @action.createPair.createPair private createPair!: AsyncVoidFn;

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
  @include full-width-button('action-button');
}

@include vertical-divider;
@include vertical-divider('el-divider');
</style>
