<template>
  <dialog-base v-model:visible="visibility" :title="t('footer.statistics.label')" class="select-indexer-dialog">
    <select-indexer :indexers="indexers"></select-indexer>
  </dialog-base>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { SelectIndexer } from '@/app/shell/components';
import { useTranslation } from '@/composables/useTranslation';
import { ConnectionStatus, type IndexerState } from '@/lib/soraneo-wallet/src/types/common';
import { IndexerType } from '@/lib/soraneo-wallet/src/consts';
import { useSettingsStore } from '@/stores/settings';
import type { Indexer } from '@/types/indexers';
import WalletComponentDialogBase from '@/lib/soraneo-wallet/src/components/DialogBase.vue';

defineOptions({ name: 'SelectIndexerDialog' });

const DialogBase = WalletComponentDialogBase;

const { t } = useTranslation();
const settingsStore = useSettingsStore();
const visibility = computed({
  get: () => Boolean(settingsStore.selectIndexerDialogVisibility),
  set: (flag: boolean) => {
    settingsStore.setSelectIndexerDialogVisibility(flag);
  },
});

const indexers = computed<Indexer[]>(() => {
  const indexersData = settingsStore.indexers as Record<IndexerType, IndexerState>;

  return [IndexerType.SUBQUERY].map((type) => {
    const data = indexersData?.[type] ?? {};
    return {
      name: 'Polkaswap Indexer',
      type,
      endpoint: data.endpoint ?? '',
      online: data.status === ConnectionStatus.Available,
    };
  });
});
</script>
