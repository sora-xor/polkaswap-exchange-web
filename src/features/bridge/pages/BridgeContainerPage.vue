<template>
  <div class="bridge-container">
    <p v-if="fundingAsset && funding.error.value" role="alert">
      {{ t(fundingPurpose === 'xor' ? 'buyXor.bridgePreparationError' : 'getTs.bridgePreparationError') }}
    </p>
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
import isEqual from 'lodash/fp/isEqual';
import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { computed, onBeforeUnmount, useAttrs, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute } from 'vue-router';

import type { PolkadotJsAccount } from '@/lib/soraneo-wallet/src/types/common';
import { api } from '@/lib/soraneo-wallet/src/api';
import { useInternalConnect } from '@/composables/useInternalConnect';
import { useSubscriptions } from '@/composables/useSubscriptions';
import { useWeb3Connection } from '@/composables/useWeb3Connection';
import { useAssetsStore } from '@/stores/assets';
import { useBridgeStore } from '@/stores/bridge';
import { useWeb3Store } from '@/stores/web3';
import { delay } from '@/utils/promise';
import { useTranslation } from '@/composables/useTranslation';
import { parseGetTsFundingPurpose } from '@/features/misc/lib/getTsFlow';
import { useGetTsPlan } from '@/features/misc/composables/useGetTsPlan';
import { useGetTsBridgeDraftTracking } from '@/features/misc/composables/useGetTsBridgeDraftTracking';
import {
  parseTonswapBridgeFundingQuery,
  useTonswapBridgeFunding,
} from '@/features/misc/composables/useTonswapBridgeFunding';

import type { Nullable } from '@/types/common';
import type { NetworkData } from '@/types/bridge';
import type { SubNetworksConnector } from '@/utils/bridge/sub/classes/adapter';
import WalletComponentConfirmDialog from '@/lib/soraneo-wallet/src/components/ConfirmDialog.vue';
import BridgeSelectNetwork from '@/features/bridge/components/SelectNetwork.vue';
import SelectProviderDialog from '@/components/shared/Dialog/SelectProvider.vue';

defineOptions({
  name: 'BridgeContainerPage',
  components: {
    ConfirmDialog: WalletComponentConfirmDialog,
    BridgeSelectNetwork,
    SelectProviderDialog,
  },
});

const attrs = useAttrs();
const route = useRoute();
const { t } = useTranslation();
const funding = useTonswapBridgeFunding();
useGetTsBridgeDraftTracking('ts');
useGetTsBridgeDraftTracking('xor');
const fundingPurpose = computed(() => parseGetTsFundingPurpose(route.query ?? {}));
const { plan } = useGetTsPlan(() => fundingPurpose.value ?? 'ts');
let fundingAmountApplied = false;
const fundingAsset = computed(() =>
  route?.path === '/bridge' ? parseTonswapBridgeFundingQuery(route.query ?? {}) : null
);

const { disconnectExternalNetwork } = useWeb3Connection();
const { soraAddress } = useInternalConnect();
const assetsStore = useAssetsStore();
const bridgeStore = useBridgeStore();
const web3Store = useWeb3Store();
const { isSignTxDialogVisible } = storeToRefs(bridgeStore);

const selectedNetwork = computed(() => web3Store.selectedNetworkData as Nullable<NetworkData>);
const externalAccount = computed(() => bridgeStore.externalAccount);
const subNetworkConnectionState = computed(() => bridgeStore.subNetworkConnectionState);
const isSelectedSubNetworkReady = computed(() => {
  const connectionState = subNetworkConnectionState.value;

  return (
    web3Store.networkType === BridgeNetworkType.Sub &&
    web3Store.networkSelected === connectionState.network &&
    connectionState.ready
  );
});
const subAccount = computed(() => web3Store.subAccount as PolkadotJsAccount);
const subBridgeConnector = computed(() => bridgeStore.connector as SubNetworksConnector);
const chainApi = computed(() => subBridgeConnector.value?.accountApi);

const setSignTxDialogVisibility = (flag: boolean) => {
  bridgeStore.setSignTxDialogVisibility(flag);
};

const getSupportedApps = () => web3Store.getSupportedApps();
const restoreSelectedNetwork = () => web3Store.restoreSelectedNetwork();
const updateExternalBalance = () => bridgeStore.updateExternalBalance();
const updateFeesAndLockedFunds = () => bridgeStore.updateFeesAndLockedFunds();
const subscribeOnBlockUpdates = () => bridgeStore.subscribeOnBlockUpdates();
const updateOutgoingMaxLimit = () => bridgeStore.updateOutgoingMaxLimit();
const resetBridgeForm = () => bridgeStore.resetBridgeForm();
const resetBlockUpdatesSubscription = () => bridgeStore.resetBlockUpdatesSubscription();
const resetOutgoingMaxLimitSubscription = () => bridgeStore.resetOutgoingMaxLimitSubscription();

/**
 * Reloads network-derived asset metadata and all values that may have been
 * cleared while a selected Substrate RPC was unavailable.
 */
const refreshSelectedSubNetwork = async (): Promise<void> => {
  await assetsStore.getRegisteredAssets();
  await bridgeStore.setAssetAddress(bridgeStore.form.assetAddress || undefined);
};

const BRIDGE_APP_CONNECTION_RETRY_DELAY_MS = 250;
const BRIDGE_APP_CONNECTION_RETRY_LIMIT = 20;

/**
 * Waits for the shared SORA websocket before bridge app and registry calls run.
 * The shell connection flag can flip just before Polkadot RPC is ready.
 */
const waitForBridgeApiConnection = async (): Promise<void> => {
  for (let attempt = 0; attempt < BRIDGE_APP_CONNECTION_RETRY_LIMIT; attempt += 1) {
    if (api.connected) return;
    await delay(BRIDGE_APP_CONNECTION_RETRY_DELAY_MS);
  }
};

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
  await waitForBridgeApiConnection();
  await getSupportedApps();
  if (fundingAsset.value) await prepareFundingRequest();
  else await scheduleRestoreSelectedNetwork();
};

let fundingContext = '';
/** Applies only the explicit guided entry request after bridge metadata is available. */
const prepareFundingRequest = async () => {
  const symbol = fundingAsset.value;
  if (!symbol) return;
  const context = `${fundingPurpose.value}:${symbol}:${externalAccount.value}:${web3Store.isValidNetwork}`;
  if (context === fundingContext) return;
  fundingContext = context;
  const initialAmount = symbol === 'DAI' && !fundingAmountApplied ? plan.value.daiAmount : '';
  const prepared = await funding.prepareEthereumFunding(symbol, initialAmount);
  if (prepared) fundingAmountApplied = true;
};

const { subscriptionsDataLoading, trackLogin } = useSubscriptions({
  startSubscriptions: [subscribeOnBlockUpdates, updateOutgoingMaxLimit, updateBridgeApps],
  resetSubscriptions: [resetBlockUpdatesSubscription, resetOutgoingMaxLimitSubscription],
});

trackLogin.value = false;

watch(selectedNetwork, (curr, prev) => {
  if (!funding.isPreparing.value && curr && prev && !isEqual(curr)(prev)) {
    void resetBridgeForm();
  }
});

watch(
  [fundingAsset, fundingPurpose],
  () => {
    fundingAmountApplied = false;
    fundingContext = '';
    funding.cancelPreparation();
  },
  { flush: 'sync' }
);

watch([fundingAsset, fundingPurpose, externalAccount, () => web3Store.isValidNetwork, subscriptionsDataLoading], () => {
  if (!fundingAsset.value) {
    fundingContext = '';
    funding.cancelPreparation();
  } else if (!subscriptionsDataLoading.value && api.connected) {
    void prepareFundingRequest();
  }
});

watch([soraAddress, externalAccount], () => {
  void Promise.allSettled([updateExternalBalance(), updateFeesAndLockedFunds()]);
});

watch(isSelectedSubNetworkReady, (ready, wasReady) => {
  if (ready && !wasReady) {
    void refreshSelectedSubNetwork();
  }
});

onBeforeUnmount(() => {
  funding.cancelPreparation();
  disconnectExternalNetwork();
});

const forwardedAttrs = computed(() => ({
  parentLoading: subscriptionsDataLoading.value,
  ...attrs,
  fundingPreparationBlocked: Boolean(fundingAsset.value && funding.status.value !== 'ready'),
}));
</script>
