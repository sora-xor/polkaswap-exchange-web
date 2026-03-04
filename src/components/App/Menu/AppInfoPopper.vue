<template>
  <el-popover ref="popoverRef" placement="top" v-model:visible="visible" trigger="click" popper-class="app-info-popper">
    <template #reference>
      <div class="app-info-popper__reference">
        <slot></slot>
      </div>
    </template>
    <div class="app-info-popper__content">
      <p>{{ t('mobilePopup.info') }}</p>
      <s-button type="primary" size="small" @click="openProductDialog">
        {{ t('mobilePopup.sideMenu') }}
      </s-button>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import { useTranslation } from '@/composables/useTranslation';

const emit = defineEmits<{
  (e: 'open-product-dialog', product: string): void;
}>();

const { t } = useTranslation();
const visible = ref(false);
const popoverRef = ref<{ doClose?: () => void } | null>(null);

function openProductDialog(): void {
  emit('open-product-dialog', 'soraMobile');
  visible.value = false;
  popoverRef.value?.doClose?.();
}
</script>

<style lang="scss">
.app-info-popper.el-popover.el-popper {
  max-width: min(240px, calc(100vw - 16px));
  max-height: calc(100dvh - 16px);
  border: 1px solid var(--s-color-base-border-secondary, #d9dbe3);
  border-radius: var(--s-border-radius-medium);
  background: var(--s-color-utility-body, #ffffff);
  box-shadow: var(--s-shadow-tooltip, 0 8px 24px rgba(15, 25, 42, 0.18));
  padding: $inner-spacing-small;
  color: var(--s-color-base-content-primary, #1f2937);
  overflow: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.app-info-popper__content {
  display: flex;
  flex-direction: column;
  gap: $inner-spacing-small;

  p {
    margin: 0;
    font-size: var(--s-font-size-mini);
    line-height: 1.4;
    color: var(--s-color-base-content-secondary, #4b5563);
    overflow-wrap: anywhere;
  }

  .s-button {
    align-self: flex-start;
  }
}
</style>

<style lang="scss" scoped>
.app-info-popper__reference {
  display: block;
}
</style>
