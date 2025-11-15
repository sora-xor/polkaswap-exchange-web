<template>
  <dialog-base v-model:visible="dialogVisible">
    <div class="error-info-banner">
      <s-icon class="error-info-banner__icon" name="basic-clear-X-24" size="64px"></s-icon>
      <h4 class="error-info-banner__header">The payment widget is currently unavailable</h4>
      <p class="error-info-banner__text">
        {{ t('fiatPayment.errorMessage') }}
      </p>
      <s-button
        class="error-info-banner__btn s-typography-button--large"
        type="primary"
        :disabled="loading"
        @click="closeDialog"
      >
        {{ t('browserNotificationDialog.agree') }}
      </s-button>
    </div>
  </dialog-base>
</template>

<script setup lang="ts">
import { components } from '@wallet';
import { ref, watch } from 'vue';

import { useTranslation } from '@/composables/useTranslation';

defineOptions({
  components: {
    DialogBase: components.DialogBase,
  },
});

const visible = defineModel<boolean>('visible', { default: false });

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { t } = useTranslation();
const loading = ref(false);
const dialogVisible = ref(visible.value);

watch(
  () => visible.value,
  (value) => {
    dialogVisible.value = value;
  }
);

watch(dialogVisible, (value) => {
  visible.value = value;
});

function closeDialog(): void {
  emit('close');
  dialogVisible.value = false;
}
</script>

<style lang="scss">
.error-info-banner {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;

  &__header {
    font-size: var(--s-heading3-font-size);
    font-weight: 500;
  }

  &__text {
    margin-top: var(--s-size-mini);
    line-height: var(--s-font-size-large);
    font-size: var(--s-font-size-medium);
    font-weight: 300;
    width: 67%;
  }

  &__icon {
    display: block;
    color: var(--s-color-status-error);
    width: var(--s-size-mini);
    margin: -20px 20px $basic-spacing 0;
  }

  &__btn {
    margin-top: var(--s-size-mini);
    width: 100%;
  }
}
</style>
