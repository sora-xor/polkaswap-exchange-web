<template>
  <DialogBase v-model:visible="isVisible" :title="t('addLiquidity.title')" :tooltip="t('pool.description')">
    <AddLiquidityForm @back="closeDialog"></AddLiquidityForm>
  </DialogBase>
</template>

<script setup lang="ts">
import { components } from '@/shims/wallet-components';
import { watch } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { PoolComponents } from '@/modules/pool/consts';
import { poolLazyComponent } from '@/modules/pool/router';
import { usePoolStore } from '@/stores/pool';

const emit = defineEmits<{
  (event: 'close'): void;
}>();

const { t } = useTranslation();
const DialogBase = components.DialogBase;
const AddLiquidityForm = poolLazyComponent(PoolComponents.AddLiquidityForm);
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
