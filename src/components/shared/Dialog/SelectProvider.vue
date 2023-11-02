<template>
  <dialog-base :visible.sync="visibility" :title="t('connectEthereumWalletText')">
    <connection-items :size="providers.length">
      <account-card
        v-button
        v-for="provider in providers"
        :key="provider.name"
        tabindex="0"
        @click.native="handleProviderClick(provider.name)"
        class="provider-card"
      >
        <template #avatar>
          <img :src="provider.icon" :alt="provider.name" class="provider-logo" />
        </template>
        <template #name>{{ provider.name }}</template>
        <template #default>
          <s-button v-if="provider.connected" size="small" disabled>
            {{ t('connection.wallet.connected') }}
          </s-button>
        </template>
      </account-card>
    </connection-items>
  </dialog-base>
</template>

<script lang="ts">
import { components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';
import { state } from '@/store/decorators';
import { Provider } from '@/utils/ethers-util';

type WalletProvider = {
  name: Provider;
  icon: any;
  connected: boolean;
};

@Component({
  components: {
    AccountCard: components.AccountCard,
    ConnectionItems: components.ConnectionItems,
    DialogBase: components.DialogBase,
  },
})
export default class SelectProviderDialog extends Mixins(WalletConnectMixin) {
  @state.web3.selectProviderDialogVisibility private selectProviderDialogVisibility!: boolean;

  get visibility(): boolean {
    return this.selectProviderDialogVisibility;
  }

  set visibility(flag: boolean) {
    this.setSelectProviderDialogVisibility(flag);
  }

  get providers(): WalletProvider[] {
    return Object.keys(Provider).map((key) => {
      const provider = Provider[key];

      return {
        name: provider,
        icon: this.getEvmProviderIcon(provider),
        connected: provider === this.evmProvider,
      };
    });
  }

  handleProviderClick(provider: Provider): void {
    this.visibility = false;
    this.connectEvmProvider(provider);
  }
}
</script>

<style lang="scss">
.provider-card .account > .account-avatar {
  border-radius: unset;
}
</style>

<style lang="scss" scoped>
.provider {
  &-logo {
    height: var(--s-size-medium);
    width: var(--s-size-medium);
  }
}
</style>
