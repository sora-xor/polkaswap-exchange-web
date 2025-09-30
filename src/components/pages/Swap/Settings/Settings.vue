<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="t('dexSettings.title')"
    :append-to-body="appendToBody"
    :modal-append-to-body="appendToBody"
    custom-class="settings"
  >
    <swap-market-algorithm />
  </dialog-base>
</template>

<script setup lang="ts">
import { components } from '@soramitsu/soraneo-wallet-web';
import { computed, ref, watch } from 'vue';

import { useTranslation } from '@/composables/useTranslation';

import SwapMarketAlgorithm from './MarketAlgorithm/MarketAlgorithm.vue';

const DialogBase = components.DialogBase;

defineOptions({ name: 'SwapSettingsDialog' });

const props = withDefaults(
  defineProps<{
    visible: boolean;
    appendToBody?: boolean;
  }>(),
  {
    appendToBody: false,
  }
);

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
  (event: 'close'): void;
}>();

const { t } = useTranslation();

const isVisible = ref(props.visible);

watch(
  () => props.visible,
  (value) => {
    isVisible.value = value;
  },
  { immediate: true }
);

watch(isVisible, (value) => {
  emit('update:visible', value);
});

const appendToBody = computed(() => props.appendToBody);
</script>

<style lang="scss">
.settings {
  &.el-dialog__wrapper .el-dialog .el-dialog__body {
    padding-bottom: $inner-spacing-big;
  }
  .el-divider {
    margin: $inner-spacing-mini $inner-spacing-small $inner-spacing-medium;
    width: calc(100% - #{$inner-spacing-small} * 2);
  }
}
</style>
