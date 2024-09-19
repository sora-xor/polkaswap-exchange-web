<template>
  <div :class="['status-badge', { active }]">
    <div class="status-badge-logo">
      <token-logo :token="rewardAsset" size="mini" />
      <div v-if="active" :class="['status-badge-logo-icon', { active: !stopped }]" />
    </div>

    <div class="status-badge-title">
      <div>{{ title }}</div>
      <div v-if="pricesAvailable" class="status-badge-title--mini">{{ apr }} {{ TranslationConsts.APR }}</div>
    </div>
  </div>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Prop, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

@Component({
  components: {
    TokenLogo: components.TokenLogo,
  },
})
export default class StatusBadge extends Mixins(mixins.FormattedAmountMixin, TranslationMixin) {
  @Prop({ required: true, type: Boolean }) readonly stopped!: boolean;
  @Prop({ required: true, type: Boolean }) readonly active!: boolean;
  @Prop({ required: true, type: String }) readonly apr!: string;
  @Prop({ type: Object }) readonly rewardAsset!: Nullable<AccountAsset>;

  get pricesAvailable(): boolean {
    return Object.keys(this.fiatPriceObject).length > 0;
  }

  get title(): string {
    if (this.stopped) return this.t('demeterFarming.staking.stopped');

    return this.t(this.active ? 'demeterFarming.staking.active' : 'demeterFarming.actions.start');
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
$status-badge-width: 143px;

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
