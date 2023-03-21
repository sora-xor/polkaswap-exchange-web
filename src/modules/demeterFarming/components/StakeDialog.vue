<template>
  <dialog-base :visible.sync="isVisible" :title="title">
    <div class="stake-dialog">
      <s-row v-if="poolAsset" flex align="middle">
        <pair-token-logo
          v-if="baseAsset"
          key="pair"
          :first-token="baseAsset"
          :second-token="poolAsset"
          class="title-logo"
        />
        <token-logo v-else key="token" :token="poolAsset" class="title-logo" />
        <span class="stake-dialog-title">
          <template v-if="baseAsset">{{ baseAsset.symbol }}-</template>{{ poolAsset.symbol }}
        </span>
      </s-row>

      <div v-if="isAdding" class="stake-dialog-info">
        <template v-if="pricesAvailable">
          <info-line :label="TranslationConsts.APR" :value="apr" />
          <info-line :label="t('demeterFarming.info.totalLiquidityLocked')" :value="tvl" />
        </template>
        <info-line :label="t('demeterFarming.info.rewardToken')" :value="rewardAssetSymbol" />
      </div>

      <s-form class="el-form--actions" :show-message="false">
        <s-float-input
          v-if="isFarm"
          key="farm-input"
          size="medium"
          :class="['s-input--stake-part', 's-input--token-value', valuePartCharClass]"
          :value="value"
          :decimals="0"
          :max="100"
          @input="handleValue"
        >
          <div slot="top" class="amount">{{ inputTitle }}</div>
          <div slot="right" class="el-buttons el-buttons--between">
            <span class="percent">%</span>
            <s-button
              v-if="isMaxButtonAvailable"
              class="el-button--max s-typography-button--small"
              type="primary"
              alternative
              size="mini"
              border-radius="mini"
              @click.stop="handleValue(100)"
            >
              {{ t('buttons.max') }}
            </s-button>
          </div>
          <s-slider
            slot="bottom"
            class="slider-container"
            :value="Number(value)"
            :show-tooltip="false"
            @input="handleValue"
          />
        </s-float-input>

        <token-input
          v-else
          key="stake-input"
          :balance="stakingBalanceCodec"
          :is-max-available="isMaxButtonAvailable"
          :title="inputTitle"
          :token="poolAsset"
          :value="value"
          @input="handleValue"
          @max="handleMaxValue"
        />
      </s-form>

      <info-line
        v-if="hasStake"
        value-can-be-hidden
        :label="poolShareText"
        :value="poolShareFormatted"
        :fiat-value="poolShareFiat"
      />
      <info-line
        value-can-be-hidden
        :label="poolShareAfterText"
        :value="poolShareAfterFormatted"
        :fiat-value="poolShareAfterFiat"
      />
      <info-line
        v-if="isAdding"
        :label="t('demeterFarming.info.fee')"
        :label-tooltip="t('demeterFarming.info.feeTooltip')"
        :value="depositFeeFormatted"
      />
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
        :loading="parentLoading"
        :disabled="isInsufficientXorForFee || valueFundsEmpty || isInsufficientBalance"
        @click="handleConfirm"
      >
        <template v-if="isInsufficientXorForFee">
          {{ t('insufficientBalanceText', { tokenSymbol: xorSymbol }) }}
        </template>
        <template v-else-if="isInsufficientBalance">
          {{ t('insufficientBalanceText', { tokenSymbol: poolAssetSymbol }) }}
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
import { Component, Mixins, Watch, Prop } from 'vue-property-decorator';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { FPNumber, Operation } from '@sora-substrate/util';

import PoolCardMixin from '../mixins/PoolCardMixin';

import { lazyComponent } from '@/router';
import { Components, ZeroStringValue } from '@/consts';
import { getMaxValue, isXorAccountAsset } from '@/utils';

import type { CodecString } from '@sora-substrate/util';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';
import type { DemeterLiquidityParams } from '@/store/demeterFarming/types';

@Component({
  components: {
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    TokenInput: lazyComponent(Components.TokenInput),
    DialogBase: components.DialogBase,
    InfoLine: components.InfoLine,
    TokenLogo: components.TokenLogo,
  },
})
export default class StakeDialog extends Mixins(PoolCardMixin, mixins.DialogMixin, mixins.LoadingMixin) {
  @Prop({ default: () => true, type: Boolean }) readonly isAdding!: boolean;

  @Watch('visible')
  private resetValue() {
    this.value = '';
  }

  value = '';

  get networkFee(): CodecString {
    const operation = this.isAdding
      ? Operation.DemeterFarmingDepositLiquidity
      : Operation.DemeterFarmingWithdrawLiquidity;

    return this.networkFees[operation];
  }

  get title(): string {
    const actionKey = this.isAdding ? (this.hasStake ? 'add' : 'start') : 'remove';

    return this.t(`demeterFarming.actions.${actionKey}`);
  }

  get inputTitle(): string {
    const key = this.isAdding ? 'amountAdd' : 'amountRemove';

    return this.t(`demeterFarming.${key}`);
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
      const funds = FPNumber.max(this.lockedFunds, this.funds) as FPNumber;
      const fundsAfter = FPNumber.max(this.lockedFunds.sub(this.valueFunds), FPNumber.ZERO) as FPNumber;

      return this.isFarm ? fundsAfter.div(funds).mul(FPNumber.HUNDRED) : fundsAfter;
    }
  }

  get poolShareAfterFiat(): Nullable<string> {
    if (this.isFarm || !this.poolAsset) return null;

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

  get valueFundsEmpty(): boolean {
    return this.valueFunds.isZero();
  }

  get stakingBalance(): FPNumber {
    return this.isAdding ? this.availableFunds : this.lockedFunds;
  }

  get stakingBalanceCodec(): CodecString {
    return this.stakingBalance.toCodecString();
  }

  get isMaxButtonAvailable(): boolean {
    if (!this.poolAsset) return false;

    const fee = FPNumber.fromCodecValue(this.networkFee);
    const amount =
      this.isAdding && isXorAccountAsset(this.poolAsset) ? this.stakingBalance.sub(fee) : this.stakingBalance;

    return !FPNumber.eq(this.valueFunds, amount);
  }

  get maxStake(): string {
    if (!this.poolAsset) return ZeroStringValue;

    return this.isAdding ? getMaxValue(this.poolAsset, this.networkFee) : this.lockedFunds.toString();
  }

  get isInsufficientBalance(): boolean {
    if (this.isFarm) return false;

    const availableBalance = new FPNumber(this.maxStake, this.poolAsset?.decimals);

    return FPNumber.lt(availableBalance, this.valueFunds);
  }

  handleValue(value: string): void {
    this.value = String(value);
  }

  handleMaxValue(): void {
    this.handleValue(this.maxStake);
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
.stake-dialog {
  @include full-width-button('action-button');

  padding-bottom: $inner-spacing-medium;

  & > *:not(:first-child) {
    margin-top: $inner-spacing-medium;
  }

  &-title {
    font-size: var(--s-heading2-font-size);
    font-weight: 800;
  }

  .title-logo {
    margin-right: $inner-spacing-mini;
  }
}

.el-form--actions {
  @include buttons;
}
</style>

<style lang="scss">
.s-input.s-input--stake-part {
  @include input-slider;
}
</style>
