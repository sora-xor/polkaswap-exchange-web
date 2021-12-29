<template>
  <div id="app">
    <router-view :parent-loading="loading" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { Action, Getter } from 'vuex-class';
import { mixins } from '@soramitsu/soraneo-wallet-web';

import router, { showTechnicalWork } from '@/router';
import axiosInstance, { updateBaseUrl } from '@/api';
import { preloadFontFace } from '@/utils';
import { getLocale } from '@/lang';
import { Language } from '@/consts';

import type { SubNetwork } from '@/utils/ethers-util';

@Component
export default class App extends Mixins(mixins.LoadingMixin) {
  @Getter runtimeVersionCompability!: boolean;

  @Action setSoraNetwork!: (networkType: string) => Promise<void>; // wallet

  @Action setFaucetUrl!: (url: string) => Promise<void>;
  @Action setLanguage!: (lang: Language) => Promise<void>;
  @Action setApiKeys!: (options: any) => Promise<void>;
  @Action setFeatureFlags!: (options: any) => Promise<void>;
  @Action setRequiredRuntimeVersion!: (version: number) => Promise<void>;
  @Action setDefaultNodes!: (nodes: any) => Promise<void>;
  @Action setNetworkChainGenesisHash!: (hash: string) => Promise<void>;
  @Action('setSubNetworks', { namespace: 'web3' }) setSubNetworks!: (data: Array<SubNetwork>) => Promise<void>;
  @Action('setSmartContracts', { namespace: 'web3' }) setSmartContracts!: (data: Array<SubNetwork>) => Promise<void>;

  @Watch('runtimeVersionCompability')
  private checkRuntimeVersionCompability(compability: boolean) {
    if (!compability) {
      showTechnicalWork();
    }
  }

  async created(): Promise<void> {
    // element-icons is not common used, but should be visible after network connection lost
    preloadFontFace('element-icons');
    updateBaseUrl(router);

    await this.setLanguage(getLocale() as any);

    await this.withLoading(async () => {
      const { data } = await axiosInstance.get('/env.json');

      if (!data.NETWORK_TYPE) {
        throw new Error('NETWORK_TYPE is not set');
      }

      await this.setApiKeys(data?.API_KEYS);
      await this.setFeatureFlags(data?.FEATURE_FLAGS);
      await this.setSoraNetwork(data.NETWORK_TYPE);
      await this.setRequiredRuntimeVersion(data.NETWORK_RUNTIME_VERSION);
      await this.setDefaultNodes(data?.DEFAULT_NETWORKS);
      await this.setSubNetworks(data.SUB_NETWORKS);
      await this.setSmartContracts(data.SUB_NETWORKS);

      if (data.FAUCET_URL) {
        await this.setFaucetUrl(data.FAUCET_URL);
      }
      if (data.CHAIN_GENESIS_HASH) {
        await this.setNetworkChainGenesisHash(data.CHAIN_GENESIS_HASH);
      }
    });
  }
}
</script>

<style lang="scss">
html {
  overflow-y: hidden;
  font-size: var(--s-font-size-small);
  line-height: var(--s-line-height-base);
}

ul ul {
  list-style-type: none;
}

#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-family: 'Sora', sans-serif;
  height: 100vh;
  color: var(--s-color-base-content-primary);
  background-color: var(--s-color-utility-body);
  transition: background-color 500ms linear;
}
</style>
