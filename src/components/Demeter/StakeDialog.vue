<template>
  <dialog-base :visible.sync="isVisible" :title="title">
    <div class="stake-dialog">
      <s-row v-if="baseAsset && poolAsset" flex align="middle">
        <pair-token-logo :first-token="baseAsset" :second-token="poolAsset" />
        <span class="stake-dialog-title">{{ baseAsset.symbol }}-{{ poolAsset.symbol }}</span>
      </s-row>

      <div v-if="isAdding" class="stake-dialog-info">
        <info-line
          v-if="hasStake"
          value-can-be-hidden
          :label="t('demeterFarming.info.poolShareStaked')"
          :value="poolShareStakedFormatted"
        />
        <info-line label="APR" value="100%" />
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

      <info-line
        v-if="hasStake"
        :label="t('demeterFarming.info.poolShareStakedWillBe')"
        :value="poolShareAfterFormatted"
      />
      <info-line v-if="isAdding" :label="t('demeterFarming.info.fee')" :value="feePercent" />
      <info-line
        :label="t('networkFeeText')"
        :label-tooltip="t('networkFeeTooltipText')"
        :value="formattedNetworkFee"
        :asset-symbol="xorSymbol"
        :fiat-value="getFiatAmountByCodecString(networkFee)"
        is-formatted
      />

      <s-button type="primary" class="s-typography-button--large action-button" @click="handleConfirm">Confirm</s-button>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { components } from '@soramitsu/soraneo-wallet-web';
import { FPNumber, Operation } from '@sora-substrate/util';
import { XOR } from '@sora-substrate/util/build/assets/consts';

import PoolInfoMixin from './PoolInfoMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import DialogMixin from '@/components/mixins/DialogMixin';
import DialogBase from '@/components/DialogBase.vue';
import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { state } from '@/store/decorators';

import type { NetworkFeesObject } from '@sora-substrate/util';
import type { DemeterLiquidityParams } from '@/store/demeterFarming/types';

@Component({
  components: {
    DialogBase,
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    InfoLine: components.InfoLine,
  },
})
export default class StakeDialog extends Mixins(PoolInfoMixin, TranslationMixin, DialogMixin) {
  @Prop({ default: () => true, type: Boolean }) readonly isAdding!: boolean;

  @state.wallet.settings.networkFees networkFees!: NetworkFeesObject;

  value = 0;

  get xorSymbol(): string {
    return XOR.symbol;
  }

  get networkFee(): string {
    const operation = this.isAdding
      ? Operation.DemeterFarmingDepositLiquidity
      : Operation.DemeterFarmingWithdrawLiquidity;

    return this.networkFees[operation];
  }

  get formattedNetworkFee(): string {
    return this.formatCodecNumber(this.networkFee);
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

  get poolShareAfter(): FPNumber {
    const val = new FPNumber(this.value).div(FPNumber.HUNDRED);

    return this.isAdding
      ? this.poolShareStaked.add(FPNumber.HUNDRED.sub(this.poolShareStaked).mul(val))
      : this.poolShareStaked.mul(FPNumber.ONE.sub(val));
  }

  get poolShareAfterFormatted(): string {
    return this.poolShareAfter.toLocaleString() + '%';
  }

  handleValue(value: string): void {
    this.value = parseFloat(value) || 0;
  }

  handleConfirm(): void {
    const params: DemeterLiquidityParams = {
      pool: this.pool,
      accountPool: this.accountPool,
      liquidity: this.liquidity,
      value: this.value,
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
