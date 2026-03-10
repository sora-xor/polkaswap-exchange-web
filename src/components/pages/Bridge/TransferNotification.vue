<template>
  <dialog-base v-model:visible="visible" class="bridge-transfer-notification">
    <simple-notification modal-content success @submit.prevent="close">
      <template #title>{{ t('bridgeTransferNotification.title') }}</template>

      <external-link v-if="txLink" v-bind="txLink"></external-link>
      <external-link v-if="txAccountLink" v-bind="txAccountLink"></external-link>

      <s-button v-if="addTokenBtnVisibility" @click="addToken" class="add-token-btn s-typography-button--big">
        <span>{{ t('bridgeTransferNotification.addToken', { symbol: assetSymbol }) }}</span>
        <div class="token-icons">
          <token-logo size="small" :token="asset"></token-logo>
        </div>
        <span>{{ t('operations.andText') }} {{ t('closeText') }}</span>
      </s-button>
    </simple-notification>
  </dialog-base>
</template>

<script setup lang="ts">
import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { components, WALLET_CONSTS } from '@wallet';
import { computed } from 'vue';

import { useBridgeTransaction } from '@/composables/useBridgeTransaction';
import { useTranslation } from '@/composables/useTranslation';
import { useAssetsStore } from '@/stores/assets';
import { useBridgeTransactionsStore } from '@/stores/bridge/transactions';
import store from '@/store';
import { subBridgeApi } from '@/utils/bridge/sub/api';
import type { SubNetworksConnector } from '@/utils/bridge/sub/classes/adapter';
import ethersUtil from '@/utils/ethers-util';
import { toSafeExternalLink } from '@/utils/externalLinks';

import type { IBridgeTransaction } from '@sora-substrate/sdk';
import type { RegisteredAccountAsset, Whitelist } from '@sora-substrate/sdk/build/assets/types';
import type { SubNetwork } from '@sora-substrate/sdk/build/bridgeProxy/sub/types';
import type { BridgeNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/types';

defineOptions({
  components: {
    SimpleNotification: components.SimpleNotification,
    DialogBase: components.DialogBase,
    TokenLogo: components.TokenLogo,
    ExternalLink: components.ExternalLink,
  },
});

const bridgeTransactionsStore = useBridgeTransactionsStore();

const visible = defineModel<boolean>('visible', {
  default: false,
  set(value) {
    if (!value) {
      bridgeTransactionsStore.setNotificationData();
    }
    return value;
  },
});

const { t, tc } = useTranslation();

const notificationData = computed(() => bridgeTransactionsStore.notificationData as Nullable<IBridgeTransaction>);
const subBridgeConnector = computed<SubNetworksConnector>(() => store.state.bridge.subBridgeConnector);
const whitelist = computed(() => store.getters.wallet.account.whitelist as Whitelist);

const assetsStore = useAssetsStore();

const asset = computed<Nullable<RegisteredAccountAsset>>(() => {
  const address = notificationData.value?.assetAddress;
  if (!address) return null;
  return assetsStore.assetDataByAddress(address) as Nullable<RegisteredAccountAsset>;
});

const assetSymbol = computed(() => asset.value?.symbol ?? '');

const bridgeTransaction = useBridgeTransaction(notificationData);

const isSubEvm = computed(() => subBridgeApi.isEvmAccount(notificationData.value?.externalNetwork as SubNetwork));

const isEvmNetwork = computed(() => {
  const type = notificationData.value?.externalNetworkType;
  if (!type) return false;
  if (type === BridgeNetworkType.Sub && !isSubEvm.value) return false;
  return true;
});

const addTokenBtnVisibility = computed(() => {
  if (!isEvmNetwork.value) return false;

  const address = asset.value?.externalAddress;
  return !!address && !ethersUtil.isNativeEvmTokenAddress(address) && bridgeTransaction.isOutgoing.value;
});

const selectPrimaryLink = <T,>(links: T[], fallback: T[]): T | undefined =>
  bridgeTransaction.isOutgoing.value ? links[0] : fallback[0];

const prepareLink = (
  link: WALLET_CONSTS.ExplorerLink | undefined,
  externalNetworkId?: Nullable<BridgeNetworkId>,
  isTxLink = true
): { href: string; title: string } | null => {
  if (!link) return null;

  const href = toSafeExternalLink(link.value);
  if (!href) return null;

  const linkText = isTxLink ? tc('transactionText', 1) : tc('accountText', 1);
  return {
    href,
    title: bridgeTransaction.getNetworkText(linkText, externalNetworkId),
  };
};

const txLink = computed(() =>
  prepareLink(
    selectPrimaryLink(bridgeTransaction.externalExplorerLinks.value, bridgeTransaction.internalExplorerLinks.value),
    bridgeTransaction.isOutgoing.value ? bridgeTransaction.externalNetworkId.value : undefined
  )
);

const txAccountLink = computed(() =>
  prepareLink(
    selectPrimaryLink(bridgeTransaction.externalAccountLinks.value, bridgeTransaction.internalAccountLinks.value),
    bridgeTransaction.isOutgoing.value ? bridgeTransaction.externalNetworkId.value : undefined,
    false
  )
);

function close(): void {
  visible.value = false;
  bridgeTransactionsStore.setNotificationData();
}

async function addToken(): Promise<void> {
  if (!asset.value) return;

  try {
    const { externalAddress, externalDecimals, symbol, address } = asset.value;
    const image = whitelist.value[address]?.icon;

    let tokenAddress = externalAddress;
    let tokenSymbol = symbol;
    let tokenDecimals = Number(externalDecimals);

    if (isSubEvm.value) {
      const adapter = subBridgeConnector.value.parachain;
      if (!adapter) throw new Error('Adapter not found');
      const assetMeta = adapter.getAssetMeta(asset.value);
      if (!assetMeta) throw new Error('Asset metadata not found');
      tokenAddress = adapter.assetIdToEvmContractAddress(externalAddress);
      tokenSymbol = assetMeta.symbol;
      tokenDecimals = assetMeta.decimals;
    }

    await ethersUtil.addToken(tokenAddress, tokenSymbol, tokenDecimals, image);
  } catch (error) {
    console.error(error);
  } finally {
    close();
  }
}
</script>

<style lang="scss">
.bridge-transfer-notification {
  .el-button + .el-button {
    margin-left: 0;
  }
}
</style>

<style lang="scss" scoped>
.add-token-btn {
  width: 100%;

  .token-icons {
    display: flex;
    margin: 0 $inner-spacing-tiny;
  }
}
</style>
