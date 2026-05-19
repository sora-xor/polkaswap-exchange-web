<template>
  <div>
    <connection-items :size="wallets.length">
      <account-card
        v-for="wallet in wallets"
        :key="wallet.extensionName"
        v-button
        tabindex="0"
        @click="handleSelect(wallet)"
      >
        <template #avatar>
          <img v-if="wallet.logo.src" :src="wallet.logo.src" :alt="wallet.logo.alt" />
          <s-icon v-else name="finance-wallet-24" size="32" class="extension-icon--unknown"></s-icon>
        </template>
        <template #name>
          <div class="extension-name">
            {{ wallet.title }}
            <div v-if="isRecommendedWallet(wallet)" class="extension-label extension-label--recommended">
              <span>{{ t('connection.wallet.recommended') }}</span>
              <s-icon name="star-16" size="14" class="extension-label__icon"></s-icon>
            </div>
          </div>
        </template>
        <template #default>
          <a
            v-if="!wallet.installed && wallet.installUrl"
            :href="wallet.installUrl"
            target="_blank"
            rel="nofollow noopener noreferrer"
            class="connection-action"
          >
            <s-button class="connection-install" type="secondary" size="mini" tabindex="-1">
              {{ t('connection.wallet.install') }}
            </s-button>
          </a>
          <span v-else-if="isSelectedWalletLoading(wallet)" class="connection-loading">
            <s-icon name="el-icon-loading" size="16" class="connection-loading-icon"></s-icon>
          </span>

          <s-button
            v-if="hasDisconnectAction(wallet)"
            class="connection-state"
            size="small"
            @click.stop="handleDisconnect(wallet)"
          >
            {{ t('disconnectWalletText') }}
          </s-button>
          <s-button v-else-if="isConnectedWallet(wallet)" class="connection-state" size="small" disabled>
            {{ t('connection.wallet.connected') }}
          </s-button>
        </template>
      </account-card>

      <slot></slot>
    </connection-items>

    <p v-if="showDisclaimer" class="connection-disclaimer">
      {{ t('connection.disclaimer') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useWalletTranslation } from '../../../composables/useWalletTranslation';
import AccountCard from '../../Account/AccountCard.vue';
import { isProviderConnected } from '../utils';

import ConnectionItems from './ConnectionItems.vue';

import type { Wallet } from '../../../services/wallet/types';

const props = withDefaults(
  defineProps<{
    wallets?: Wallet[];
    recommendedWallets?: string[];
    connectedWallet?: string;
    selectedWallet?: string;
    selectedWalletLoading?: boolean;
    showDisclaimer?: boolean;
  }>(),
  {
    wallets: () => [],
    recommendedWallets: () => [],
    connectedWallet: '',
    selectedWallet: '',
    selectedWalletLoading: false,
    showDisclaimer: false,
  }
);

const emit = defineEmits<{
  select: [wallet: Wallet];
  disconnect: [wallet: Wallet];
}>();

const { t } = useWalletTranslation();

function isSelectedWalletLoading(wallet: Wallet): boolean {
  return wallet.extensionName === props.selectedWallet && props.selectedWalletLoading;
}

function isConnectedWallet(wallet: Wallet): boolean {
  return wallet.extensionName === props.connectedWallet;
}

function isRecommendedWallet(wallet: Wallet): boolean {
  return props.recommendedWallets.includes(wallet.extensionName);
}

function hasDisconnectAction(wallet: Wallet): boolean {
  return isProviderConnected(wallet?.provider as Nullable<{ isConnected?: unknown }>);
}

function handleSelect(wallet: Wallet): void {
  if (!isSelectedWalletLoading(wallet)) {
    emit('select', wallet);
  }
}

function handleDisconnect(wallet: Wallet): void {
  emit('disconnect', wallet);
}
</script>

<style lang="scss" scoped>
.connection-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--s-size-small);
  height: var(--s-size-small);
}

.connection-disclaimer {
  margin-top: $basic-spacing;
  text-align: center;
  font-size: var(--s-font-size-mini);
  color: var(--s-color-base-content-secondary);
}

.connection-action {
  display: inline-flex;
  flex-shrink: 0;
  color: inherit;
  text-decoration: none;

  :deep(.connection-install) {
    display: inline-flex !important;
    position: static !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 3px 6px !important;
    text-transform: uppercase;
    font-weight: 500;
    line-height: 12px;
    color: var(--s-color-base-on-accent) !important;
    background-color: var(--s-color-base-content-tertiary);
    border-color: transparent;
    box-shadow: var(--s-shadow-element-pressed);
  }

  :deep(.connection-install .s-button__text) {
    text-transform: uppercase;
    font-weight: 500;
    line-height: 12px;
    color: inherit;
  }
}

:deep(.connection-state) {
  flex-shrink: 0;
}

.extension {
  &-icon {
    &--unknown {
      color: var(--s-color-base-content-secondary);
    }
  }

  &-name {
    display: flex;
    flex-flow: column nowrap;
    align-items: flex-start;
  }

  &-label {
    display: inline-flex;
    align-items: center;
    gap: $basic-spacing-tiny;
    width: fit-content;
    min-height: 20px;
    border-radius: var(--s-border-radius-medium);
    margin-top: 2px;
    padding: 3px 7px 3px 8px;
    font-size: var(--s-font-size-mini);
    font-weight: 600;
    line-height: 1;
    letter-spacing: 0;
    text-transform: uppercase;
    white-space: nowrap;

    i {
      color: inherit;
    }

    &--recommended {
      background-color: var(--s-color-theme-accent);
      color: var(--s-color-base-on-accent);
    }
  }
}

.extension-label__icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  width: 14px;
  height: 14px;
  line-height: 14px;

  &::before {
    content: none !important;
  }

  :deep(.s-icon__svg) {
    display: block !important;
  }
}
</style>
