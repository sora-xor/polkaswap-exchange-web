<template>
  <div class="container" v-loading="parentLoading">
    <staking-header :previous-page="SoraStakingPageNames.Overview">
      {{ t('soraStaking.newStake.title') }}
    </staking-header>
    <s-form class="el-form--actions" :show-message="false">
      <token-input
        key="stake-input"
        :balance="stakingBalanceCodec"
        :is-max-available="isMaxButtonAvailable"
        :title="inputTitle"
        :token="stakingAsset"
        :value="value"
        @input="handleValue"
        @max="handleMaxValue"
      />
    </s-form>

    <div v-if="stakingAsset" class="min-stake-warning">
      <s-icon name="info-16" />
      <span>
        {{ t('soraStaking.newStake.minStakeWarning', { min: minNominatorBondFormatted, symbol: stakingAsset.symbol }) }}
      </span>
    </div>

    <s-button
      v-if="stakingAsset"
      type="primary"
      class="s-typography-button--large action-button"
      :loading="parentLoading"
      :disabled="isInsufficientXorForFee || valueFundsEmpty || isInsufficientBalance"
      @click="handleConfirm"
    >
      <template v-if="isInsufficientXorForFee">
        {{ t('insufficientBalanceText', { tokenSymbol: stakingAsset.symbol }) }}
      </template>
      <template v-else-if="isInsufficientBalance">
        {{ t('insufficientBalanceText', { tokenSymbol: stakingAsset.symbol }) }}
      </template>
      <template v-else-if="valueFundsEmpty">
        {{ t('buttons.enterAmount') }}
      </template>
      <template v-else>
        {{ t('confirmText') }}
      </template>
    </s-button>

    <info-line
      class="info-line"
      :label="t('networkFeeText')"
      :label-tooltip="t('networkFeeTooltipText')"
      :value="networkFeeFormatted"
      :asset-symbol="xor?.symbol"
      :fiat-value="getFiatAmountByCodecString(networkFee)"
      is-formatted
    />
  </div>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/util';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import { Components, ZeroStringValue } from '@/consts';
import router, { lazyComponent } from '@/router';
import { state } from '@/store/decorators';
import { getMaxValue } from '@/utils';

import { soraStakingLazyComponent } from '../../router';
import { SoraStakingComponents, SoraStakingPageNames } from '../consts';
import StakingMixin from '../mixins/StakingMixin';

import type { CodecString } from '@sora-substrate/util';

@Component({
  components: {
    TokenInput: lazyComponent(Components.TokenInput),
    InfoLine: components.InfoLine,
    StakingHeader: soraStakingLazyComponent(SoraStakingComponents.StakingHeader),
  },
})
export default class SoraStakingForm extends Mixins(StakingMixin, mixins.LoadingMixin) {
  @state.wallet.settings.shouldBalanceBeHidden private shouldBalanceBeHidden!: boolean;

  value = '';
  showValidatorsAttentionDialog = false;
  bondAndNominateNetworkFee: string | null = null;

  @Watch('selectedValidators', { immediate: true })
  async handleSelectedValidatorsChange() {
    this.withApi(async () => {
      this.bondAndNominateNetworkFee = await this.getBondAndNominateNetworkFee();
    });
  }

  async mounted() {
    this.selectValidators(this.validators);

    await this.$nextTick();
    const input: HTMLInputElement | null = this.$el.querySelector('.s-input .el-input__inner');
    input?.focus();
  }

  get networkFee(): CodecString {
    return this.bondAndNominateNetworkFee || '0';
  }

  get inputTitle(): string {
    return this.t('demeterFarming.amountAdd');
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
    if (this.shouldBalanceBeHidden) {
      return false; // MAX button behavior discloses hidden balance so it should be hidden in ANY case
    }
    if (!this.stakingAsset) return false;

    const fee = FPNumber.fromCodecValue(this.networkFee);
    const amount = this.stakingBalance.sub(fee);

    return !FPNumber.eq(this.valueFunds, amount) && !FPNumber.lte(amount, FPNumber.ZERO);
  }

  get maxStake(): string {
    if (!this.stakingAsset) return ZeroStringValue;

    return getMaxValue(this.stakingAsset, this.networkFee);
  }

  get isInsufficientBalance(): boolean {
    const availableBalance = new FPNumber(this.maxStake, this.stakingAsset?.decimals);

    return FPNumber.lt(availableBalance, this.valueFunds);
  }

  handleValue(value: string | number): void {
    this.value = String(value);
  }

  handleMaxValue(): void {
    this.handleValue(this.maxStake);
  }

  handleConfirm(): void {
    this.setStakeAmount(this.value);
    router.push({ name: SoraStakingPageNames.ValidatorsType });
  }
}
</script>

<style lang="scss" scoped>
.s-input.s-input--stake-part {
  @include input-slider;
}

.container {
  display: flex;
  width: 464px;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: $basic-spacing;
}

.min-stake-warning {
  display: flex;
  align-items: center;
  width: 100%;

  span {
    margin-left: 9px;
  }

  i,
  span {
    color: var(--s-color-status-info);
  }
}

.action-button {
  width: 100%;
}

.info-line {
  border-bottom: none !important;
}
</style>
