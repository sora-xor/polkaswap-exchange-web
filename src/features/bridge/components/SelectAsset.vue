<template>
  <dialog-base v-model:visible="isVisible" :title="t('selectRegisteredAsset.title')" custom-class="asset-select">
    <search-input
      ref="search"
      v-model="query"
      :placeholder="t('selectRegisteredAsset.search.placeholder')"
      autofocus
      @clear="handleClearSearch"
      class="asset-search"
    ></search-input>

    <div class="asset-lists-container">
      <h3 v-if="hasFilteredAssets" class="network-label">
        {{ label }}
      </h3>

      <select-asset-list
        :assets="filteredAssets"
        :should-balance-be-hidden="shouldBalanceBeHidden"
        :is-sora-to-evm="isSoraToEvm"
        connected
        @click="selectAsset"
      ></select-asset-list>
    </div>
  </dialog-base>
</template>

<script lang="ts" setup>
import { computed, watch } from 'vue';

import SelectAssetList from '@/components/shared/SelectAsset/List.vue';
import { useSearchInput } from '@/composables/useSearchInput';
import { filterAssetsByQuery } from '@/composables/useAssetSearch';
import { useSelectAssetTools } from '@/composables/useSelectAssetTools';
import { useTranslation } from '@/composables/useTranslation';
import { ObjectInit } from '@/consts';
import { useAssetsStore } from '@/stores/assets';
import { useBridgeStore } from '@/stores/bridge';
import { useWalletStore } from '@/stores/wallet';
import { useWeb3Store } from '@/stores/web3';

import type { BridgeRegisteredAsset } from '@/stores/assets/types';
import type { NetworkData } from '@/types/bridge';
import type { Nullable } from '@/types/common';
import type { AccountAsset, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import DialogBase from '@/lib/soraneo-wallet/src/components/DialogBase.vue';
import SearchInput from '@/lib/soraneo-wallet/src/components/Input/SearchInput.vue';

defineOptions({
  name: 'BridgeSelectAsset',
});

const props = withDefaults(
  defineProps<{
    asset?: AccountAsset;
  }>(),
  {
    asset: ObjectInit as AccountAsset,
  }
);

const emit = defineEmits<{
  (e: 'select', asset?: RegisteredAccountAsset): void;
}>();

const { t } = useTranslation();
const { search, query, handleClearSearch, focusSearchInput } = useSearchInput();
const { sortByBalance, getAssetsWithBalances } = useSelectAssetTools();
const assetsStore = useAssetsStore();
const bridgeStore = useBridgeStore();
const walletStore = useWalletStore();
const web3Store = useWeb3Store();

const isVisible = defineModel<boolean>('visible', { default: false });

const selectedNetwork = computed(() => web3Store.selectedNetworkData as Nullable<NetworkData>);
const registeredAssets = computed(() => assetsStore.registeredAssets as Record<string, BridgeRegisteredAsset>);
const isSoraToEvm = computed(() => bridgeStore.isSoraToEvm);
const shouldBalanceBeHidden = computed(() => walletStore.shouldBalanceBeHidden);

const assetsList = computed<RegisteredAccountAsset[]>(() => {
  const assetsAddresses = Object.keys(registeredAssets.value ?? {});
  const excludeAddress = props.asset?.address;
  const list = getAssetsWithBalances(assetsAddresses, excludeAddress);
  return [...list].sort(sortByBalance);
});

const filteredAssets = computed<RegisteredAccountAsset[]>(() =>
  filterAssetsByQuery(assetsList.value, query.value, { useExternalAddress: !isSoraToEvm.value })
);

const hasFilteredAssets = computed(() => filteredAssets.value.length > 0);

const label = computed(() => {
  if (isSoraToEvm.value) {
    return t('selectRegisteredAsset.search.networkLabelSora');
  }
  const network = selectedNetwork.value?.shortName ?? '';
  return t('selectRegisteredAsset.search.networkLabelEthereum', { network });
});

function selectAsset(asset?: RegisteredAccountAsset): void {
  emit('select', asset);
  isVisible.value = false;
}

watch(
  isVisible,
  (visible) => {
    if (visible) {
      void focusSearchInput();
    } else {
      handleClearSearch();
    }
  },
  { immediate: false }
);
</script>

<style lang="scss">
.asset-select {
  .el-dialog {
    overflow: hidden;
    &__body {
      padding: $inner-spacing-mini 0 $inner-spacing-big !important;
    }
  }
}
</style>

<style lang="scss" scoped>
.asset-search,
.network-label {
  margin-left: $inner-spacing-big;
  margin-right: $inner-spacing-big;
  width: inherit;
}

.asset-search {
  margin-bottom: $inner-spacing-medium;
}

.network-label {
  color: var(--s-color-base-content-secondary);
  font-size: $s-heading3-caps-font-size;
  line-height: var(--s-line-height-base);
  letter-spacing: var(--s-letter-spacing-extra-large);
  font-weight: 700 !important;
  text-transform: uppercase;
}

.asset-lists-container {
  margin-top: $inner-spacing-mini;
}
</style>
