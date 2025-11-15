<template>
  <DialogBase v-model:visible="isVisible">
    <div class="content">
      <s-icon class="icon" name="notifications-alert-triangle-24" size="64px"></s-icon>
      <h1 class="title">{{ t('soraStaking.validatorsAttentionDialog.title') }}</h1>
      <div class="description">
        <p v-for="item in description" :key="item">{{ item }}</p>
      </div>
      <s-button type="primary" class="action-button" :loading="parentLoading" @click="handleConfirm">
        {{ t('soraStaking.validatorsAttentionDialog.confirm') }}
      </s-button>
    </div>
  </DialogBase>
</template>

<script setup lang="ts">
import { components } from '@wallet';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useDialogModel } from '@/composables/useDialogModel';
import router from '@/router';

import { SoraStakingPageNames } from '../consts';

const props = defineProps<{
  visible: boolean;
  parentLoading?: boolean;
  isRecommended?: boolean;
}>();

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
  (event: 'close'): void;
  (event: 'proceed'): void;
}>();

const { t } = useI18n();
const { isVisible, closeDialog } = useDialogModel(props, emit);

const DialogBase = components.DialogBase;

const description = computed(() => {
  const value = t('soraStaking.validatorsAttentionDialog.description');
  return Array.isArray(value) ? value : [];
});

const handleConfirm = (): void => {
  emit('proceed');

  if (props.isRecommended !== false) {
    router.push({ name: SoraStakingPageNames.SelectValidators });
  }

  closeDialog();
};

defineExpose({
  handleConfirm,
});
</script>

<style scoped lang="scss">
.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $basic-spacing;
  margin-top: -50px;
}

.icon {
  display: flex;
  justify-content: center;
  color: var(--s-color-status-error);
}

.title {
  font-weight: 300;
  font-size: 28px;
  text-align: center;
  margin: 0;
}

.description {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  align-self: stretch;
  color: var(--s-color-base-content-primary);
  text-align: center;

  font-size: 14px;
  font-style: normal;
  font-weight: 300;
  line-height: 150%;
  letter-spacing: -0.28px;

  p {
    width: 100%;
    margin: 0 0 $inner-spacing-mini;
  }

  p:last-child {
    margin-bottom: 0;
  }
}

.action-button {
  width: 100%;
}
</style>
