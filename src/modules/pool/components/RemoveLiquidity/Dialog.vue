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
import { components } from '@wallet';
import { watch } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { PoolComponents } from '@/modules/pool/consts';
import { poolLazyComponent } from '@/modules/pool/router';
import store from '@/store';

const emit = defineEmits<{
  (event: 'close'): void;
}>();

const { t } = useTranslation();
const DialogBase = components.DialogBase;
const RemoveLiquidityForm = poolLazyComponent(PoolComponents.RemoveLiquidityForm);

const isVisible = defineModel<boolean>('visible', { required: true });

const closeDialog = () => {
  emit('close');
  isVisible.value = false;
};

watch(isVisible, (value) => {
  if (!value) {
    store.dispatch.removeLiquidity.resetData();
  }
});
</script>
