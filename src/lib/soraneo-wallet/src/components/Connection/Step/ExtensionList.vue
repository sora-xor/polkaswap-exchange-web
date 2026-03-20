<template>
  <div class="wallet-connection">
    <p class="wallet-connection-text">
      <external-link default-class="p3" :href="wikiLink" :title="t('connection.action.learnMore')"></external-link>
    </p>

    <div v-if="internalWallets.length" class="wallet-connection-list">
      <p class="wallet-connection-title">{{ t('connection.list.integrated') }}</p>
      <extension-connection-list
        :wallets="internalWallets"
        :recommended-wallets="recommendedWallets"
        :connected-wallet="connectedWallet"
        :selected-wallet="selectedWallet"
        :selected-wallet-loading="selectedWalletLoading"
        @select="handleSelectWallet"
        @disconnect="handleDisconnectWallet"
      ></extension-connection-list>
    </div>
    <div v-if="externalWallets.length" class="wallet-connection-list">
      <p class="wallet-connection-title">{{ t('connection.list.extensions') }}</p>
      <extension-connection-list
        show-disclaimer
        :wallets="externalWallets"
        :recommended-wallets="recommendedWallets"
        :connected-wallet="connectedWallet"
        :selected-wallet="selectedWallet"
        :selected-wallet-loading="selectedWalletLoading"
        @select="handleSelectWallet"
        @disconnect="handleDisconnectWallet"
      ></extension-connection-list>
    </div>

    <slot></slot>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';

import { AppWallet, Links } from '../../../consts';
import TranslationMixin from '../../mixins/TranslationMixin';
import ExternalLink from '../../shared/ExternalLink.vue';
import ExtensionConnectionList from '../List/Extension.vue';

import type { Wallet } from '../../../services/wallet/types';

const wikiLink = Links.connection.wiki;

export default defineComponent({
  components: {
    ExtensionConnectionList,
    ExternalLink,
  },
  mixins: [TranslationMixin],
  props: {
    connectedWallet: {
      default: '',
      type: String,
    },
    selectedWallet: {
      default: '',
      type: String as PropType<AppWallet>,
    },
    selectedWalletLoading: {
      default: false,
      type: Boolean,
    },
    internalWallets: {
      default: () => [],
      type: Array as PropType<Wallet[]>,
    },
    externalWallets: {
      default: () => [],
      type: Array as PropType<Wallet[]>,
    },
    recommendedWallets: {
      default: () => [],
      type: Array as PropType<string[]>,
    },
  },
  emits: ['select', 'disconnect'],
  data() {
    return {
      wikiLink,
    };
  },
  methods: {
    handleSelectWallet(this: any, wallet: Wallet): void {
      this.$emit('select', wallet);
    },
    handleDisconnectWallet(this: any, wallet: Wallet): void {
      this.$emit('disconnect', wallet);
    },
  },
});
</script>

<style scoped lang="scss">
.wallet-connection {
  display: flex;
  flex-flow: column nowrap;
  gap: $basic-spacing-big;
  min-height: 102px;

  &-text {
    color: var(--s-color-base-content-primary);
    font-size: 13px;
    font-weight: 300;
    line-height: 18.2px;

    :deep(.external-link.p3) {
      font-size: 14px;
      line-height: 25.2px;
    }
  }

  &-title {
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-extra-small);
    font-weight: 600;
    line-height: var(--s-line-height-small);
    text-transform: uppercase;
  }

  &-list {
    display: flex;
    flex-flow: column nowrap;
    gap: 12px;
    margin-top: 0;
  }
}
</style>
