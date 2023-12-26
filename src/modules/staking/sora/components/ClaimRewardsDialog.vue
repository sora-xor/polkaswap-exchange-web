<template>
  <dialog-base :visible.sync="isVisible" :title="title">
    <div class="claim-rewards-dialog">
      <s-form class="el-form--actions" :show-message="false">
        <token-input
          key="stake-input"
          :balance="rewardedFundsCodec"
          :title="inputTitle"
          :token="rewardAsset"
          :value="rewardedFundsFormatted"
          :disabled="true"
        />
      </s-form>

      <s-input v-model="payeeAddress" placeholder="Rewards destination" suffix="s-icon-basic-user-24"></s-input>

      <div class="info">
        <info-line
          v-if="stakingInitialized"
          :label="t('soraStaking.info.allRewards')"
          :value="rewardedFundsFormatted"
          :asset-symbol="rewardAsset?.symbol"
          :fiat-value="rewardedFundsFiat"
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
      <div class="check-pending-rewards" @click="checkPendingRewards">
        Check rewards per era and validator ({{ pendingRewards?.length ?? 0 }})
      </div>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/util';
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

  payeeAddress = '';
  payoutNetworkFee: string | null = null;

  @Watch('payee', { immediate: true })
  async handlePayeeChange() {
    switch (this.payee) {
      case 'stash':
        this.payeeAddress = this.stash;
        break;
      case 'controller':
        this.payeeAddress = this.controller;
        break;
      default:
        break;
    }
  }

  @Watch('pendingRewards', { immediate: true })
  async handlePendingRewardsChange() {
    this.payoutNetworkFee = await this.getPayoutNetworkFee({
      payouts: this.pendingRewards
        ? this.pendingRewards.map((r) => ({ era: r.era, validators: r.validators.map((v) => v.address) }))
        : [],
    });
  }

  get networkFee() {
    return this.payoutNetworkFee || '0';
  }

  get title(): string {
    return 'Claim rewards';
  }

  get inputTitle(): string {
    return this.title;
  }

  get rewardedFundsCodec(): CodecString {
    return this.rewardedFunds.toCodecString();
  }

  get part(): FPNumber {
    return this.rewardedFunds.div(FPNumber.HUNDRED);
  }

  get valueFundsEmpty(): boolean {
    return this.rewardedFunds.isZero();
  }

  get stakingBalance(): FPNumber {
    return this.availableFunds;
  }

  get stakingBalanceCodec(): CodecString {
    return this.stakingBalance.toCodecString();
  }

  get isInsufficientBalance(): boolean {
    return FPNumber.lt(this.rewardedFunds, this.rewardedFunds);
  }

  get selectedValidatorsFormatted(): string {
    return `${this.selectedValidators.length} (MAX: ${this.validators.length})`;
  }

  async handleConfirm(): Promise<void> {
    await this.payout({
      payouts: this.pendingRewards
        ? this.pendingRewards.map((r) => ({ era: r.era, validators: r.validators.map((v) => v.address) }))
        : [],
      payee: this.payeeAddress,
    });

    await this.getPendingRewards();

    this.closeDialog();
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
