<template>
  <dialog-base :visible.sync="isVisible" :title="title">
    <div class="withdraw-dialog">
      <div class="reward">
        <formatted-amount-with-fiat-value
          class="reward-amount"
          symbol-as-decimal
          value-can-be-hidden
          :value="withdrawableFundsFormatted"
          :fiat-value="withdrawableFundsFiat"
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
        :loading="parentLoading || loading"
        :disabled="isInsufficientXorForFee || valueFundsEmpty || isInsufficientBalance"
        @click="handleConfirm"
      >
        <template v-if="isInsufficientXorForFee || isInsufficientBalance">
          <template v-if="isInsufficientBalance">
            {{ t('buttons.enterAmount') }}
          </template>
          <template v-if="isInsufficientXorForFee">
            {{ t('insufficientBalanceText', { tokenSymbol: xor?.symbol }) }}
          </template>
        </template>
        <template v-else>
          {{ t('confirmText') }}
        </template>
      </s-button>
      <div v-button class="check-all-withdraws" @click="showAllWithdraws">
        {{ t('soraStaking.withdrawDialog.showAllWithdraws') }}
      </div>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Operation } from '@sora-substrate/util';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

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
export default class WithdrawDialog extends Mixins(StakingMixin, mixins.DialogMixin, mixins.TransactionMixin) {
  get networkFee(): CodecString {
    return this.networkFees[Operation.StakingWithdrawUnbonded];
  }

  get title(): string {
    return this.t('soraStaking.withdrawDialog.title');
  }

  get valueFundsEmpty(): boolean {
    return this.withdrawableFunds.isZero();
  }

  get isInsufficientBalance(): boolean {
    return this.withdrawableFunds.isZero();
  }

  get selectedValidatorsFormatted(): string {
    return this.t('soraStaking.selectedValidators', {
      count: this.selectedValidators.length,
      max: this.validators.length,
    });
  }

  async handleConfirm(): Promise<void> {
    try {
      await this.withNotifications(async () => await this.withdraw(this.withdrawableFunds.toNumber()));
    } finally {
      this.closeDialog();
    }
  }

  showAllWithdraws(): void {
    this.$emit('show-all-withdraws');
  }
}
</script>

<style lang="scss">
.withdraw-dialog {
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
.withdraw-dialog {
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

.check-all-withdraws {
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
