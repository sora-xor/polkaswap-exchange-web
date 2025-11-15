<template>
  <DialogBase v-model:visible="isVisible" :title="t('addLiquidity.title')" :tooltip="t('pool.description')">
    <AddLiquidityForm @back="closeDialog"></AddLiquidityForm>
  </DialogBase>
</template>

<script setup lang="ts">
import { components } from '@wallet';
import { computed, watch } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { PoolComponents } from '@/modules/pool/consts';
import { poolLazyComponent } from '@/modules/pool/router';
import store from '@/store';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
  (event: 'close'): void;
}>();

const { t } = useTranslation();
const DialogBase = components.DialogBase;
const AddLiquidityForm = poolLazyComponent(PoolComponents.AddLiquidityForm);

const isVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
});

const closeDialog = () => {
  emit('close');
  isVisible.value = false;
};

watch(isVisible, (value) => {
  if (!value) {
    store.dispatch.addLiquidity.resetData();
  }
});
</script>
