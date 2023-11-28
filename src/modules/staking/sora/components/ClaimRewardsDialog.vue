<template>
  <dialog-base :visible.sync="isVisible" :title="title">
    <div class="claim-rewards-dialog">
      <s-form class="el-form--actions" :show-message="false">
        <token-input
          key="stake-input"
          :balance="redeemableFundsCodec"
          :is-max-available="isMaxButtonAvailable"
          :title="inputTitle"
          :token="rewardAsset"
          :value="value"
          @input="handleValue"
          @max="handleMaxValue"
        />
      </s-form>

      <s-input v-model="payeeAddress" placeholder="Rewards destination" suffix="s-icon-basic-user-24"></s-input>

      <div class="info">
        <info-line
          v-if="stakingInitialized"
          :label="t('soraStaking.info.redeemable')"
          :value="redeemableFundsFormatted"
          :asset-symbol="rewardAsset?.symbol"
          :fiat-value="redeemableFundsFiat"
        />
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
          {{ t('insufficientBalanceText', { tokenSymbol: rewardAsset?.symbol }) }}
        </template>
        <template v-else-if="valueFundsEmpty">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else>
          {{ t('confirmText') }}
        </template>
      </s-button>
      <div class="check-pending-rewards" @click="checkPendingRewards">Check pending rewards</div>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { FPNumber, Operation } from '@sora-substrate/util';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch, Prop } from 'vue-property-decorator';

import { Components } from '@/consts';
import { lazyComponent } from '@/router';

import StakingMixin from '../mixins/StakingMixin';

import type { CodecString } from '@sora-substrate/util';

@Component({
  components: {
    TokenInput: lazyComponent(Components.TokenInput),
    DialogBase: components.DialogBase,
    InfoLine: components.InfoLine,
  },
})
export default class ClaimRewardsDialog extends Mixins(StakingMixin, mixins.DialogMixin, mixins.LoadingMixin) {
  @Prop({ default: () => true, type: Boolean }) readonly isAdding!: boolean;

  @Watch('visible')
  private resetValue() {
    this.value = this.redeemableFunds.toString();
  }

  value = '';
  payeeAddress = '';

  get networkFee(): CodecString {
    return this.networkFees[Operation.StakingPayout];
  }

  get title(): string {
    return 'Claim rewards';
  }

  get inputTitle(): string {
    return this.title;
  }

  get redeemableFundsCodec(): CodecString {
    return this.redeemableFunds.toCodecString();
  }

  get valuePartCharClass(): string {
    const charClassName =
      {
        3: 'three',
        2: 'two',
      }[this.value.toString().length] ?? 'one';

    return `${charClassName}-char`;
  }

  get part(): FPNumber {
    return new FPNumber(this.value).div(FPNumber.HUNDRED);
  }

  get valueFunds(): FPNumber {
    return new FPNumber(this.value);
  }

  get valueFundsEmpty(): boolean {
    return this.valueFunds.isZero();
  }

  get stakingBalance(): FPNumber {
    return this.availableFunds;
  }

  get stakingBalanceCodec(): CodecString {
    return this.stakingBalance.toCodecString();
  }

  get isMaxButtonAvailable(): boolean {
    const fee = FPNumber.fromCodecValue(this.networkFee);
    const amount = this.redeemableFunds.sub(fee);

    return !FPNumber.eq(this.valueFunds, amount);
  }

  get isInsufficientBalance(): boolean {
    return FPNumber.lt(this.redeemableFunds, this.valueFunds);
  }

  get selectedValidatorsFormatted(): string {
    return `${this.selectedValidators.length} (MAX: ${this.validators.length})`;
  }

  handleValue(value: string | number): void {
    this.value = String(value);
  }

  handleMaxValue(): void {
    this.handleValue(this.redeemableFunds.toString());
  }

  async handleConfirm(): Promise<void> {
    await this.withdraw(Number(this.value));
  }

  checkPendingRewards(): void {
    this.$emit('show-rewards');
  }
}
</script>

<style lang="scss">
.s-input.s-input--stake-part {
  @include input-slider;
}
</style>

<style lang="scss" scoped>
.claim-rewards-dialog {
  @include full-width-button('action-button');

  & > *:not(:first-child) {
    margin-top: $inner-spacing-medium;
  }
}

.el-form--actions {
  @include buttons;
}

.info {
  margin-top: 16px;
}

.check-pending-rewards {
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
