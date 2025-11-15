<template>
  <s-popover ref="popover" placement="bottom" v-model:visible="visible" trigger="click" class="app-info-popper">
    <template #reference>
      <slot></slot>
    </template>
    <div class="app-info-popper__content">
      <p>{{ t('footer.info.description') }}</p>
      <s-button type="primary" size="small" @click="openProductDialog">
        {{ t('footer.info.button') }}
      </s-button>
    </div>
  </s-popover>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import { useTranslation } from '@/composables/useTranslation';

const emit = defineEmits<{
  (e: 'open-product-dialog'): void;
}>();

const { t } = useTranslation();
const visible = ref(false);

function openProductDialog(): void {
  emit('open-product-dialog');
  visible.value = false;
}
</script>
