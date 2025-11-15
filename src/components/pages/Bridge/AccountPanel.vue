<template>
  <div v-if="address" class="account-panel">
    <s-divider type="tertiary"></s-divider>

    <div class="account-group">
      <slot name="icon">
        <img v-if="icon" :src="icon" alt="provider icon" class="account-group-logo" />
        <wallet-avatar v-else :address="address" :size="18" class="account-gravatar"></wallet-avatar>
      </slot>
      <span v-if="name" class="account-group-name">
        {{ name }}
      </span>
      <formatted-address :value="address" :symbols="12" :tooltip-text="tooltip"></formatted-address>
    </div>

    <div class="account-group">
      <span v-button class="account-group-btn" @click="handleConnect">
        {{ t('changeAccountText') }}
      </span>
      <span v-button class="account-group-btn disconnect" @click="handleDisconnect">
        {{ t('disconnectWalletText') }}
      </span>
    </div>
  </div>

  <s-button
    v-else
    class="account-panel-button s-typography-button--large"
    data-test-name="connectPolkadot"
    type="primary"
    @click="handleConnect"
  >
    {{ t('connectWalletText') }}
  </s-button>
</template>

<script lang="ts" setup>
import { components } from '@wallet';

import { useTranslation } from '@/composables/useTranslation';

defineOptions({
  components: {
    WalletAvatar: components.WalletAvatar,
    FormattedAddress: components.FormattedAddress,
  },
});

const props = withDefaults(
  defineProps<{
    address?: string;
    name?: string;
    tooltip?: string;
    icon?: string;
  }>(),
  {
    address: '',
    name: '',
    tooltip: '',
    icon: '',
  }
);

const emit = defineEmits<{
  (e: 'connect'): void;
  (e: 'disconnect'): void;
}>();

const { t } = useTranslation();

function handleConnect(): void {
  emit('connect');
}

function handleDisconnect(): void {
  emit('disconnect');
}
</script>

<style lang="scss">
.account-group {
  .account-gravatar {
    border: none;
    border-radius: 50%;

    & > circle:first-child {
      fill: var(--s-color-utility-surface);
    }
  }
}
</style>

<style lang="scss" scoped>
@include full-width-button('account-panel-button', $inner-spacing-mini);

.account-panel {
  display: flex;
  flex: 1;
  justify-content: space-between;
  flex-wrap: wrap;
  font-size: var(--s-font-size-mini);
  line-height: var(--s-line-height-medium);
  color: var(--s-color-base-content-primary);

  @include vertical-divider('s-divider-tertiary');
}

.account-group {
  display: flex;
  align-items: center;
  gap: $inner-spacing-mini;

  &-logo {
    width: 18px;
    height: 18px;
    border-radius: 50%;
  }

  &-name {
    max-width: 64px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &-btn {
    @include copy-address;

    &.disconnect {
      color: var(--s-color-status-error);
    }
  }
}
</style>
