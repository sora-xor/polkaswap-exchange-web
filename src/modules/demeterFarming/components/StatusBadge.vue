<template>
  <div :class="['status-badge', { active: hasStake }]" @click="handleBadgeClick">
    <div class="status-badge-logo">
      <token-logo :token="rewardAsset" size="mini" />
      <div v-if="hasStake" :class="['status-badge-logo-icon', { active: activeStatus }]" />
    </div>

    <div class="status-badge-title">
      <div>{{ title }}</div>
      <div v-if="pricesAvailable" class="status-badge-title--mini">{{ apr }} APR</div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { components } from '@soramitsu/soraneo-wallet-web';

import PoolStatusMixin from '../mixins/PoolStatusMixin';

@Component({
  components: {
    TokenLogo: components.TokenLogo,
  },
})
export default class StatusBadge extends Mixins(PoolStatusMixin) {
  get title(): string {
    if (!this.activeStatus) return this.t('demeterFarming.staking.stopped');

    return this.t(this.hasStake ? 'demeterFarming.staking.active' : 'demeterFarming.actions.start');
  }

  handleBadgeClick(event: Event): void {
    if (this.depositDisabled) return;

    event.stopPropagation();

    this.add();
  }
}
</script>

<style lang="scss">
$token-logo-width: 20px;

.status-badge-logo {
  width: $token-logo-width;
  height: $token-logo-width;

  .logo {
    width: inherit;
    height: inherit;

    .asset-logo--mini {
      width: inherit;
      height: inherit;
    }
  }
}
</style>

<style lang="scss" scoped>
$status-badge-width: 140px;

.status-badge {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  width: $status-badge-width;
  height: var(--s-size-small);

  padding: $inner-spacing-tiny $inner-spacing-mini;
  border-radius: calc(var(--s-border-radius-small) / 2);

  box-shadow: var(--s-shadow-element-pressed);

  background: var(--s-color-theme-accent);
  color: var(--s-color-base-on-accent);

  &.active {
    background: var(--s-color-base-on-accent);
    color: var(--s-color-base-content-primary);
  }

  &-logo {
    position: relative;

    &-icon {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 2px solid var(--s-color-base-on-accent);

      background-color: var(--s-color-status-error);

      &.active {
        background-color: var(--s-color-status-success);
      }
    }
  }

  &-title {
    font-size: calc(var(--s-font-size-extra-mini) - 1px);
    font-weight: 700;
    line-height: var(--s-line-height-reset);
    text-align: left;
    text-transform: uppercase;
    white-space: nowrap;

    &--mini {
      font-weight: 600;
    }
  }

  &-logo + &-title {
    margin-left: $inner-spacing-mini * 0.75;
  }
}
</style>
