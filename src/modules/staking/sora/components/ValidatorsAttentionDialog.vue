<template>
  <DialogBase v-model:visible="isVisible">
    <div class="content">
      <s-icon class="icon" name="notifications-alert-triangle-24" size="64px"></s-icon>
      <h1 class="title">{{ t('soraStaking.validatorsAttentionDialog.title') }}</h1>
      <div class="description">
        <template v-for="item in description" :key="item">
          <p>{{ item }}</p>
          <br />
        </template>
      </div>
      <s-button type="primary" class="action-button" :loading="parentLoading" @click="handleConfirm">
        {{ t('soraStaking.validatorsAttentionDialog.confirm') }}
      </s-button>
    </div>
  </DialogBase>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTranslation } from '@/composables/useTranslation';

import i18n from '@/lang';
import router from '@/router';

import { SoraStakingPageNames } from '../consts';
import WalletComponentDialogBase from '@/lib/soraneo-wallet/src/components/DialogBase.vue';

const props = defineProps<{
  parentLoading?: boolean;
  isRecommended?: boolean;
}>();

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'proceed'): void;
}>();

const isVisible = defineModel<boolean>('visible', { default: false });
const { t } = useTranslation();

const DialogBase = WalletComponentDialogBase;

const closeDialog = (): void => {
  emit('close');
  isVisible.value = false;
};

const description = computed(() => {
  const locale = i18n.global.locale.value;
  const messages = i18n.global.getLocaleMessage(locale) as {
    soraStaking?: {
      validatorsAttentionDialog?: {
        description?: unknown;
      };
    };
  };
  const value = messages?.soraStaking?.validatorsAttentionDialog?.description;

  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => Number(left) - Number(right))
      .map(([, item]) => String(item));
  }

  return [];
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
}

.action-button {
  width: 100%;
}
</style>
