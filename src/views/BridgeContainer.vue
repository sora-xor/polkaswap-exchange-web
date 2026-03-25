<template>
  <div class="bridge-container">
    <router-view v-bind="forwardedAttrs"></router-view>
    <confirm-dialog
      :chain-api="chainApi"
      :account="subAccount"
      :visibility="isSignTxDialogVisible"
      :set-visibility="setSignTxDialogVisibility"
    ></confirm-dialog>
    <bridge-select-network></bridge-select-network>
    <select-provider-dialog></select-provider-dialog>
  </div>
</template>

<script lang="ts" setup>
import { components } from '@/shims/wallet-components';
import isEqual from 'lodash/fp/isEqual';
import { computed, onBeforeUnmount, useAttrs, watch } from 'vue';
import { storeToRefs } from 'pinia';

import type { PolkadotJsAccount } from '@/shims/wallet-common-types';
import { useInternalConnect } from '@/composables/useInternalConnect';
import { useSubscriptions } from '@/composables/useSubscriptions';
import { useWeb3Connection } from '@/composables/useWeb3Connection';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { useBridgeStore } from '@/stores/bridge';
import { useBridgeTransactionsStore } from '@/stores/bridge/transactions';
import { useWeb3Store } from '@/stores/web3';

import type { Nullable } from '@/types/common';
import type { NetworkData } from '@/types/bridge';
import type { SubNetworksConnector } from '@/utils/bridge/sub/classes/adapter';

defineOptions({
  components: {
    ConfirmDialog: components.ConfirmDialog,
    BridgeSelectNetwork: lazyComponent(Components.BridgeSelectNetwork),
    SelectProviderDialog: lazyComponent(Components.SelectProviderDialog),
  },
});

const attrs = useAttrs();

const { disconnectExternalNetwork } = useWeb3Connection();
const { soraAddress } = useInternalConnect();
const bridgeStore = useBridgeStore();
const bridgeTransactionsStore = useBridgeTransactionsStore();
const web3Store = useWeb3Store();
const { isSignTxDialogVisible } = storeToRefs(bridgeTransactionsStore);

const selectedNetwork = computed(() => web3Store.selectedNetworkData as Nullable<NetworkData>);
const externalAccount = computed(() => bridgeStore.externalAccount);
const subAccount = computed(() => web3Store.subAccount as PolkadotJsAccount);
const subBridgeConnector = computed(() => bridgeStore.connector as SubNetworksConnector);
const chainApi = computed(() => subBridgeConnector.value?.accountApi);

const setSignTxDialogVisibility = (flag: boolean) => {
  bridgeTransactionsStore.setSignTxDialogVisibility(flag);
};

const getSupportedApps = () => web3Store.getSupportedApps();
const restoreSelectedNetwork = () => web3Store.restoreSelectedNetwork();
const updateExternalBalance = () => bridgeStore.updateExternalBalance();
const subscribeOnBlockUpdates = () => bridgeStore.subscribeOnBlockUpdates();
const updateOutgoingMaxLimit = () => bridgeStore.updateOutgoingMaxLimit();
const resetBridgeForm = () => bridgeStore.resetBridgeForm();
const resetBlockUpdatesSubscription = () => bridgeStore.resetBlockUpdatesSubscription();
const resetOutgoingMaxLimitSubscription = () => bridgeStore.resetOutgoingMaxLimitSubscription();

let restoreSelectedNetworkTask: Promise<void> | null = null;
const scheduleRestoreSelectedNetwork = (): Promise<void> => {
  if (!restoreSelectedNetworkTask) {
    restoreSelectedNetworkTask = restoreSelectedNetwork().finally(() => {
      restoreSelectedNetworkTask = null;
    });
  }

  return restoreSelectedNetworkTask;
};

const updateBridgeApps = async () => {
  // don't block UI while loading supported apps list
  void scheduleRestoreSelectedNetwork();
  await getSupportedApps();
};

const { subscriptionsDataLoading, trackLogin } = useSubscriptions({
  startSubscriptions: [subscribeOnBlockUpdates, updateOutgoingMaxLimit, updateBridgeApps],
  resetSubscriptions: [resetBlockUpdatesSubscription, resetOutgoingMaxLimitSubscription],
});

trackLogin.value = false;

watch(selectedNetwork, (curr, prev) => {
  if (curr && prev && !isEqual(curr)(prev)) {
    void resetBridgeForm();
  }
});

watch([soraAddress, externalAccount], () => {
  void updateExternalBalance();
});

onBeforeUnmount(() => {
  disconnectExternalNetwork();
});

const forwardedAttrs = computed(() => ({
  parentLoading: subscriptionsDataLoading.value,
  ...attrs,
}));
</script>
