<template>
  <DialogBase v-model:visible="isVisible" custom-class="validators-attention-dialog">
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
  gap: $basic-spacing-medium;
  padding-top: $basic-spacing-small;
}

.icon {
  display: flex;
  justify-content: center;
  flex: 0 0 auto;
  color: var(--s-color-status-error);
}

.title {
  font-weight: 300;
  font-size: var(--s-font-size-large);
  line-height: var(--s-line-height-small);
  text-align: center;
  margin: 0;
  letter-spacing: 0;
}

.description {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $basic-spacing;
  align-self: stretch;
  color: var(--s-color-base-content-primary);
  text-align: center;
  font-size: 14px;
  font-style: normal;
  font-weight: 300;
  line-height: 150%;
  letter-spacing: 0;

  p {
    max-width: 100%;
    margin: 0;
  }

  br {
    display: none;
  }
}

.action-button {
  width: 100%;
  min-height: var(--s-size-big);
  white-space: normal;
}

:global(.dialog-card.validators-attention-dialog) {
  position: relative;
}

:global(.dialog-card.validators-attention-dialog .dialog-card__header) {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  z-index: 1;
  justify-content: flex-end;
  padding: $basic-spacing-medium clamp(#{$basic-spacing}, 7vw, #{$inner-spacing-large}) 0;
  border-bottom: 0;
  pointer-events: none;
}

:global(.dialog-card.validators-attention-dialog .dialog-card__title) {
  display: none;
}

:global(.dialog-card.validators-attention-dialog .dialog-card__actions) {
  margin-left: auto;
  pointer-events: auto;
}

:global(.dialog-card.validators-attention-dialog .dialog-card__content) {
  padding: $basic-spacing-medium clamp(#{$basic-spacing}, 7vw, #{$inner-spacing-large}) $inner-spacing-large;
  max-height: min(84vh, calc(100vh - (#{$basic-spacing} * 2)));
}

.action-button :deep(span) {
  white-space: normal;
  overflow-wrap: anywhere;
}
</style>
