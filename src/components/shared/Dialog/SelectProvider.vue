<template>
  <dialog-base v-model:visible="visible" :title="t('connectEthereumWalletText')" append-to-body>
    <extension-connection-list
      show-disclaimer
      :wallets="wallets"
      :recommended-wallets="recommendedWallets"
      :connected-wallet="connectedWallet"
      :selected-wallet="selectedWallet"
      :selected-wallet-loading="selectedWalletLoading"
      @select="handleSelectProvider"
    ></extension-connection-list>
  </dialog-base>
</template>

<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';

import { useWeb3Connection } from '@/composables/useWeb3Connection';
import { useTranslation } from '@/composables/useTranslation';
import { useWeb3Store } from '@/stores/web3';
import type { AppEIPProvider } from '@/types/evm/provider';
import { PredefinedProvider } from '@/utils/connection/evm/providers';
import WalletComponentDialogBase from '@/lib/soraneo-wallet/src/components/DialogBase.vue';
import WalletComponentExtensionConnectionList from '@/lib/soraneo-wallet/src/components/Connection/List/Extension.vue';

type EvmWalletInfo = {
  extensionName: string;
  title: string;
  logo: {
    src: string;
    alt: string;
  };
  installed?: boolean;
  installUrl?: string;
};

defineOptions({
  components: {
    DialogBase: WalletComponentDialogBase,
    ExtensionConnectionList: WalletComponentExtensionConnectionList,
  },
});

const { t } = useTranslation();
const { connectEvmProvider, evmProvider, evmProviderLoading, subscribeOnEvmProviders } = useWeb3Connection();
const web3Store = useWeb3Store();

const visible = defineModel<boolean>('visible', {
  default: false,
  get(value) {
    return web3Store.selectProviderDialogVisibility;
  },
  set(value) {
    web3Store.setSelectProviderDialogVisibility(value);
    return value;
  },
});

const appEvmProviders = ref<AppEIPProvider[]>(web3Store.appEvmProviders);
const recommendedWallets = [PredefinedProvider.Fearless];

let unsubscribeProviders: Nullable<VoidFunction> = null;

const updateProviders = async (nextVisible: boolean) => {
  if (nextVisible) {
    unsubscribeProviders = await subscribeOnEvmProviders();
  } else {
    unsubscribeProviders?.();
    unsubscribeProviders = null;
  }
};

watch(
  () => web3Store.appEvmProviders as AppEIPProvider[],
  (providers) => {
    appEvmProviders.value = providers;
  }
);

watch(
  visible,
  (next) => {
    void updateProviders(next);
  },
  { immediate: true }
);

onScopeDispose(() => {
  unsubscribeProviders?.();
});

const wallets = computed<EvmWalletInfo[]>(() =>
  appEvmProviders.value.map((provider) => ({
    extensionName: provider.uuid,
    title: provider.name,
    logo: {
      src: provider.icon,
      alt: provider.name,
    },
    installed: provider.installed,
    installUrl: provider.installUrl,
  }))
);

const connectedWallet = computed(() => evmProvider.value?.uuid ?? null);
const loadingWallet = computed(() => evmProviderLoading.value?.uuid ?? null);
const selectedWallet = computed(() => loadingWallet.value ?? connectedWallet.value);
const selectedWalletLoading = computed(
  () => !!loadingWallet.value && !!selectedWallet.value && loadingWallet.value === selectedWallet.value
);

async function handleSelectProvider(wallet: EvmWalletInfo): Promise<void> {
  const provider = appEvmProviders.value.find((item) => item.uuid === wallet.extensionName);
  if (!provider) return;

  await connectEvmProvider(provider);
  visible.value = false;
}
</script>
