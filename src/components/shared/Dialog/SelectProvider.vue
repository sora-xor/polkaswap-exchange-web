<template>
  <dialog-base :visible.sync="visibility" :title="t('createPair.connect')">
    <ul class="providers-list">
      <li
        v-for="provider in providers"
        :key="provider.value"
        class="providers-list-item provider"
        @click="handleProviderClick(provider.value)"
      >
        <img :src="provider.icon" class="provider-logo" />
        <span class="provider-name">{{ provider.name }}</span>
      </li>
    </ul>

    <s-button v-if="evmAddress" @click="resetEvmProvider">logout wallet</s-button>
  </dialog-base>
</template>

<script lang="ts">
import { components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';
import { action, state } from '@/store/decorators';
import { Provider } from '@/utils/ethers-util';

type WalletProvider = {
  name: string;
  value: Provider;
  icon: any;
  selected: boolean;
};

const WalletProviders = [Provider.Metamask, Provider.WalletConnect].map((provider) => ({
  value: provider,
  name: provider,
  icon: `/wallet/${provider}.svg`,
}));

@Component({
  components: {
    DialogBase: components.DialogBase,
  },
})
export default class SelectProviderDialog extends Mixins(WalletConnectMixin) {
  @state.web3.evmProvider evmProvider!: Nullable<Provider>;
  @state.web3.selectProviderDialogVisibility private selectProviderDialogVisibility!: boolean;

  @action.web3.resetEvmProvider resetEvmProvider!: FnWithoutArgs;

  get visibility(): boolean {
    return this.selectProviderDialogVisibility;
  }

  set visibility(flag: boolean) {
    this.setSelectProviderDialogVisibility(flag);
  }

  get providers(): WalletProvider[] {
    return WalletProviders.map((provider) => ({
      ...provider,
      selected: provider.value === this.evmProvider,
    }));
  }

  handleProviderClick(provider: Provider): void {
    this.visibility = false;
    this.connectEvmProvider(provider);
  }
}
</script>

<style lang="scss" scoped>
.providers-list {
  list-style-type: none;
  padding: 0;
  display: flex;
  flex-flow: column nowrap;
  gap: $inner-spacing-medium;
}

.provider {
  display: flex;
  align-items: center;
  flex-flow: row nowrap;
  gap: $inner-spacing-medium;

  &-logo {
    height: var(--s-size-medium);
    width: var(--s-size-medium);
  }
}
</style>
