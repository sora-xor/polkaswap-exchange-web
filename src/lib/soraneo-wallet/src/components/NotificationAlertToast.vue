<template>
  <div class="notification-alert">
    <p class="notification-alert__message">{{ message }}</p>
    <div class="notification-alert__actions">
      <s-button size="small" variant="secondary" @click="handleCancel">{{ cancelText }}</s-button>
      <s-button size="small" variant="primary" @click="handleConfirm">{{ confirmText }}</s-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { SButton } from '@soramitsu-ui/ui';

defineOptions({
  name: 'NotificationAlertToast',
});

const props = withDefaults(
  defineProps<{
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
  }>(),
  {
    confirmText: 'Reload',
    cancelText: 'Cancel',
  }
);

function handleConfirm(): void {
  props.onConfirm();
}

function handleCancel(): void {
  props.onCancel();
}
</script>

<style scoped>
.notification-alert {
  display: flex;
  flex-direction: column;
  gap: var(--s-basic-spacing);
}

.notification-alert__message {
  margin: 0;
  color: var(--sora_sys_color_content-primary, var(--s-color-utility-surface));
}

.notification-alert__actions {
  display: flex;
  gap: var(--s-basic-spacing);
  justify-content: flex-end;
}
</style>
