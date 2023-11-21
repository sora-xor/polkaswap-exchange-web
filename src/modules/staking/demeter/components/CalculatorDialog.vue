<template>
  <dialog-base :visible.sync="isVisible" :title="`${TranslationConsts.APR} ${t('demeterFarming.calculator')}`">
    <div class="calculator-dialog">
      <dialog-title :base-asset="baseAsset" :pool-asset="poolAsset" :is-farm="isFarm" />

      <s-form class="el-form--actions" :show-message="false">
        <template v-if="isFarm && baseAsset">
          <token-input
            :balance="baseAssetBalance.toCodecString()"
            :is-max-available="isBaseAssetMaxButtonAvailable"
            :title="t('demeterFarming.amountAdd')"
            :token="baseAsset"
            :value="baseAssetValue"
            @input="handleBaseAssetValue"
            @max="handleBaseAssetMax"
          />

          <s-icon v-if="poolAsset" class="icon-divider" name="plus-16" />
        </template>

        <token-input
          v-if="poolAsset"
          :balance="poolAssetBalance.toCodecString()"
          :is-max-available="isPoolAssetMaxButtonAvailable"
          :title="t('demeterFarming.amountAdd')"
          :token="poolAsset"
          :value="poolAssetValue"
          @input="handlePoolAssetValue"
          @max="handlePoolAssetMax"
        />
      </s-form>

      <div class="duration">
        <info-line label="Duration" class="duration-title" />
        <s-tabs type="rounded" :value="selectedPeriod" @input="selectPeriod" class="duration-tabs">
          <s-tab v-for="period in intervals" :key="period" :name="String(period)" :label="`${period}D`" />
        </s-tabs>
      </div>

      <div class="results">
        <div class="results-title">{{ TranslationConsts.APR }} {{ t('demeterFarming.results') }}</div>

        <info-line
          :label="TranslationConsts.ROI"
          :label-tooltip="t('tooltips.roi')"
          :value="calculatedRoiPercentFormatted"
        />
        <info-line :label="rewardsText" :value="calculatedRewardsFormatted" :fiat-value="calculatedRewardsFiat" />
      </div>

      <a :href="link" target="_blank" rel="nofollow noopener" class="demeter-copyright">
        {{ t('demeterFarming.poweredBy') }}
      </a>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { FPNumber, Operation } from '@sora-substrate/util';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch, Prop } from 'vue-property-decorator';

import { Components, Links } from '@/consts';
import { lazyComponent } from '@/router';
import { getAssetBalance, isMaxButtonAvailable, getMaxValue, formatDecimalPlaces } from '@/utils';

import { demeterStakingLazyComponent } from '../../router';
import { DemeterStakingComponents } from '../consts';
import PoolCardMixin from '../mixins/PoolCardMixin';

import type { CodecString } from '@sora-substrate/util';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    DialogTitle: demeterStakingLazyComponent(DemeterStakingComponents.DialogTitle),
    TokenInput: lazyComponent(Components.TokenInput),
    DialogBase: components.DialogBase,
    InfoLine: components.InfoLine,
  },
})
export default class CalculatorDialog extends Mixins(PoolCardMixin, mixins.DialogMixin, mixins.LoadingMixin) {
  @Prop({ default: () => FPNumber.ZERO, type: Object }) readonly emission!: FPNumber;

  @Watch('visible')
  private resetValue() {
    this.baseAssetValue = '';
    this.poolAssetValue = '';
  }

  baseAssetValue = '';
  poolAssetValue = '';

  readonly intervals = [1, 7, 30, 90];

  interval = 1;

  readonly link = Links.demeterFarmingPlatform;

  get networkFee(): CodecString {
    return this.networkFees[Operation.DemeterFarmingDepositLiquidity];
  }

  get selectedPeriod(): string {
    return String(this.interval);
  }

  get rewardsText(): string {
    return this.t('demeterFarming.rewards', { symbol: this.rewardAssetSymbol });
  }

  get baseAssetDecimals(): number {
    return this.baseAsset?.decimals ?? FPNumber.DEFAULT_PRECISION;
  }

  get baseAssetBalance(): FPNumber {
    if (!this.baseAsset) return FPNumber.ZERO;

    return FPNumber.fromCodecValue(getAssetBalance(this.baseAsset) ?? 0, this.baseAssetDecimals);
  }

  get isBaseAssetMaxButtonAvailable(): boolean {
    if (!this.baseAsset) return false;

    return isMaxButtonAvailable(this.baseAsset, this.baseAssetValue, this.networkFee, this.xor as AccountAsset);
  }

  get isPoolAssetMaxButtonAvailable(): boolean {
    if (!this.poolAsset) return false;

    return isMaxButtonAvailable(this.poolAsset, this.poolAssetValue, this.networkFee, this.xor as AccountAsset);
  }

  get userTokensDeposit(): FPNumber {
    return this.isFarm
      ? this.lpBalance
          .mul(new FPNumber(this.poolAssetValue || 0))
          .div(FPNumber.fromCodecValue(this.liquidity?.secondBalance ?? 0))
      : new FPNumber(this.poolAssetValue || 0);
  }

  get userTokensDepositWithFee(): FPNumber {
    const depositFee = new FPNumber(this.depositFee);

    return this.userTokensDeposit.mul(FPNumber.ONE.sub(depositFee));
  }

  get calculatedRewards(): FPNumber {
    if (!this.pool) return FPNumber.ZERO;

    const totalDeposit = this.pool.totalTokensInPool.add(this.userTokensDepositWithFee);

    if (totalDeposit.isZero()) return FPNumber.ZERO;

    const period = new FPNumber(this.interval);
    const blocksPerDay = new FPNumber(14_400);
    const blocksProduced = period.mul(blocksPerDay);

    return this.emission.mul(blocksProduced).mul(this.userTokensDepositWithFee).div(totalDeposit);
  }

  get calculatedRewardsFormatted(): string {
    return this.calculatedRewards.toLocaleString();
  }

  get calculatedRewardsFiat(): Nullable<string> {
    if (!this.rewardAsset) return null;

    return this.getFiatAmountByFPNumber(this.calculatedRewards, this.rewardAsset as AccountAsset);
  }

  get calculatedRoiPercent(): FPNumber {
    const depositInPoolsAsset = new FPNumber(this.poolAssetValue || 0);

    if (depositInPoolsAsset.isZero() || this.poolAssetPrice.isZero()) return FPNumber.ZERO;

    // for liquidity pool we multiply deposit in pool asset by 2
    const multiplier = this.isFarm ? 2 : 1;

    const valueOfDepositUSD = depositInPoolsAsset.mul(new FPNumber(multiplier)).mul(this.poolAssetPrice);

    const costOfDepositFeeUSD = valueOfDepositUSD.mul(new FPNumber(this.depositFee));

    const costOfNetworkFeeUSD = FPNumber.fromCodecValue(this.networkFee).mul(
      FPNumber.fromCodecValue(this.getAssetFiatPrice(this.xor as AccountAsset) ?? 0)
    );
    const costOfInvestmentUSD = costOfDepositFeeUSD.add(costOfNetworkFeeUSD);
    const valueOfInvestmentUSD = this.calculatedRewards.mul(this.rewardAssetPrice);

    return valueOfInvestmentUSD.sub(costOfInvestmentUSD).div(valueOfDepositUSD).mul(FPNumber.HUNDRED);
  }

  get calculatedRoiPercentFormatted(): string {
    return formatDecimalPlaces(this.calculatedRoiPercent, true);
  }

  selectPeriod(name: string): void {
    this.interval = Number(name);
  }

  handleBaseAssetValue(value: string): void {
    this.baseAssetValue = value;

    if (!value) {
      this.poolAssetValue = '';
    } else if (this.liquidity) {
      this.poolAssetValue = new FPNumber(this.baseAssetValue)
        .mul(FPNumber.fromCodecValue(this.liquidity?.secondBalance ?? 0))
        .div(FPNumber.fromCodecValue(this.liquidity?.firstBalance ?? 0))
        .toString();
    }
  }

  handlePoolAssetValue(value: string): void {
    this.poolAssetValue = value;

    if (!value) {
      this.baseAssetValue = '';
    } else if (this.liquidity) {
      this.baseAssetValue = new FPNumber(this.poolAssetValue)
        .mul(FPNumber.fromCodecValue(this.liquidity?.firstBalance ?? 0))
        .div(FPNumber.fromCodecValue(this.liquidity?.secondBalance ?? 0))
        .toString();
    }
  }

  handleBaseAssetMax(): void {
    if (!this.baseAsset) return;
    this.handleBaseAssetValue(getMaxValue(this.baseAsset, this.networkFee));
  }

  handlePoolAssetMax(): void {
    if (!this.poolAsset) return;
    this.handlePoolAssetValue(getMaxValue(this.poolAsset, this.networkFee));
  }
}
</script>

<style lang="scss">
.duration-title.info-line {
  border-bottom: none;
}
.duration-tabs.s-tabs {
  .el-tabs__header,
  .el-tabs__nav {
    width: 100%;
  }

  .el-tabs__item {
    flex: 1;
    text-align: center;
  }
}
</style>

<style lang="scss" scoped>
.calculator-dialog {
  & > *:not(:first-child) {
    margin-top: $inner-spacing-medium;
  }

  @include vertical-divider('icon-divider', $inner-spacing-medium);
}

.duration {
  &-title + &-tabs {
    margin-top: $inner-spacing-small;
  }
}

.results {
  &-title {
    font-size: var(--s-heading3-font-size);
    font-weight: 500;
    line-height: var(--s-line-height-small);
    letter-spacing: var(--s-letter-spacing-mini);
    margin-bottom: $inner-spacing-big;
  }
}

.demeter-copyright {
  color: var(--s-color-base-content-tertiary);
  display: block;
  font-size: var(--s-font-size-mini);
  font-weight: 400;
  text-align: center;
  text-decoration: none;
  text-transform: uppercase;

  @include focus-outline;
}
</style>
../../router../consts
