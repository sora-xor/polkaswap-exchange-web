<template>
  <s-form :class="['simple-notification', { 'modal-content': modalContent }]" @submit.prevent="handleSubmit">
    <s-icon :class="['simple-notification-icon', { success }]" :name="iconName" size="64"></s-icon>
    <div class="simple-notification__title">
      <slot name="title"></slot>
    </div>
    <div v-if="$slots.text" class="simple-notification__text">
      <slot name="text"></slot>
    </div>
    <slot></slot>
    <template v-if="optional">
      <s-divider class="simple-notification__divider"></s-divider>
      <div class="simple-notification__switch">
        <s-switch v-model="optionalModel"></s-switch>
        <span>{{ t('doNotShowText') }}</span>
      </div>
    </template>
    <s-button
      type="primary"
      native-type="submit"
      class="simple-notification__button s-typography-button--big"
      :loading="loading"
    >
      {{ btnText }}
    </s-button>
  </s-form>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';

const props = withDefaults(
  defineProps<{
    success?: boolean;
    loading?: boolean;
    optional?: boolean;
    modalContent?: boolean;
    buttonText?: string;
    modelValue?: boolean;
  }>(),
  {
    success: false,
    loading: false,
    optional: false,
    modalContent: false,
    buttonText: '',
    modelValue: false,
  }
);

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
  (event: 'submit'): void;
}>();

const { t } = useTranslation();

const optionalModel = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

const iconName = computed(() => (props.success ? 'basic-check-mark-24' : 'notifications-alert-triangle-24'));

const btnText = computed(() => props.buttonText || t('closeText'));

const handleSubmit = () => {
  emit('submit');
};
</script>

<style lang="scss" scoped>
.simple-notification {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  text-align: center;
  gap: $basic-spacing-medium;

  &.modal-content {
    margin-top: calc(var(--s-size-big) * -1);
  }

  &-icon {
    color: var(--s-color-status-error);
    margin-bottom: $basic-spacing;

    &.success {
      color: var(--s-color-theme-secondary);
    }
  }

  &__title {
    font-size: var(--s-font-size-large);
    font-weight: 300;
    letter-spacing: var(--s-letter-spacing-mini);
    line-height: var(--s-line-height-small);
  }

  &__text {
    display: flex;
    flex-flow: column nowrap;
    gap: $basic-spacing;

    font-size: var(--s-font-size-small);
    font-weight: 300;
    line-height: var(--s-line-height-medium);
  }

  &__divider {
    margin: 0;
  }

  &__switch {
    @include switch-block;

    & {
      padding: 0;
    }
  }

  &__button {
    width: 100%;

    & + & {
      margin-left: 0px;
    }
  }
}
</style>
