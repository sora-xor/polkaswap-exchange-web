<template>
  <DialogBase
    v-model:visible="isVisible"
    :title="t('removeLiquidity.title')"
    :tooltip="t('removeLiquidity.description')"
  >
    <RemoveLiquidityForm @back="closeDialog"></RemoveLiquidityForm>
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
const RemoveLiquidityForm = poolLazyComponent(PoolComponents.RemoveLiquidityForm);
const poolStore = usePoolStore();

const isVisible = defineModel<boolean>('visible', { required: true });

const closeDialog = () => {
  emit('close');
  isVisible.value = false;
};

watch(isVisible, (value) => {
  if (!value) {
    void poolStore.resetRemoveLiquidityData();
  }
});
</script>
