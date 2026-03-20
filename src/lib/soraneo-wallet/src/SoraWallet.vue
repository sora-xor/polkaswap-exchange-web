<template>
  <WalletProviders>
    <component
      :is="currentRoute"
      v-bind="$attrs"
      v-loading="loading"
      @swap="(asset) => handleOperation(Operations.Swap, asset)"
      @liquidity="(asset) => handleOperation(Operations.Liquidity, asset)"
      @bridge="(asset) => handleOperation(Operations.Bridge, asset)"
      @learn-more="handleLearnMore"
      @close="handleClose"
    />
  </WalletProviders>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapState } from 'vuex';

import AddAsset from './components/AddAsset/AddAsset.vue';
import CreateToken from './components/CreateToken.vue';
import LoadingMixin from './components/mixins/LoadingMixin';
import TranslationMixin from './components/mixins/TranslationMixin';
import ReceiveToken from './components/ReceiveToken.vue';
import SelectAsset from './components/SelectAsset.vue';
import Wallet from './components/Wallet.vue';
import WalletAssetDetails from './components/WalletAssetDetails.vue';
import WalletConnection from './components/WalletConnection.vue';
import WalletProviders from './components/WalletProviders.vue';
import WalletSend from './components/WalletSend.vue';
import WalletTransactionDetails from './components/WalletTransactionDetails.vue';
import { Operations } from './types/common';

import type { RouteNames } from './consts';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

export default defineComponent({
  inheritAttrs: false,
  components: {
    AddAsset,
    SelectAsset,
    CreateToken,
    ReceiveToken,
    Wallet,
    WalletAssetDetails,
    WalletConnection,
    WalletSend,
    WalletTransactionDetails,
    WalletProviders,
  },
  mixins: [LoadingMixin, TranslationMixin],
  emits: ['close', 'swap', 'liquidity', 'bridge', 'learn-more'],
  data() {
    return {
      Operations,
    };
  },
  computed: {
    ...mapState('wallet/router', ['currentRoute']),
  },
  created(this: any): void {
    void this.withApi(() => {}); // We need it just for loading state
  },
  methods: {
    handleClose(this: any): void {
      this.$emit('close');
    },
    handleOperation(this: any, operation: Operations, asset: AccountAsset): void {
      this.$emit(operation, asset);
    },
    handleLearnMore(this: any): void {
      this.$emit('learn-more');
    },
  },
});
</script>
