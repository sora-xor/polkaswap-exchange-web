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
import { Options, mixins } from 'vue-property-decorator';

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
import { state } from './store/decorators';
import { Operations } from './types/common';

import type { RouteNames } from './consts';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

@Options({
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
})
export default class SoraWallet extends mixins(LoadingMixin, TranslationMixin) {
  readonly Operations = Operations;

  @state.router.currentRoute currentRoute!: RouteNames;

  async created(): Promise<void> {
    this.withApi(() => {}); // We need it just for loading state
  }

  handleClose(): void {
    this.$emit('close');
  }

  handleOperation(operation: Operations, asset: AccountAsset): void {
    this.$emit(operation, asset);
  }

  handleLearnMore(): void {
    this.$emit('learn-more');
  }
}
</script>
