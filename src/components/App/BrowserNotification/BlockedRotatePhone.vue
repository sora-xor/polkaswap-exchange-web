<template>
  <dialog-base class="browser-notification" v-model:visible="isVisible">
    <div class="browser-notification-dialog">
      <img src="@/assets/img/mobile/rotate_phone.svg?inline" alt="mobile-rotate-phone" />
      <p class="notification-title">{{ t('browserNotificationDialog.rotatetitle') }}</p>
      <p class="notification-message">{{ t('browserNotificationDialog.rotateMessage') }}</p>
      <s-button
        type="primary"
        class="s-typography-button--large browser-notification-dialog__btn"
        :loading="loading"
        @click="agree"
      >
        {{ t('browserNotificationDialog.agree') }}
      </s-button>
    </div>
  </dialog-base>
</template>

<script lang="ts" setup>
import { components } from '@wallet';
import { ref } from 'vue';

import { useDialogModel } from '@/composables/useDialogModel';
import { useTranslation } from '@/composables/useTranslation';

defineOptions({
  components: {
    DialogBase: components.DialogBase,
  },
});

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'close'): void;
}>();

const { t } = useTranslation();
const { isVisible, closeDialog } = useDialogModel(props, emit);
const loading = ref(false);

function agree(): void {
  closeDialog();
}
</script>

<style lang="scss" scoped>
.browser-notification-dialog {
  @include browser-notification-dialog;
  justify-content: center;
  align-items: center;
  max-height: 230px;
}

img {
  height: 113px;
  width: 113px;
}

.notification-title {
  margin-top: 33px;
  margin-bottom: 14px;
  font-size: 24px;
  font-weight: 600;
  color: var(--s-color-base-content-primary);
}

.notification-message {
  font-size: 13px;
  font-weight: 500;
  color: var(--s-color-base-content-secondary);
  max-width: 200px;
  text-align: center;
  margin-bottom: 14px;
}
</style>
