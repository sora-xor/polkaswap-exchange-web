<template>
  <s-card class="demeter-pool-card">
    <pool-info>
      <template #prepend>
        <div class="demeter-pool-card-title">{{ title }}</div>
      </template>

      <info-line label="APR" value="100%" />
      <info-line label="Total Liquidity Locked" value="100%" />
      <info-line label="Reward Token" value="DEO" />
      <info-line v-if="active" label="DEO Earned" value="64.23" />
      <info-line v-if="active" label="Your pool share staked" value="50%" />
      <info-line v-if="!active" label="Fee" value="1%" />

      <template #buttons v-if="active">
        <s-button type="secondary" class="s-typography-button--medium"> Claim Rewards </s-button>
        <s-button type="secondary" class="s-typography-button--medium"> Remove Stake </s-button>
      </template>

      <template #append>
        <s-button type="primary" class="s-typography-button--medium">{{ primaryButtonText }}</s-button>

        <div class="demeter-pool-card-copyright">Powered by Demeter farming</div>
      </template>
    </pool-info>
  </s-card>
</template>

<script lang="ts">
import { Component, Prop, Mixins } from 'vue-property-decorator';
import { components } from '@soramitsu/soraneo-wallet-web';

import TranslationMixin from '@/components/mixins/TranslationMixin';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';

import type { DemeterPool, DemeterAccountPool } from '@/store/demeterFarming/types';

@Component({
  components: {
    PoolInfo: lazyComponent(Components.PoolInfo),
    InfoLine: components.InfoLine,
  },
})
export default class DemeterPoolCard extends Mixins(TranslationMixin) {
  @Prop({ default: () => null, type: Object }) readonly pool!: DemeterPool;
  @Prop({ default: () => null, type: Object }) readonly accountPool!: DemeterAccountPool;

  get active(): boolean {
    return !!this.accountPool;
  }

  get title(): string {
    return this.active ? 'Staking active' : 'Stake to earn additional rewards';
  }

  get primaryButtonText(): string {
    return this.active ? 'Stake more' : 'Start staking';
  }
}
</script>

<style lang="scss">
.demeter-pool-card.s-card.neumorphic {
  background: var(--s-color-base-on-accent);
  border: 1px solid var(--s-color-theme-accent);

  @include full-width-button('s-primary', 0);
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
