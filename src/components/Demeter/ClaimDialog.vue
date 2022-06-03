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

      <s-button type="primary" class="s-typography-button--large action-button">Sign and claim</s-button>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { components, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Operation } from '@sora-substrate/util';
import { XOR } from '@sora-substrate/util/build/assets/consts';

import { state } from '@/store/decorators';

import AccountPoolMixin from './mixins/AccountPoolMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import DialogMixin from '@/components/mixins/DialogMixin';
import DialogBase from '@/components/DialogBase.vue';

import type { NetworkFeesObject } from '@sora-substrate/util';

@Component({
  components: {
    DialogBase,
    InfoLine: components.InfoLine,
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
  },
})
export default class ClaimDialog extends Mixins(AccountPoolMixin, TranslationMixin, DialogMixin) {
  readonly FontSizeRate = WALLET_CONSTS.FontSizeRate;

  @state.wallet.settings.networkFees networkFees!: NetworkFeesObject;

  get xorSymbol(): string {
    return XOR.symbol;
  }

  get networkFee(): string {
    return this.networkFees[Operation.DemeterFarmingGetRewards];
  }

  get formattedNetworkFee(): string {
    return this.formatCodecNumber(this.networkFee);
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
    margin-bottom: $inner-spacing-medium;
  }

  &-title {
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
  }

  &-value {
    font-size: var(--s-font-size-large);
    line-height: var(--s-line-height-reset);
    letter-spacing: var(--s-letter-spacing-small);

    &--fiat {
      font-size: var(--s-font-size-big);
      line-height: var(--s-line-height-small);
    }
  }
}
</style>
