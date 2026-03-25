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
import { useWalletStore } from '@/stores/wallet';

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
const walletStore = useWalletStore();

const model = computed({
  get: () => walletStore.isConfirmTxDialogDisabled,
  set: (value: boolean) => {
    walletStore.setConfirmTxDialogDisabled(value);
  },
});

defineExpose({
  model,
});
</script>
