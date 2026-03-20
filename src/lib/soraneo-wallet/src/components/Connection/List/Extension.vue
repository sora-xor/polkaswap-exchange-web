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
              <s-icon name="basic-circle-star-24" size="12" class="extension-label__icon"></s-icon>
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

<script lang="ts">
import { defineComponent } from 'vue';

import AccountCard from '../../Account/AccountCard.vue';
import TranslationMixin from '../../mixins/TranslationMixin';
import { isProviderConnected } from '../utils';

import ConnectionItems from './ConnectionItems.vue';

import type { Wallet } from '../../../services/wallet/types';

export default defineComponent({
  components: {
    ConnectionItems,
    AccountCard,
  },
  mixins: [TranslationMixin],
  props: {
    wallets: { default: () => [], type: Array as () => Wallet[] },
    recommendedWallets: { default: () => [], type: Array as () => string[] },
    connectedWallet: { default: '', type: String },
    selectedWallet: { default: '', type: String },
    selectedWalletLoading: { default: false, type: Boolean },
    showDisclaimer: { default: false, type: Boolean },
  },
  emits: ['select', 'disconnect'],
  methods: {
    isSelectedWalletLoading(this: any, wallet: Wallet): boolean {
      return wallet.extensionName === this.selectedWallet && this.selectedWalletLoading;
    },
    isConnectedWallet(this: any, wallet: Wallet): boolean {
      return wallet.extensionName === this.connectedWallet;
    },
    isRecommendedWallet(this: any, wallet: Wallet): boolean {
      return this.recommendedWallets.includes(wallet.extensionName);
    },
    hasDisconnectAction(wallet: Wallet): boolean {
      return isProviderConnected(wallet?.provider as Nullable<{ isConnected?: unknown }>);
    },
    handleSelect(this: any, wallet: Wallet): void {
      if (!this.isSelectedWalletLoading(wallet)) {
        this.$emit('select', wallet);
      }
    },
    handleDisconnect(this: any, wallet: Wallet): void {
      this.$emit('disconnect', wallet);
    },
  },
});
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
    display: flex;
    align-items: baseline;
    gap: $basic-spacing-tiny;
    border-radius: var(--s-border-radius-medium);
    padding: 2px 6px;
    font-size: var(--s-font-size-mini);
    text-transform: uppercase;

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

  &::before {
    content: none !important;
  }

  :deep(.s-icon__svg) {
    display: block !important;
  }
}
</style>
