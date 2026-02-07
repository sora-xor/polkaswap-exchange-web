<template>
  <account-settings-option
    v-model="model"
    :title="t('accountSettings.confirmation.title')"
    :hint="t('accountSettings.hint')"
    :with-hint="withHint"
  >
    <slot></slot>
  </account-settings-option>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { requireLegacyStore } from '@/utils/legacy-store';

import AccountSettingsOption from './Option.vue';

const props = withDefaults(
  defineProps<{
    withHint?: boolean;
  }>(),
  {
    withHint: false,
  }
);

const { t } = useTranslation();
const store = requireLegacyStore();

const model = computed({
  get: () => store.state.wallet.transactions.isConfirmTxDialogDisabled,
  set: (value: boolean) => {
    store.commit.wallet.transactions.setConfirmTxDialogDisabled(value);
  },
});

defineExpose({
  model,
});
</script>
