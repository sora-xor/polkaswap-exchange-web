<template>
  <s-card class="demeter-pool-card">
    <pool-info>
      <template #prepend>
        <div class="demeter-pool-card-status">
          <s-icon
            v-if="hasStake"
            name="basic-placeholder-24"
            size="12"
            :class="['demeter-pool-card-status-icon', { active: activeStatus }]"
          />
          <span class="demeter-pool-card-status-title">{{ title }}</span>
        </div>
      </template>

      <info-line label="APR" value="100%" />
      <info-line :label="t('demeterFarming.info.totalLiquidityLocked')" :value="tvlFormatted" />
      <info-line :label="t('demeterFarming.info.rewardToken')" :value="rewardAssetSymbol" />

      <info-line
        v-if="hasStake || hasRewards"
        value-can-be-hidden
        :label="t('demeterFarming.info.rewardEarned', { symbol: rewardAssetSymbol })"
        :value="rewardsFormatted"
        :fiat-value="rewardsFiat"
      />
      <info-line
        v-if="hasStake"
        value-can-be-hidden
        :label="t('demeterFarming.info.poolShareStaked')"
        :value="poolShareStakedFormatted"
      />
      <template v-else>
        <info-line :label="t('demeterFarming.info.fee')" :value="feePercent" />
      </template>

      <template #buttons v-if="hasStake || hasRewards">
        <s-button type="secondary" class="s-typography-button--medium" @click="claim" :disabled="!hasRewards">{{
          t('demeterFarming.actions.claim')
        }}</s-button>
        <s-button type="secondary" class="s-typography-button--medium" @click="remove" :disabled="!hasStake">{{
          t('demeterFarming.actions.remove')
        }}</s-button>
      </template>

      <template #append>
        <s-button
          v-if="activeStatus"
          type="primary"
          class="s-typography-button--large action-button"
          :disabled="depositDisabled"
          @click="add"
        >
          {{ primaryButtonText }}
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

import PoolInfoMixin from './mixins/PoolInfoMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';

@Component({
  components: {
    PoolInfo: lazyComponent(Components.PoolInfo),
    InfoLine: components.InfoLine,
  },
})
export default class DemeterPoolCard extends Mixins(PoolInfoMixin, TranslationMixin) {
  get activeStatus(): boolean {
    return !this.pool.isRemoved;
  }

  get title(): string {
    const key = this.activeStatus ? (this.hasStake ? 'active' : 'inactive') : 'stopped';

    return this.t(`demeterFarming.staking.${key}`);
  }

  get primaryButtonText(): string {
    return this.t(`demeterFarming.actions.${this.hasStake ? 'add' : 'start'}`);
  }

  get depositDisabled(): boolean {
    return FPNumber.isGreaterThanOrEqualTo(this.poolShareStaked, FPNumber.HUNDRED);
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
  &-status {
    &-icon {
      margin-right: $inner-spacing-small;
      color: var(--s-color-status-error);

      &.active {
        color: var(--s-color-status-success);
      }
    }

    &-title {
      font-size: var(--s-font-size-medium);
      font-weight: 600;
      line-height: var(--s-line-height-reset);
      text-transform: uppercase;
    }
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
