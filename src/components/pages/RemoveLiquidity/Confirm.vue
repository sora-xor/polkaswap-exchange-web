<template>
  <dialog-base :visible.sync="isVisible" :title="t('removeLiquidity.confirmTitle')">
    <div class="tokens">
      <div class="tokens-info-container">
        <span class="token-value">{{ formattedFromValue }}</span>
        <s-icon class="icon-divider" name="plus-16" />
        <span class="token-value">{{ formattedToValue }}</span>
      </div>
      <div class="tokens-info-container">
        <div v-if="firstToken" class="token">
          <token-logo class="token-logo" :token="firstToken" />
          {{ firstToken.symbol }}
        </div>
        <div v-if="secondToken" class="token">
          <token-logo class="token-logo" :token="secondToken" />
          {{ secondToken.symbol }}
        </div>
      </div>
    </div>
    <p class="transaction-message">
      {{ t('removeLiquidity.outputMessage', { slippageTolerance: formatStringValue(slippageTolerance) }) }}
    </p>
    <s-divider />
    <remove-liquidity-transaction-details />
    <template #footer>
      <account-confirmation-option with-hint class="confirmation-option" />
      <s-button
        type="primary"
        class="s-typography-button--large"
        :loading="parentLoading"
        @click="handleConfirmRemoveLiquidity"
      >
        {{ t('exchange.confirm') }}
      </s-button>
    </template>
  </dialog-base>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { state, getter } from '@/store/decorators';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';

@Component({
  components: {
    DialogBase: components.DialogBase,
    TokenLogo: components.TokenLogo,
    AccountConfirmationOption: components.AccountConfirmationOption,
    RemoveLiquidityTransactionDetails: lazyComponent(Components.RemoveLiquidityTransactionDetails),
  },
})
export default class ConfirmRemoveLiquidity extends Mixins(
  mixins.NumberFormatterMixin,
  TranslationMixin,
  mixins.DialogMixin,
  mixins.LoadingMixin
) {
  @state.removeLiquidity.liquidityAmount private liquidityAmount!: string;
  @state.removeLiquidity.firstTokenAmount private firstTokenAmount!: string;
  @state.removeLiquidity.secondTokenAmount private secondTokenAmount!: string;

  @getter.removeLiquidity.firstToken firstToken!: Asset;
  @getter.removeLiquidity.secondToken secondToken!: Asset;

  @state.settings.slippageTolerance slippageTolerance!: string;

  get formattedFromValue(): string {
    return this.formatStringValue(this.firstTokenAmount);
  }

  get formattedToValue(): string {
    return this.formatStringValue(this.secondTokenAmount);
  }

  get formattedLiquidityValue(): string {
    return this.formatStringValue(this.liquidityAmount);
  }

  handleConfirmRemoveLiquidity(): void {
    this.$emit('confirm');
    this.closeDialog();
  }
}
</script>

<style lang="scss" scoped>
.tokens {
  display: flex;
  justify-content: space-between;
  font-size: var(--s-heading2-font-size);
  line-height: var(--s-line-height-small);
  &-info-container {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    font-weight: 800;
  }
}
.token {
  display: flex;
  align-items: center;
  white-space: nowrap;
  justify-content: flex-end;
  &-logo {
    display: block;
    margin-right: $inner-spacing-medium;
    flex-shrink: 0;
  }
}
.transaction-message {
  margin-top: $inner-spacing-big;
  color: var(--s-color-base-content-primary);
  line-height: var(--s-line-height-base);
}
.confirmation-option {
  margin-bottom: $inner-spacing-medium;
}
@include vertical-divider;
@include vertical-divider('el-divider');
</style>
