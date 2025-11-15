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
import { components, WALLET_TYPES } from '@wallet';
import isEqual from 'lodash/fp/isEqual';
import { computed, onBeforeUnmount, useAttrs, watch } from 'vue';

import { useInternalConnect } from '@/composables/useInternalConnect';
import { useSubscriptions } from '@/composables/useSubscriptions';
import { useWeb3Connection } from '@/composables/useWeb3Connection';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import store from '@/store';

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

const selectedNetwork = computed(() => store.getters.web3.selectedNetwork as Nullable<NetworkData>);
const externalAccount = computed(() => store.getters.bridge.externalAccount as string);
const subAccount = computed(() => store.getters.web3.subAccount as WALLET_TYPES.PolkadotJsAccount);
const subBridgeConnector = computed(() => store.state.bridge.subBridgeConnector as SubNetworksConnector);
const chainApi = computed(() => subBridgeConnector.value?.accountApi);
const isSignTxDialogVisible = computed(() => Boolean(store.state.bridge.isSignTxDialogVisible));

const setSignTxDialogVisibility = (flag: boolean) => {
  store.commit.bridge.setSignTxDialogVisibility(flag);
};

const getSupportedApps = () => store.dispatch.web3.getSupportedApps();
const restoreSelectedNetwork = () => store.dispatch.web3.restoreSelectedNetwork();
const updateExternalBalance = () => store.dispatch.bridge.updateExternalBalance();
const subscribeOnBlockUpdates = () => store.dispatch.bridge.subscribeOnBlockUpdates();
const updateOutgoingMaxLimit = () => store.dispatch.bridge.updateOutgoingMaxLimit();
const resetBridgeForm = () => store.dispatch.bridge.resetBridgeForm();
const resetBlockUpdatesSubscription = () => store.commit.bridge.resetBlockUpdatesSubscription();
const resetOutgoingMaxLimitSubscription = () => store.commit.bridge.resetOutgoingMaxLimitSubscription();

const updateBridgeApps = async () => {
  await getSupportedApps();
  // don't block UI while connecting to an external network
  void restoreSelectedNetwork();
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
