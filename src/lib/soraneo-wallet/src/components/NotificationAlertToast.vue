<template>
  <div class="notification-alert">
    <p class="notification-alert__message">{{ message }}</p>
    <div class="notification-alert__actions">
      <s-button size="small" variant="secondary" @click="handleCancel">{{ cancelText }}</s-button>
      <s-button size="small" variant="primary" @click="handleConfirm">{{ confirmText }}</s-button>
    </div>
  </div>
</template>

<script lang="ts">
import { SButton } from '@soramitsu-ui/ui';
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'NotificationAlertToast',
  components: { SButton },
  props: {
    message: {
      type: String,
      required: true,
    },
    confirmText: {
      type: String,
      default: 'Reload',
    },
    cancelText: {
      type: String,
      default: 'Cancel',
    },
    onConfirm: {
      type: Function,
      required: true,
    },
    onCancel: {
      type: Function,
      required: true,
    },
  },
  setup(props) {
    function handleConfirm(): void {
      (props.onConfirm as () => void)();
    }

    function handleCancel(): void {
      (props.onCancel as () => void)();
    }

    return {
      handleConfirm,
      handleCancel,
    };
  },
});
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
