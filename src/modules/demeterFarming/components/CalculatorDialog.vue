<template>
  <dialog-base :visible.sync="isVisible" title="APR Calculator">
    <div class="calculator-dialog">
      <s-row v-if="poolAsset" flex align="middle">
        <pair-token-logo v-if="baseAsset" :first-token="baseAsset" :second-token="poolAsset" class="title-logo" />
        <token-logo v-else :token="poolAsset" class="title-logo" />
        <span class="calculator-dialog-title">
          <template v-if="baseAsset">{{ baseAsset.symbol }}-</template>{{ poolAsset.symbol }}
        </span>
      </s-row>

      <s-form class="el-form--actions" :show-message="false">
        <token-input
          v-if="baseAsset"
          :balance="baseAssetBalance.toCodecString()"
          :is-max-available="isBaseAssetMaxButtonAvailable"
          :title="t('demeterFarming.amountAdd')"
          :token="baseAsset"
          :value="baseAssetValue"
          @input="handleBaseAssetValue"
          @max="handleBaseAssetMax"
        />

        <s-icon v-if="baseAsset && poolAsset" class="icon-divider" name="plus-16" />

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
        <s-tabs type="rounded" :value="selectedPeriod" @click="selectPeriod" class="duration-tabs">
          <s-tab v-for="period in intervals" :key="period" :name="String(period)" :label="`${period}D`" />
        </s-tabs>
      </div>

      <div class="results">
        <div class="results-title">APR Results</div>

        <info-line label="ROI" />
        <info-line :label="rewardsText" />
      </div>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { components } from '@soramitsu/soraneo-wallet-web';
import { FPNumber } from '@sora-substrate/util';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

import StakeDialogMixin from '../mixins/StakeDialogMixin';

import DialogBase from '@/components/DialogBase.vue';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { isMaxButtonAvailable, getMaxValue } from '@/utils';
import { getter } from '@/store/decorators';

@Component({
  components: {
    DialogBase,
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    TokenInput: lazyComponent(Components.TokenInput),
    InfoLine: components.InfoLine,
    TokenLogo: components.TokenLogo,
  },
})
export default class CalculatorDialog extends Mixins(StakeDialogMixin) {
  @getter.assets.xor private xor!: AccountAsset;

  @Watch('visible')
  private resetValue() {
    this.baseAssetValue = '';
    this.poolAssetValue = '';
  }

  baseAssetValue = '';
  poolAssetValue = '';

  readonly intervals = [1, 7, 30, 90];

  interval = 1;

  get selectedPeriod(): string {
    return String(this.interval);
  }

  get rewardsText(): string {
    return `${this.rewardAssetSymbol} rewards`;
  }

  get isBaseAssetMaxButtonAvailable(): boolean {
    if (!this.baseAsset) return false;

    return isMaxButtonAvailable(true, this.baseAsset, this.baseAssetValue, this.networkFee, this.xor);
  }

  get isPoolAssetMaxButtonAvailable(): boolean {
    if (!this.poolAsset) return false;

    return isMaxButtonAvailable(true, this.poolAsset, this.poolAssetValue, this.networkFee, this.xor);
  }

  selectPeriod({ name }): void {
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
    this.handleBaseAssetValue(getMaxValue(this.baseAsset, this.networkFee));
  }

  handlePoolAssetMax(): void {
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

  &-title {
    font-size: var(--s-heading2-font-size);
    font-weight: 800;
  }

  .title-logo {
    margin-right: $inner-spacing-mini;
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
</style>
