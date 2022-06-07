<template>
  <dialog-base :visible.sync="isVisible" :title="title">
    <div class="stake-dialog">
      <s-row v-if="baseAsset && poolAsset" flex align="middle">
        <pair-token-logo :first-token="baseAsset" :second-token="poolAsset" />
        <span class="stake-dialog-title">{{ baseAsset.symbol }}-{{ poolAsset.symbol }}</span>
      </s-row>

      <div v-if="isAdding" class="stake-dialog-info">
        <info-line v-if="hasStake" value-can-be-hidden :label="poolShareText" :value="poolShareFormatted" />
        <info-line label="APR" :value="aprFormatted" />
        <info-line :label="t('demeterFarming.info.totalLiquidityLocked')" :value="tvlFormatted" />
        <info-line :label="t('demeterFarming.info.rewardToken')" :value="rewardAssetSymbol" />
      </div>

      <s-form class="el-form--actions" :show-message="false">
        <s-float-input
          size="medium"
          :class="['s-input--stake-part', 's-input--token-value', valuePartCharClass]"
          :value="String(value)"
          :decimals="0"
          :max="100"
          @input="handleValue"
        >
          <div slot="top" class="amount">{{ t('removeLiquidity.amount') }}</div>
          <div slot="right"><span class="percent">%</span></div>
          <s-slider slot="bottom" class="slider-container" :value="value" :showTooltip="false" @change="handleValue" />
        </s-float-input>
      </s-form>

      <info-line v-if="!isFarm || hasStake" :label="poolShareAfterText" :value="poolShareAfterFormatted" />
      <info-line v-if="isAdding" :label="t('demeterFarming.info.fee')" :value="depositFeeFormatted" />
      <info-line
        :label="t('networkFeeText')"
        :label-tooltip="t('networkFeeTooltipText')"
        :value="formattedNetworkFee"
        :asset-symbol="xorSymbol"
        :fiat-value="getFiatAmountByCodecString(networkFee)"
        is-formatted
      />

      <s-button
        type="primary"
        class="s-typography-button--large action-button"
        :disabled="isInsufficientXorForFee"
        @click="handleConfirm"
      >
        <template v-if="isInsufficientXorForFee">
          {{ t('insufficientBalanceText', { tokenSymbol: xorSymbol }) }}
        </template>
        <template v-else>
          {{ t('confirmText') }}
        </template>
      </s-button>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { components } from '@soramitsu/soraneo-wallet-web';
import { FPNumber, Operation } from '@sora-substrate/util';

import PoolMixin from '../mixins/PoolMixin';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import DialogMixin from '@/components/mixins/DialogMixin';
import DialogBase from '@/components/DialogBase.vue';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { isXorAccountAsset } from '@/utils';

import type { DemeterLiquidityParams } from '@/store/demeterFarming/types';

@Component({
  components: {
    DialogBase,
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    InfoLine: components.InfoLine,
  },
})
export default class StakeDialog extends Mixins(PoolMixin, TranslationMixin, DialogMixin) {
  @Prop({ default: () => true, type: Boolean }) readonly isAdding!: boolean;

  value = 0;

  get networkFee(): string {
    const operation = this.isAdding
      ? Operation.DemeterFarmingDepositLiquidity
      : Operation.DemeterFarmingWithdrawLiquidity;

    return this.networkFees[operation];
  }

  get title(): string {
    const actionKey = this.isAdding ? (this.hasStake ? 'add' : 'start') : 'remove';

    return this.t(`demeterFarming.actions.${actionKey}`);
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

  get poolShareAfter(): FPNumber {
    if (this.isAdding) {
      const depositFee = new FPNumber(this.depositFee);
      const feeFromValue = this.valueFunds.mul(depositFee);
      const fundsAfter = this.lockedFunds.add(this.valueFunds.sub(feeFromValue));

      return this.isFarm ? fundsAfter.div(this.funds.sub(feeFromValue)).mul(FPNumber.HUNDRED) : fundsAfter;
    } else {
      const fundsAfter = this.lockedFunds.sub(this.valueFunds);

      return this.isFarm ? fundsAfter.div(this.funds).mul(FPNumber.HUNDRED) : fundsAfter;
    }
  }

  get poolShareAfterFormatted(): string {
    return this.poolShareAfter.toLocaleString() + (this.isFarm ? '%' : '');
  }

  get poolShareAfterText(): string {
    return this.isFarm
      ? this.t('demeterFarming.info.poolShareWillBe')
      : this.t('demeterFarming.info.stakeWillBe', { symbol: this.poolAssetSymbol });
  }

  get valueFunds(): FPNumber {
    if (!this.poolAsset) return FPNumber.ZERO;

    if (this.isAdding) {
      const fee = FPNumber.fromCodecValue(this.networkFee);
      const amount = isXorAccountAsset(this.poolAsset) ? this.availableFunds.sub(fee) : this.availableFunds;

      return amount.mul(this.part);
    } else {
      return this.lockedFunds.mul(this.part);
    }
  }

  handleValue(value: string): void {
    this.value = parseFloat(value) || 0;
  }

  handleConfirm(): void {
    const params: DemeterLiquidityParams = {
      pool: this.pool,
      accountPool: this.accountPool,
      value: this.valueFunds,
    };

    const event = this.isAdding ? 'add' : 'remove';

    this.$emit(event, params);
  }
}
</script>

<style lang="scss" scoped>
.el-form--actions {
  @include buttons;
}

.stake-dialog {
  @include full-width-button('action-button');

  & > *:not(:last-child) {
    margin-top: $inner-spacing-medium;
  }

  &-title {
    font-size: var(--s-heading2-font-size);
    font-weight: 800;
  }
}
</style>

<style lang="scss">
.s-input.s-input--stake-part {
  @include input-slider;
}
</style>
