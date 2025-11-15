<template>
  <dialog-base v-model:visible="visibility" :title="t('footer.statistics.dialog.title')" class="select-indexer-dialog">
    <select-indexer
      v-model:indexer="selectedIndexerType"
      v-model:ceres="useCeresApi"
      :indexers="indexers"
      :environment="soraNetwork"
    ></select-indexer>
  </dialog-base>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { components, WALLET_CONSTS, WALLET_TYPES } from '@wallet';

import { useTranslation } from '@/composables/useTranslation';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import store from '@/store';
import { useSettingsStore } from '@/stores/settings';
import type { Indexer } from '@/types/indexers';
import type { Nullable } from '@/types/common';
import { capitalize } from '@/utils';

defineOptions({ name: 'SelectIndexerDialog' });

const DialogBase = components.DialogBase;
const SelectIndexer = lazyComponent(Components.SelectIndexer);

const { t } = useTranslation();
const settingsStore = useSettingsStore();

const walletSettingsState = computed(() => (store.state.wallet?.settings ?? {}) as Record<string, unknown>);
const walletAccountState = computed(() => (store.state.wallet?.account ?? {}) as Record<string, unknown>);

const visibility = computed({
  get: () => Boolean(settingsStore.selectIndexerDialogVisibility),
  set: (flag: boolean) => {
    settingsStore.setSelectIndexerDialogVisibility(flag);
  },
});

const soraNetwork = computed<Nullable<WALLET_CONSTS.SoraNetwork>>(
  () => walletSettingsState.value.soraNetwork as Nullable<WALLET_CONSTS.SoraNetwork>
);

const indexers = computed<Indexer[]>(() => {
  const indexersData = walletSettingsState.value.indexers as
    | Record<WALLET_CONSTS.IndexerType, WALLET_TYPES.IndexerState>
    | undefined;

  return Object.values(WALLET_CONSTS.IndexerType).map((type) => {
    const data = indexersData?.[type] ?? {};
    return {
      name: capitalize(type),
      type,
      endpoint: data.endpoint ?? '',
      online: data.status === WALLET_TYPES.ConnectionStatus.Available,
    };
  });
});

const selectedIndexerType = computed<WALLET_CONSTS.IndexerType>({
  get: () => (walletSettingsState.value.indexerType as WALLET_CONSTS.IndexerType) ?? '',
  set: async (type: WALLET_CONSTS.IndexerType) => {
    if (!type || type === walletSettingsState.value.indexerType) return;

    const selectIndexer = store.dispatch?.wallet?.settings?.selectIndexer;
    if (typeof selectIndexer === 'function') {
      await selectIndexer(type);
    }
  },
});

const useCeresApi = computed<boolean>({
  get: () => Boolean(walletAccountState.value.ceresFiatValuesUsage),
  set: async (flag: boolean) => {
    const toggleCeres = store.dispatch?.wallet?.account?.useCeresApiForFiatValues;
    if (typeof toggleCeres === 'function') {
      await toggleCeres(flag);
    }
  },
});
</script>

<style lang="scss">
.dialog-wrapper.select-indexer-dialog {
  &--add-indexer {
    .el-dialog {
      .el-dialog__header {
        padding: 0;
        display: none;
      }
    }
  }
}
</style>
