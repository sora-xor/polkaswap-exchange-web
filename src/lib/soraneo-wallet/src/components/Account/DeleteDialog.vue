<template>
  <dialog-base v-model:visible="isVisible" append-to-body>
    <simple-notification
      v-model="hideDeleteDialog"
      optional
      modal-content
      :button-text="t('logoutText')"
      :loading="loading"
      @submit.prevent="handleConfirm"
    >
      <template #title>{{ t('desktop.assetsAtRiskText') }}</template>
      <template #text>{{ t('desktop.deleteAccountText') }}</template>
    </simple-notification>
  </dialog-base>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';

import { useDialogVisibility } from '@/composables/useDialog';
import { useTranslation } from '@/composables/useTranslation';

import DialogBase from '../DialogBase.vue';
import SimpleNotification from '../SimpleNotification.vue';

const props = withDefaults(
  defineProps<{
    loading?: boolean;
  }>(),
  {
    loading: false,
  }
);

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'confirm', hideOnConfirm: boolean): void;
}>();

const { t } = useTranslation();

const visibleModel = defineModel<boolean>('visible', { default: false });
const { isVisible } = useDialogVisibility(visibleModel, {
  onClose: () => emit('close'),
});

const loading = toRef(props, 'loading');
const hideDeleteDialog = ref(false);

watch(isVisible, (visible) => {
  if (!visible) {
    hideDeleteDialog.value = false;
  }
});

const handleConfirm = () => {
  emit('confirm', !hideDeleteDialog.value);
};
</script>
