<template>
  <div :class="['settings-option', { disabled }]">
    <label :class="['settings-option-label', { disabled }]">
      <s-switch v-model="model" :disabled="disabled"></s-switch>
      <div :class="['settings-option-label-description', { hint: withHint }]">
        <span class="settings-option-label-title">{{ title }}</span>
        <span v-if="withHint" class="settings-option-label-hint">{{ hint }}</span>
      </div>
    </label>
    <slot></slot>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    hint?: string;
    title?: string;
    disabled?: boolean;
    withHint?: boolean;
    modelValue?: boolean;
  }>(),
  {
    hint: '',
    title: '',
    disabled: false,
    withHint: false,
    modelValue: false,
  }
);

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
}>();

const model = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});
</script>

<style lang="scss" scoped>
.settings-option {
  display: flex;
  flex-flow: column nowrap;
  gap: $basic-spacing-medium;
  width: 100%;

  &.disabled {
    opacity: 0.6;
  }
}

.settings-option-label {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: $basic-spacing-medium;

  &:not(.disabled) {
    cursor: pointer;
  }

  &-description {
    display: flex;
    flex-flow: column nowrap;
    align-items: flex-start;
    font-size: var(--s-font-size-medium);
    font-weight: 300;

    &.hint {
      font-size: var(--s-font-size-small);
    }
  }

  &-title {
    color: var(--s-color-base-content-primary);
  }

  &-hint {
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-extra-small);
  }
}
</style>
