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
          :label="poolShareText"
          :value="poolShareFormatted"
          :fiat-value="poolShareFiat"
        />
        <info-line label="APR" :value="aprFormatted" />
        <info-line :label="t('demeterFarming.info.totalLiquidityLocked')" :value="tvlFormatted" />
        <info-line :label="t('demeterFarming.info.rewardToken')" :value="rewardAssetSymbol" />
      </div>

      <s-form class="el-form--actions" :show-message="false">
        <s-float-input
          v-if="isFarm"
          size="medium"
          :class="['s-input--stake-part', 's-input--token-value', valuePartCharClass]"
          :value="value"
          :decimals="0"
          :max="100"
          @input="handleValue"
        >
          <div slot="top" class="amount">{{ t('amountText') }}</div>
          <div slot="right"><span class="percent">%</span></div>
          <s-slider
            slot="bottom"
            class="slider-container"
            :value="Number(value)"
            :showTooltip="false"
            @change="handleValue"
          />
        </s-float-input>

        <s-float-input
          v-else
          class="s-input--token-value"
          size="medium"
          :value="value"
          :decimals="(poolAsset || {}).decimals"
          has-locale-string
          :delimiters="delimiters"
          :max="getMax((poolAsset || {}).address)"
          @input="handleValue"
        >
          <div slot="top" class="input-line">
            <div class="input-title">
              <span class="input-title--uppercase input-title--primary">{{ t('amountText') }}</span>
            </div>
            <div class="input-value">
              <span class="input-value--uppercase">{{ t('balanceText') }}</span>
              <formatted-amount-with-fiat-value
                value-can-be-hidden
                with-left-shift
                value-class="input-value--primary"
                :value="stakingBalanceFormatted"
                :fiat-value="stakingBalanceFiat"
              />
            </div>
          </div>
          <div slot="right" class="s-flex el-buttons">
            <s-button
              class="el-button--max s-typography-button--small"
              type="primary"
              alternative
              size="mini"
              border-radius="mini"
              @click="handleMaxValue"
            >
              {{ t('buttons.max') }}
            </s-button>
            <token-select-button class="el-button--select-token" :token="poolAsset" />
          </div>
          <div slot="bottom" class="input-line input-line--footer">
            <formatted-amount v-if="poolAsset" is-fiat-value :value="valueFiatAmount" />
            <token-address
              v-if="poolAsset"
              :name="poolAsset.name"
              :symbol="poolAsset.symbol"
              :address="poolAsset.address"
              class="input-value"
            />
          </div>
        </s-float-input>
      </s-form>

      <info-line
        value-can-be-hidden
        :label="poolShareAfterText"
        :value="poolShareAfterFormatted"
        :fiat-value="poolShareAfterFiat"
      />
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
        :disabled="isInsufficientXorForFee || valueFundsEmpty"
        @click="handleConfirm"
      >
        <template v-if="isInsufficientXorForFee">
          {{ t('insufficientBalanceText', { tokenSymbol: xorSymbol }) }}
        </template>
        <template v-else-if="valueFundsEmpty">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else>
          {{ t('confirmText') }}
        </template>
      </s-button>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator';
import { components } from '@soramitsu/soraneo-wallet-web';
import { FPNumber, Operation } from '@sora-substrate/util';

import PoolMixin from '../mixins/PoolMixin';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import DialogMixin from '@/components/mixins/DialogMixin';
import DialogBase from '@/components/DialogBase.vue';

import { lazyComponent } from '@/router';
import { Components, ZeroStringValue } from '@/consts';
import { isXorAccountAsset, getMaxValue } from '@/utils';

import type { AccountAsset } from '@sora-substrate/util/build/assets/types';
import type { DemeterLiquidityParams } from '@/store/demeterFarming/types';

@Component({
  components: {
    DialogBase,
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    TokenSelectButton: lazyComponent(Components.TokenSelectButton),
    InfoLine: components.InfoLine,
    FormattedAmount: components.FormattedAmount,
    FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue,
    TokenAddress: components.TokenAddress,
  },
})
export default class StakeDialog extends Mixins(PoolMixin, TranslationMixin, DialogMixin) {
  readonly delimiters = FPNumber.DELIMITERS_CONFIG;

  @Prop({ default: () => true, type: Boolean }) readonly isAdding!: boolean;

  @Watch('visible')
  private resetValue() {
    this.value = ZeroStringValue;
  }

  value = ZeroStringValue;

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
      const funds = FPNumber.max(this.lockedFunds, this.funds);
      const fundsAfter = this.lockedFunds.sub(this.valueFunds);

      return this.isFarm ? fundsAfter.div(funds).mul(FPNumber.HUNDRED) : fundsAfter;
    }
  }

  get poolShareAfterFiat(): Nullable<string> {
    if (this.isFarm) return null;

    return this.getFiatAmountByFPNumber(this.poolShareAfter, this.poolAsset as AccountAsset);
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

    if (!this.isFarm) return new FPNumber(this.value);

    if (this.isAdding) {
      const fee = FPNumber.fromCodecValue(this.networkFee);
      const amount = isXorAccountAsset(this.poolAsset) ? this.availableFunds.sub(fee) : this.availableFunds;

      return amount.mul(this.part);
    } else {
      return this.lockedFunds.mul(this.part);
    }
  }

  get valueFiatAmount(): Nullable<string> {
    return this.getFiatAmountByFPNumber(this.valueFunds, this.poolAsset as AccountAsset);
  }

  get valueFundsEmpty(): boolean {
    return this.valueFunds.isZero();
  }

  get stakingBalance(): FPNumber {
    return this.isAdding ? this.availableFunds : this.lockedFunds;
  }

  get stakingBalanceFormatted(): string {
    return this.stakingBalance.toLocaleString();
  }

  get stakingBalanceFiat(): string {
    return this.stakingBalance.mul(this.poolAssetPrice).toLocaleString();
  }

  handleValue(value: string): void {
    this.value = String(value);
  }

  handleMaxValue(): void {
    if (!this.poolAsset) return;

    const max = this.isAdding ? getMaxValue(this.poolAsset, this.networkFee) : this.lockedFunds.toString();

    this.handleValue(max);
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
