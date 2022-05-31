<template>
  <s-card class="demeter-pool-card">
    <pool-info>
      <template #prepend>
        <div class="demeter-pool-card-title">{{ title }}</div>
      </template>

      <info-line label="APR" value="100%" />
      <info-line :label="t('demeterFarming.info.totalLiquidityLocked')" :value="tvlFormatted" />
      <info-line :label="t('demeterFarming.info.rewardToken')" :value="rewardAssetSymbol" />

      <template v-if="hasStake">
        <info-line
          value-can-be-hidden
          :label="t('demeterFarming.info.rewardEarned', { symbol: rewardAssetSymbol })"
          :value="rewardEarned"
          :fiat-value="rewardEarnedFiat"
        />
        <info-line
          value-can-be-hidden
          :label="t('demeterFarming.info.poolShareStaked')"
          :value="poolShareStakedFormatted"
        />
      </template>
      <template v-else>
        <info-line :label="t('demeterFarming.info.fee')" :value="feePercent" />
      </template>

      <template #buttons v-if="hasStake">
        <s-button type="secondary" class="s-typography-button--medium" @click="claim">{{
          t('demeterFarming.actions.claim')
        }}</s-button>
        <s-button type="secondary" class="s-typography-button--medium" @click="remove">{{
          t('demeterFarming.actions.remove')
        }}</s-button>
      </template>

      <template #append>
        <s-button
          type="primary"
          class="s-typography-button--large action-button"
          :disabled="!addStakeAvailability"
          @click="add"
        >{{ primaryButtonText }}
        </s-button>

        <div class="demeter-pool-card-copyright">{{ t('demeterFarming.poweredBy') }}</div>
      </template>
    </pool-info>
  </s-card>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/util';
import { Component, Mixins } from 'vue-property-decorator';
import { components } from '@soramitsu/soraneo-wallet-web';

import PoolInfoMixin from './PoolInfoMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';

import type { Asset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    PoolInfo: lazyComponent(Components.PoolInfo),
    InfoLine: components.InfoLine,
  },
})
export default class DemeterPoolCard extends Mixins(PoolInfoMixin, TranslationMixin) {
  get title(): string {
    return this.t(`demeterFarming.staking.${this.hasStake ? 'active' : 'inactive'}`);
  }

  get primaryButtonText(): string {
    return this.t(`demeterFarming.actions.${this.hasStake ? 'add' : 'start'}`);
  }

  get rewardEarned(): string {
    return this.accountPool.rewards.toLocaleString();
  }

  get rewardEarnedFiat(): Nullable<string> {
    return this.getFiatAmountByFPNumber(this.accountPool.rewards, this.rewardAsset as Asset);
  }

  get addStakeAvailability(): boolean {
    return FPNumber.isLessThan(this.poolShareStaked, FPNumber.HUNDRED);
  }

  get emitParams(): object {
    return {
      poolAsset: this.pool.poolAsset,
      rewardAsset: this.pool.rewardAsset,
    };
  }

  add(): void {
    this.$emit('add', this.emitParams);
  }

  remove(): void {
    this.$emit('remove', this.emitParams);
  }

  claim(): void {
    this.$emit('claim', this.emitParams);
  }
}
</script>

<style lang="scss">
.demeter-pool-card.s-card.neumorphic {
  background: var(--s-color-base-on-accent);
  border: 1px solid var(--s-color-theme-accent);

  @include full-width-button('action-button', 0);
}
</style>

<style lang="scss" scoped>
.demeter-pool-card {
  &-title {
    font-size: var(--s-font-size-medium);
    font-weight: 600;
    line-height: var(--s-line-height-reset);
    text-transform: uppercase;
  }
  &-copyright {
    font-size: var(--s-font-size-mini);
    font-weight: 400;
    line-height: var(--s-line-height-reset);
    text-transform: uppercase;
    opacity: 0.75;
  }
}
</style>
