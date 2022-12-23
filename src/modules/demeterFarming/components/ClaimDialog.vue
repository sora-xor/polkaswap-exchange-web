<template>
  <dialog-base :visible.sync="isVisible" :title="t('demeterFarming.actions.claim')">
    <div class="claim-dialog">
      <div class="claim-dialog-title">
        <token-logo class="claim-dialog-logo" :token="rewardAsset" size="large" />

        <formatted-amount
          value-can-be-hidden
          symbol-as-decimal
          :value="rewardsFormatted"
          :font-size-rate="FontSizeRate.SMALL"
          :asset-symbol="rewardAssetSymbol"
          class="claim-dialog-value"
        />
        <formatted-amount
          value-can-be-hidden
          is-fiat-value
          :value="rewardsFiat"
          :font-size-rate="FontSizeRate.MEDIUM"
          class="claim-dialog-value--fiat"
        />
      </div>

      <div class="claim-dialog-info">
        <info-line
          :label="t('networkFeeText')"
          :label-tooltip="t('networkFeeTooltipText')"
          :value="formattedNetworkFee"
          :asset-symbol="xorSymbol"
          :fiat-value="getFiatAmountByCodecString(networkFee)"
          is-formatted
        />
      </div>

      <s-button
        type="primary"
        class="s-typography-button--large action-button"
        :loading="parentLoading"
        :disabled="isInsufficientXorForFee"
        @click="confirm"
      >
        <template v-if="isInsufficientXorForFee">
          {{ t('insufficientBalanceText', { tokenSymbol: xorSymbol }) }}
        </template>
        <template v-else>
          {{ t('signAndClaimText') }}
        </template>
      </s-button>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { components, mixins, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';

import PoolCardMixin from '../mixins/PoolCardMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component({
  components: {
    DialogBase: components.DialogBase,
    InfoLine: components.InfoLine,
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
  },
})
export default class ClaimDialog extends Mixins(
  PoolCardMixin,
  TranslationMixin,
  mixins.DialogMixin,
  mixins.LoadingMixin
) {
  readonly FontSizeRate = WALLET_CONSTS.FontSizeRate;

  confirm(): void {
    this.$emit('confirm', this.accountPool);
  }
}
</script>

<style lang="scss" scoped>
.claim-dialog {
  @include full-width-button('action-button');

  & > *:not(:last-child) {
    margin-top: $inner-spacing-medium;
  }

  &-logo {
    margin-bottom: $inner-spacing-mini;
  }

  &-title {
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
  }

  &-value {
    font-size: var(--s-font-size-large);
    font-weight: 700;
    line-height: var(--s-line-height-reset);
    letter-spacing: var(--s-letter-spacing-small);

    &--fiat {
      font-size: var(--s-font-size-big);
      font-weight: 600;
      line-height: var(--s-line-height-small);
    }
  }
}
</style>
