<template>
  <dialog-base :visible.sync="isVisible" :title="title">
    <div class="redeem-dialog">
      <div class="reward">
        <formatted-amount-with-fiat-value
          class="reward-amount"
          symbol-as-decimal
          value-can-be-hidden
          :value="redeemableFundsFormatted"
          :fiat-value="redeemableFundsFiat"
        />
        <template v-if="stakingAsset">
          <token-logo class="reward-logo" :tokenSymbol="stakingAsset.symbol" />
          <span class="reward-symbol">
            {{ stakingAsset.symbol }}
          </span>
        </template>
      </div>

      <div class="info">
        <info-line
          :label="t('networkFeeText')"
          :label-tooltip="t('networkFeeTooltipText')"
          :value="networkFeeFormatted"
          :asset-symbol="xor?.symbol"
          :fiat-value="getFiatAmountByCodecString(networkFee)"
          is-formatted
        />
      </div>

      <s-button
        type="primary"
        class="s-typography-button--large action-button"
        :loading="parentLoading"
        :disabled="isInsufficientXorForFee || valueFundsEmpty || isInsufficientBalance"
        @click="handleConfirm"
      >
        <template v-if="isInsufficientXorForFee || isInsufficientBalance">
          <template v-if="isInsufficientBalance">
            {{ t('insufficientBalanceText', { tokenSymbol: rewardAsset?.symbol }) }}
          </template>
          <template v-if="isInsufficientXorForFee">
            {{ t('insufficientBalanceText', { tokenSymbol: xor?.symbol }) }}
          </template>
        </template>
        <template v-else-if="valueFundsEmpty">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else>
          {{ t('confirmText') }}
        </template>
      </s-button>
      <div class="check-upcoming-redeems" @click="checkUpcomingRedeems">
        {{ t('soraStaking.redeemDialog.checkUpcomingRedeems') }} ({{ accountLedger?.unlocking?.length ?? 0 }})
      </div>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { FPNumber, Operation } from '@sora-substrate/util';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch, Prop } from 'vue-property-decorator';

import StakingMixin from '../mixins/StakingMixin';

import type { CodecString } from '@sora-substrate/util';

@Component({
  components: {
    FormattedAmount: components.FormattedAmount,
    DialogBase: components.DialogBase,
    InfoLine: components.InfoLine,
    TokenLogo: components.TokenLogo,
    FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue,
  },
})
export default class RedeemDialog extends Mixins(StakingMixin, mixins.DialogMixin, mixins.LoadingMixin) {
  get networkFee(): CodecString {
    return this.networkFees[Operation.StakingWithdrawUnbonded];
  }

  get title(): string {
    return this.t('soraStaking.redeemDialog.title');
  }

  get valueFundsEmpty(): boolean {
    return this.redeemableFunds.isZero();
  }

  get isInsufficientBalance(): boolean {
    return FPNumber.lt(this.redeemableFunds, this.redeemableFunds);
  }

  get selectedValidatorsFormatted(): string {
    return `${this.selectedValidators.length} (M AX: ${this.validators.length})`;
  }

  get payouts() {
    if (!this.pendingRewards) return [];

    return this.pendingRewards.map((r) => ({
      era: r.era,
      validators: r.validators.map((v) => v.address),
    }));
  }

  async handleConfirm(): Promise<void> {
    await this.getPendingRewards();

    this.closeDialog();
  }

  checkUpcomingRedeems(): void {
    this.$emit('show-upcoming-redeems');
  }
}
</script>

<style lang="scss">
.redeem-dialog {
  .reward {
    .formatted-amount {
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .formatted-amount--fiat-value {
      font-size: 14px !important;
      font-weight: 600;
    }
  }
}
</style>

<style lang="scss" scoped>
.redeem-dialog {
  @include full-width-button('action-button');

  & > *:not(:first-child) {
    margin-top: $inner-spacing-medium;
  }
}

.reward {
  display: flex;
  width: 100%;
  font-size: 32px;
  font-weight: 700;

  &-amount {
    flex: 1;
    flex-direction: column;
    align-items: flex-start !important;
    text-align: left !important;
    overflow: hidden;
  }

  &-logo {
    margin-left: auto;
  }

  &-symbol {
    margin-left: 15px;
  }
}

.el-form--actions {
  @include buttons;
}

.info {
  margin-top: 16px;
}

.check-upcoming-redeems {
  color: var(--s-color-theme-accent);
  text-align: center;
  font-size: 14px;
  line-height: 20px;
  font-style: normal;
  font-weight: 700;
  text-transform: uppercase;
  cursor: pointer;
}
</style>
