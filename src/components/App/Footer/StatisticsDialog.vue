<template>
  <dialog-base v-model:visible="visibility" :title="t('footer.statistics.dialog.title')" class="select-indexer-dialog">
    <select-indexer
      v-model:indexer="selectedIndexerType"
      :indexers="indexers"
      :environment="soraNetwork"
    ></select-indexer>
  </dialog-base>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { components } from '@/shims/wallet-components';

import { useTranslation } from '@/composables/useTranslation';
import { Components } from '@/consts';
import { ConnectionStatus, type IndexerState } from '@/shims/wallet-common-types';
import { IndexerType, type SoraNetwork } from '@/shims/wallet-consts';
import { lazyComponent } from '@/router';
import { useSettingsStore } from '@/stores/settings';
import type { Indexer } from '@/types/indexers';
import type { Nullable } from '@/types/common';
import { capitalize } from '@/utils';

defineOptions({ name: 'SelectIndexerDialog' });

const DialogBase = components.DialogBase;
const SelectIndexer = lazyComponent(Components.SelectIndexer);

const { t } = useTranslation();
const settingsStore = useSettingsStore();
const visibility = computed({
  get: () => Boolean(settingsStore.selectIndexerDialogVisibility),
  set: (flag: boolean) => {
    settingsStore.setSelectIndexerDialogVisibility(flag);
  },
});

const soraNetwork = computed<Nullable<SoraNetwork>>(() => settingsStore.soraNetwork);

const indexers = computed<Indexer[]>(() => {
  const indexersData = settingsStore.indexers as Record<IndexerType, IndexerState>;

  return Object.values(IndexerType).map((type) => {
    const data = indexersData?.[type] ?? {};
    return {
      name: capitalize(type),
      type,
      endpoint: data.endpoint ?? '',
      online: data.status === ConnectionStatus.Available,
    };
  });
});

const selectedIndexerType = computed<IndexerType>({
  get: () => settingsStore.indexerType ?? '',
  set: async (type: IndexerType) => {
    if (!type || type === settingsStore.indexerType) return;
    await settingsStore.selectIndexer(type);
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
