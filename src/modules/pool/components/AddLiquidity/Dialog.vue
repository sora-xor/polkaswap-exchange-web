<template>
  <DialogBase v-model:visible="isVisible" :title="t('addLiquidity.title')" :tooltip="t('pool.description')">
    <AddLiquidityForm @back="closeDialog"></AddLiquidityForm>
  </DialogBase>
</template>

<script setup lang="ts">
import AddLiquidityForm from '@/modules/pool/components/AddLiquidity/Form.vue';
import { watch } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { usePoolStore } from '@/stores/pool';
import WalletComponentDialogBase from '@/lib/soraneo-wallet/src/components/DialogBase.vue';

const emit = defineEmits<{
  (event: 'close'): void;
}>();

const { t } = useTranslation();
const DialogBase = WalletComponentDialogBase;
const poolStore = usePoolStore();

const isVisible = defineModel<boolean>('visible', { required: true });

const closeDialog = () => {
  emit('close');
  isVisible.value = false;
};

watch(isVisible, (value) => {
  if (!value) {
    void poolStore.resetAddLiquidityData();
  }
});
</script>
