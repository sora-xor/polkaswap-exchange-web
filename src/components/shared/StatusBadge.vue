<template>
  <div :class="['status-badge', { active }]">
    <div class="status-badge-logo">
      <token-logo :token="rewardAsset" size="mini"></token-logo>
      <div v-if="active" :class="['status-badge-logo-icon', { active: !stopped }]"></div>
    </div>

    <div class="status-badge-title">
      <div>{{ title }}</div>
      <div v-if="aprAvailable" class="status-badge-title--mini">{{ apr }} {{ TranslationConsts.APR }}</div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { components } from '@/shims/wallet-components';
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

defineOptions({
  name: 'StatusBadge',
  components: {
    TokenLogo: components.TokenLogo,
  },
});

const props = defineProps<{
  stopped: boolean;
  active: boolean;
  apr: string;
  rewardAsset?: Nullable<AccountAsset>;
}>();

const { t, TranslationConsts } = useTranslation();
const aprAvailable = computed(() => props.apr.trim().length > 0);

const title = computed(() => {
  if (props.stopped) return t('demeterFarming.staking.stopped');
  return props.active ? t('demeterFarming.staking.active') : t('demeterFarming.actions.start');
});
</script>

<style lang="scss">
$token-logo-width: 20px;

.status-badge-logo {
  width: $token-logo-width;
  height: $token-logo-width;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  .logo {
    width: inherit;
    height: inherit;

    .asset-logo--mini {
      width: inherit;
      height: inherit;
      background-position: center;
      background-repeat: no-repeat;
      background-size: cover;
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
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
    font-size: calc(var(--s-font-size-extra-mini) - 1px);
    font-weight: 700;
    line-height: var(--s-line-height-reset);
    text-align: left;
    text-transform: uppercase;
    white-space: nowrap;

    &--mini {
      font-weight: 600;
      margin-top: 1px;
    }
  }

  &-logo + &-title {
    margin-left: $inner-spacing-mini * 0.75;
  }
}
</style>
