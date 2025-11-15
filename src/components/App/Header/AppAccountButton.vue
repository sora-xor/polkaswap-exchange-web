<template>
  <s-button
    type="tertiary"
    size="medium"
    :class="['account-control', { 's-pressed': isLoggedIn }]"
    :tooltip="accountTooltip"
    v-bind="attrs"
    @click="handleClick"
  >
    <div class="account-control-icon">
      <s-icon v-if="!isLoggedIn" name="finance-wallet-24" size="28"></s-icon>
      <wallet-avatar v-else :address="account?.address"></wallet-avatar>
    </div>
    <div :class="['account-control-title', { name: isLoggedIn }]">{{ accountInfo }}</div>
  </s-button>
</template>

<script lang="ts" setup>
import { components, type WALLET_TYPES } from '@wallet';
import { computed, useAttrs } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { useWalletStore } from '@/stores/wallet';
import { formatAddress } from '@/utils';

defineOptions({
  components: {
    WalletAvatar: components.WalletAvatar,
  },
});

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();

const attrs = useAttrs();
const { t } = useTranslation();
const walletStore = useWalletStore();

const account = computed(() => walletStore.account as WALLET_TYPES.PolkadotJsAccount | undefined);
const isLoggedIn = computed(() => walletStore.isLoggedIn);

const accountTooltip = computed(() => (isLoggedIn.value ? t('connectedAccount') : t('connectWalletTextTooltip')));

const accountInfo = computed(() => {
  if (!isLoggedIn.value) return t('connectWalletText');
  const current = account.value;
  if (!current) return '';
  return current.name || formatAddress(current.address, 8);
});

function handleClick(event: MouseEvent): void {
  emit('click', event);
}
</script>

<style lang="scss">
$account-control-name-max-width: 200px;

.account-control {
  &:hover,
  &:focus {
    [class^='s-icon-'] {
      color: var(--s-color-base-content-secondary);
    }
  }

  &.el-button.neumorphic.s-medium {
    @include tablet(true) {
      padding-left: 5px;
      padding-right: 5px;
    }
  }

  &-title {
    display: none;
    font-size: var(--s-font-size-small);
    max-width: $account-control-name-max-width;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-left: $basic-spacing-mini;
    &.name {
      text-transform: none;
    }

    @include tablet {
      display: inline-block;
    }
  }
  &.s-tertiary {
    &.el-button {
      padding-left: $basic-spacing-mini;
      padding-right: $basic-spacing-mini;
    }
  }
  &-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--s-size-small);
    height: var(--s-size-small);
    overflow: hidden;
    border-radius: 50%;

    svg circle:first-child {
      fill: var(--s-color-utility-surface);
    }
  }

  [class^='s-icon-'] {
    @include icon-styles;
  }
}
</style>
