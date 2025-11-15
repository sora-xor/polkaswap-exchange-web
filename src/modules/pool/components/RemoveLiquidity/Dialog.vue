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
const RemoveLiquidityForm = poolLazyComponent(PoolComponents.RemoveLiquidityForm);

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
    store.dispatch.removeLiquidity.resetData();
  }
});
</script>
